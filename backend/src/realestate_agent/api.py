from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from realestate_agent.main import agent, Runner, is_location_query, location_agent, get_session, is_email_query, email_agent
from pydantic import BaseModel
from typing import List, Optional
import re
import uuid
import os
from pathlib import Path
from dotenv import load_dotenv
import random

# Load environment variables
BASE_DIR = Path(__file__).resolve().parents[3]
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------- Models ---------
class UserQuery(BaseModel):
    prompt: str
    session_id: str

class PropertyData(BaseModel):
    id: str
    title: str
    location: str
    price: float
    priceType: str = "month"
    propertyType: str
    bedrooms: Optional[int] = 2
    bathrooms: Optional[int] = 1
    image: str = "https://www.livehome3d.com/assets/img/articles/design-house/how-to-design-a-house.jpg"
    latitude: float
    longitude: float
    available: bool = True
    link: Optional[str] = None
    postcode: Optional[str] = None

# --------- Enhanced Property Parser ---------
def parse_agent_response(response_text: str) -> List[PropertyData]:
    """Enhanced property parser with better card information"""
    print(f"=== PARSING RESPONSE ===")
    print(response_text[:200] + "...")
    
    properties = []
    
    # Extract price
    price_match = re.search(r'£?(\d+(?:,\d+)?)', response_text)
    price = float(price_match.group(1).replace(',', '')) if price_match else random.randint(800, 2500)
    
    # Extract location with better pattern matching
    location_patterns = [
        r'(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'Location[:\s-]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:flat|apartment|house|studio|room)'
    ]
    
    location = "London"
    for pattern in location_patterns:
        match = re.search(pattern, response_text, re.IGNORECASE)
        if match:
            location = match.group(1).strip()
            break
    
    # Property type detection
    property_type = "flat"
    property_type_keywords = {
        "room": r'\broom\b',
        "studio": r'\bstudio\b', 
        "house": r'\bhouse\b|detached|semi-detached',
        "apartment": r'\bapartment\b|flat'
    }
    
    for prop_type, pattern in property_type_keywords.items():
        if re.search(pattern, response_text, re.IGNORECASE):
            property_type = prop_type
            break
    
    # Bedrooms and bathrooms
    bedrooms_match = re.search(r'(\d+)\s*(?:bed|bedroom)', response_text, re.IGNORECASE)
    bedrooms = int(bedrooms_match.group(1)) if bedrooms_match else random.randint(1, 3)
    
    bathrooms_match = re.search(r'(\d+)\s*(?:bath|bathroom)', response_text, re.IGNORECASE)
    bathrooms = int(bathrooms_match.group(1)) if bathrooms_match else (1 if bedrooms <= 2 else 2)
    
    # Postcode extraction
    postcode_match = re.search(r'([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})', response_text)
    postcode = postcode_match.group(1) if postcode_match else None
    
    # Link extraction
    link_match = re.search(r'https?://[^\s]+', response_text)
    link = link_match.group(0) if link_match else None
    
    # Create better title and description
    title = generate_property_title(property_type, location, bedrooms, price)
    
    # Get coordinates
    lat, lng = get_coordinates(location)
    
    # Create property object with enhanced info
    property_obj = PropertyData(
        id=str(uuid.uuid4()),
        title=title,
        location=location,
        price=price,
        propertyType=property_type,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        latitude=lat,
        longitude=lng,
        postcode=postcode,
        link=link
    )
    
    properties.append(property_obj)
    print(f"✅ Created property: {property_obj.title}")
    return properties

def generate_property_title(property_type: str, location: str, bedrooms: int, price: float) -> str:
    """Generate a professional property title"""
    property_types = {
        "room": "Room",
        "studio": "Studio Apartment", 
        "house": "House",
        "flat": "Apartment",
        "apartment": "Apartment"
    }
    
    type_display = property_types.get(property_type, "Property")
    
    # Add bedroom info if available
    if bedrooms > 0 and property_type != "room":
        bedroom_text = f"{bedrooms}-Bedroom "
    else:
        bedroom_text = ""
    
    # Add location area if it's specific
    location_parts = location.split()
    if len(location_parts) > 1:
        area = location_parts[-1]  # Get last part (e.g., "Camden" from "London Camden")
    else:
        area = location
    
    # Create professional title
    titles = [
        f"{bedroom_text}{type_display} in {area}",
        f"Modern {bedroom_text}{type_display} in {location}",
        f"Luxury {bedroom_text}{type_display} - {area}",
        f"Spacious {bedroom_text}{type_display} in {location}"
    ]
    
    return random.choice(titles)

