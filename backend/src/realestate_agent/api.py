from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from realestate_agent.main import agent, Runner, is_location_query, location_agent, get_session
from pydantic import BaseModel
from supabase import create_client, Client
from typing import List, Optional, Dict
import re
import json
import uuid
import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

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

# --------- Supabase Setup ---------
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("Warning: Supabase not configured")

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

# --------- Simple Property Parser ---------
def parse_agent_response(response_text: str) -> List[PropertyData]:
    """Simple property parser - one method does it all"""
    print(f"=== PARSING RESPONSE ===")
    print(response_text[:200] + "...")
    
    properties = []
    
    # Try to find structured JSON first
    json_match = re.search(r'\{.*?"price".*?\}', response_text, re.DOTALL | re.IGNORECASE)
    if json_match:
        try:
            prop_data = json.loads(json_match.group())
            properties.append(create_property_from_data(prop_data, response_text))
            print(f"✅ Found JSON property")
            return properties
        except:
            pass
    
    # Fallback: Extract using simple patterns
    price_match = re.search(r'£?(\d+(?:,\d+)?)', response_text)
    location_match = re.search(r'(?:in|at)\s+([A-Za-z\s]+)', response_text, re.IGNORECASE)
    
    price = float(price_match.group(1).replace(',', '')) if price_match else 1200
    location = location_match.group(1).strip() if location_match else "London"
    
    # Property type
    property_type = "flat"
    if re.search(r'room', response_text, re.IGNORECASE):
        property_type = "room"
    elif re.search(r'studio', response_text, re.IGNORECASE):
        property_type = "studio"
    elif re.search(r'house', response_text, re.IGNORECASE):
        property_type = "house"
    
    # Create property
    lat, lng = get_coordinates(location)
    property_obj = PropertyData(
        id=str(uuid.uuid4()),
        title=f"{property_type.capitalize()} in {location}",
        location=location,
        price=price,
        propertyType=property_type,
        latitude=lat,
        longitude=lng
    )
    
    properties.append(property_obj)
    print(f"✅ Created property: {property_obj.title}")
    return properties

def create_property_from_data(data: Dict, response_text: str) -> PropertyData:
    """Create property from extracted data"""
    price = float(str(data.get('price', '1200')).replace('£', '').replace(',', ''))
    location = data.get('location', 'London').strip()
    property_type = data.get('property_type', 'flat').lower()
    
    lat, lng = get_coordinates(location)
    
    return PropertyData(
        id=str(uuid.uuid4()),
        title=f"{property_type.capitalize()} in {location}",
        location=location,
        price=price,
        propertyType=property_type,
        bedrooms=data.get('bedrooms', 2),
        bathrooms=data.get('bathrooms', 1),
        latitude=lat,
        longitude=lng,
        link=data.get('link'),
        postcode=data.get('postcode')
    )

def get_coordinates(location: str) -> tuple[float, float]:
    """Simple coordinate lookup"""
    locations = {
        'london': (51.5074, -0.1278),
        'camden': (51.5392, -0.1426),
        'manchester': (53.4808, -2.2426),
        'birmingham': (52.4862, -1.8904),
        'bristol': (51.4545, -2.5879),
        'edinburgh': (55.9533, -3.1883),
        'glasgow': (55.8642, -4.2518),
    }
    
    clean_location = location.lower().strip()
    
    # Direct match
    if clean_location in locations:
        return locations[clean_location]
    
    # Partial match
    for city, coords in locations.items():
        if city in clean_location:
            return coords
    
    # Default to London
    return (51.5074, -0.1278)

def is_travel_query(query: str) -> bool:
    """Check if it's a travel query"""
    keywords = ["travel time", "duration", "how long", "distance", "commute"]
    return any(keyword in query.lower() for keyword in keywords)

# --------- Simple Session Storage ---------
_SESSIONS: Dict[str, List[Dict]] = {}

async def save_conversation(session_id: str, query: str, response: str, query_type: str):
    """Save conversation (Supabase or memory)"""
    data = {
        "session_id": session_id,
        "user_query": query,
        "agent_response": response,
        "query_type": query_type,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if supabase:
        try:
            supabase.table("conversations").insert(data).execute()
            return
        except Exception as e:
            print(f"Supabase error: {e}")
    
    # Fallback to memory
    if session_id not in _SESSIONS:
        _SESSIONS[session_id] = []
    _SESSIONS[session_id].append(data)

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
        
        if is_travel_query(prompt):
            result = await Runner.run(location_agent, input=prompt, session=session)
            await save_conversation(session_id, prompt, result.final_output, "travel")
            
            return {
                "result": result.final_output,
                "properties": [],
                "query_type": "travel",
                "session_id": session_id
            }
        
        elif is_location_query(prompt):
            result = await Runner.run(location_agent, input=prompt, session=session)
            await save_conversation(session_id, prompt, result.final_output, "location")
            
            return {
                "result": result.final_output,
                "properties": [],
                "query_type": "location",
                "session_id": session_id
            }
        
        else:
            # Property search
            result = await Runner.run(agent, input=prompt, session=session)
            properties = parse_agent_response(result.final_output)
            await save_conversation(session_id, prompt, result.final_output, "property_search")
            
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

@app.get("/api/sessions/{session_id}/history")
async def get_history(session_id: str):
    """Get conversation history"""
    if supabase:
        try:
            result = supabase.table("conversations").select("*").eq("session_id", session_id).execute()
            return {"history": result.data, "total": len(result.data)}
        except:
            pass
    
    # Fallback to memory
    history = _SESSIONS.get(session_id, [])
    return {"history": history, "total": len(history)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)