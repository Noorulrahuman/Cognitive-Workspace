import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env
load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY is missing from .env. Please set it before running.")

# Initialize the Groq client
client = Groq(api_key=api_key)

# Recommended default model
DEFAULT_MODEL = "openai/gpt-oss-120b"