def get_coordinates(location: str) -> tuple[float, float]:
    """Enhanced coordinate lookup with more UK locations"""
    uk_locations = {
        # London areas
        'london': (51.5074, -0.1278),
        'camden': (51.5392, -0.1426),
        'islington': (51.5416, -0.1022),
        'hackney': (51.5450, -0.0553),
        'shoreditch': (51.5255, -0.0754),
        'clapham': (51.4618, -0.1700),
        'wimbledon': (51.4214, -0.2064),
        'richmond': (51.4613, -0.3037),
        'greenwich': (51.4934, 0.0098),
        'kensington': (51.4988, -0.1749),
        'chelsea': (51.4875, -0.1687),
        
        # Major UK cities
        'manchester': (53.4808, -2.2426),
        'birmingham': (52.4862, -1.8904),
        'liverpool': (53.4084, -2.9916),
        'leeds': (53.8008, -1.5491),
        'glasgow': (55.8642, -4.2518),
        'edinburgh': (55.9533, -3.1883),
        'bristol': (51.4545, -2.5879),
        'cardiff': (51.4816, -3.1791),
        'belfast': (54.5973, -5.9301),
        'newcastle': (54.9783, -1.6178),
        'sheffield': (53.3811, -1.4701),
        'nottingham': (52.9548, -1.1581),
        
        # Other popular areas
        'brighton': (50.8225, -0.1372),
        'cambridge': (52.2053, 0.1218),
        'oxford': (51.7520, -1.2577),
        'bath': (51.3758, -2.3599),
        'york': (53.9600, -1.0873)
    }
    
    clean_location = location.lower().strip()
    
    # Direct match
    if clean_location in uk_locations:
        return uk_locations[clean_location]
    
    # Partial match (check if any location keyword is in the query)
    for city, coords in uk_locations.items():
        if city in clean_location:
            return coords
    
    # Default to central London
    return (51.5074, -0.1278)

def is_travel_query(query: str) -> bool:
    """Check if it's a travel query"""
    keywords = ["travel time", "duration", "how long", "distance", "commute", "minutes away", "travel from"]
    return any(keyword in query.lower() for keyword in keywords)

# --------- API Routes ---------
@app.get("/")
async def root():
    return {"message": "RealEstate API", "status": "running"}

@app.post("/realestate-agent")
async def realestate_agent(query: UserQuery):
    try:
        session_id = query.session_id
        prompt = query.prompt
        
        if not session_id.strip():
            raise HTTPException(status_code=400, detail="Session ID required")
        
        print(f"🔍 Query: {prompt}")
        
        # Get session and run agent
        session = get_session(session_id)
        
        if is_email_query(prompt):
            result = await Runner.run(email_agent, input=prompt, session=session)
            print("📧 Email Agent called")
            
            return {
                "result": result.final_output,
                "properties": [],
                "query_type": "email_draft",
                "session_id": session_id
            }
        
        elif is_travel_query(prompt):
            result = await Runner.run(location_agent, input=prompt, session=session)
            print("🚗 Travel query")
            
            return {
                "result": result.final_output,
                "properties": [],
                "query_type": "travel",
                "session_id": session_id
            }
        
        elif is_location_query(prompt):
            result = await Runner.run(location_agent, input=prompt, session=session)
            print("📍 Location query")
            
            return {
                "result": result.final_output,
                "properties": [],
                "query_type": "location",
                "session_id": session_id
            }
        
        else:
            # Property search
            result = await Runner.run(agent, input=prompt, session=session)
            print("🏠 Property search")
            properties = parse_agent_response(result.final_output)
            
            return {
                "result": result.final_output,
                "properties": [prop.dict() for prop in properties],
                "query_type": "property_search",
                "total_properties": len(properties),
                "session_id": session_id
            }
            
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)