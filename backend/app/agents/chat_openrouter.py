import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    raise ValueError("OPENROUTER_API_KEY is missing from .env")

# Direct the OpenAI client to OpenRouter's endpoint
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key,
)

# Free model options:
# 1. "openrouter/free" (auto-selects available free models)
# 2. "meta-llama/llama-3.3-70b-instruct:free"
# 3. "deepseek/deepseek-r1:free"
MODEL = "openrouter/free"

def run_chat():
    print(f"=== OpenRouter Free Chat ({MODEL}) ===")
    print("Type 'exit' to quit.\n")

    messages = [
        {"role": "system", "content": "You are a helpful software engineering assistant."}
    ]

    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit"):
                break

            messages.append({"role": "user", "content": user_input})
            print("\nAssistant: ", end="", flush=True)

            stream = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                stream=True,
            )

            assistant_reply = ""
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                assistant_reply += delta
                sys.stdout.write(delta)
                sys.stdout.flush()

            print("\n")
            messages.append({"role": "assistant", "content": assistant_reply})

        except KeyboardInterrupt:
            print("\nSession stopped.")
            break
        except Exception as e:
            print(f"\n[Error]: {e}\n")

if __name__ == "__main__":
    run_chat()