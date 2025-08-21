from agents import Agent,Runner,function_tool,handoff,SQLiteSession,OpenAIChatCompletionsModel,set_tracing_disabled,set_default_openai_api,set_default_openai_client
from agents.tool import WebSearchTool
from pydantic import BaseModel
# from mem0 import MemoryClient
from openai import AsyncOpenAI
from dotenv import load_dotenv
load_dotenv()
import asyncio
import os

set_tracing_disabled(disabled=True)  # Open AI Tracing == Disable
set_default_openai_api("responses")

BASE_URL = "https://api.aimlapi.com/v1"
MODEL =  'openai/gpt-4.1-2025-04-14'
api_key = os.getenv("OPENAI_API_KEY")
mem_api_key = os.getenv("MEM0_API_KEY")

client = AsyncOpenAI(
    api_key=api_key,
    base_url=BASE_URL
)
set_default_openai_client(client)
session = SQLiteSession("123", "realestate_agent.db")

class Query_Output(BaseModel):
    price: str
    location: str
    postcode: str
    link: str



room_agent = Agent(
    name="Room Assistant",
    instructions="""You are a room agent assistant. You help users find information about rooms in the UK from websites like Rightmove, Zoopla, and SpareRoom. You answer questions related to price, location, postcode, link, and property type, using the web search tool to get live data every time.
    You also have memory capabilities!""",
    tools=[WebSearchTool()],
    model=MODEL
)

flat_agent = Agent(
    name="Flat Assistant",
    instructions="""You are a flat agent assistant. You help users find information about flats in the UK from websites like Rightmove, Zoopla, and SpareRoom. You answer questions related to price, location, postcode, link, and property type, using the web search tool to get live data every time.   
    You also have memory capabilities!""",
    tools=[WebSearchTool()],
    model=MODEL
)

studio_agent = Agent(
    name="Studio Assistant",
    instructions="""You are a real estate agent assistant. You help users find information about properties in the UK from websites like Rightmove, Zoopla, and SpareRoom. You answer questions related to price, location, postcode, link, and property type, using the web search tool to get live data every time.
    Use the room_agent, flat_agent, studio_agent, and house_agent to handle specific queries about rooms, flats, studios, and houses respectively.
    You can also handle general queries about real estate in the UK, such as market trends, property types, and investment advice.
    You also have memory capabilities!""",
    tools=[WebSearchTool()],
    model=MODEL
)

agent = Agent(
    name="Realestate Assistant",
    instructions="You are a helpful assistant for real estate inquiries. You will assist users with searching rooms according to postcode, price, distance from specific location, search website like Rightmove,Zoopla and Spareroom, use thw websearch tool to find relevant listings, and provide detailed information about properties.",
    model=MODEL,
    tools=[WebSearchTool()],
    handoffs=[room_agent, flat_agent, studio_agent],
    output_type=Query_Output
)
async def main():
    # user_id = input("Enter your user ID: ") or "demo_user"
    while True:
        user_input = input("User: ")
        if user_input.lower() == "exit":
            print("Exiting...")
            break
        try:
            result = await Runner.run(
                agent,
                input=user_input,
                session=session,
            )
            print(result.final_output if result.final_output else result)
        except Exception as e:
            print("Error:", e)
if __name__ == "__main__":
    asyncio.run(main())


