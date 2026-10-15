# import os
# from dotenv import load_dotenv
from groq import Groq
from app.config import settings

if settings.GROQ_API_KEY is None:
    raise ValueError("GROQ_API_KEY is missing from .env. Please set it before running.")

# Initialize the Groq client
client = Groq(api_key=settings.GROQ_API_KEY.get_secret_value())


# Recommended default model
DEFAULT_MODEL = "openai/gpt-oss-120b"