from fastapi import FastAPI
from realestate_agent.main import agent, Runner, session
from pydantic import BaseModel

app = FastAPI()

class UserQuery(BaseModel):
    prompt: str

@app.post("/realestate-agent")
async def realestate_agent(query: UserQuery):
    result = await Runner.run(agent, input=query.prompt, session=session)
    return {"result": result.final_output}