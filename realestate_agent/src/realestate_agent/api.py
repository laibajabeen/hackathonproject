from fastapi import FastAPI
from realestate_agent.main import agent, Runner, session
from pydantic import BaseModel

app = FastAPI()

from realestate_agent.main import is_location_query,location_agent

class UserQuery(BaseModel):
    prompt: str
    
@app.post("/realestate-agent")
async def realestate_agent(query: UserQuery):
    if is_location_query(query.prompt):
        
        result = await Runner.run(location_agent, input=query.prompt, session=session)
        print("Location Aggent called")
        return {"result": result.final_output}
        
    else:
        result = await Runner.run(agent, input=query.prompt, session=session)
        print("Realestate Agent called")
        return {"result": result.final_output}
