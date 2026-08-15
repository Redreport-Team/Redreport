#  File Created for Catrell's Text classification feature
#
# pip install requests
# pip install python-dotenv

import requests
import json
import os
from dotenv import load_dotenv

# Load variables from .env file into environment variables
load_dotenv()


response = requests.post(
  url="https://openrouter.ai/api/v1/chat/completions",
  headers={
"Authorization": "Bearer " + os.getenv("OPEN_ROUTER_KEY"), # Access variables using os.getenv fro .env file
    "HTTP-Referer": "reddot.report", # Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "RedReport", # Optional. Site title for rankings on openrouter.ai.
  },
  data=json.dumps({
    "model": "openai/gpt-4o", # Optional
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  })
)