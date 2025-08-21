from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()
import os

base_url = "https://api.aimlapi.com/v1"

# Insert your AIML API key in the quotation marks instead of <YOUR_AIMLAPI_KEY>:
api_key = os.getenv("OPENAI_API_KEY") 

system_prompt = "You are a helpful assistant for real estate inquiries. You will assist users with searching rooms according to postcode, price, distance from specific location, search website like Rightmove,Zoopla and Spareroom, use thw websearch tool to find relevant listings, and provide detailed information about properties."
user_prompt = "Something in rg1, prefereebly a room for rent, under 500 pounds, within 5 miles of Reading town centre."

api = OpenAI(api_key=api_key, base_url=base_url)


def main():
    completion = api.chat.completions.create(
        model="openai/gpt-5-2025-08-07",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=256,
    )

    response = completion.choices[0].message.content

    print("User:", user_prompt)
    print("AI:", response)


if __name__ == "__main__":
    main()