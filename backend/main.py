from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import requests
from groq import Groq
from tavily import TavilyClient

load_dotenv()

app = FastAPI()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN")
JIRA_EMAIL = os.getenv("JIRA_EMAIL")
JIRA_URL = os.getenv("JIRA_URL")
JIRA_PROJECT_KEY = os.getenv("JIRA_PROJECT_KEY")

@app.get("/")
def home():
    return {"message": "ComplianceBot is running!"}

@app.post("/check-compliance")
def check_compliance(topic: str):
    # Search for latest compliance info
    search_results = tavily_client.search(topic)
    context = search_results["results"][0]["content"]

    # Ask Groq AI to analyze
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a compliance expert."},
            {"role": "user", "content": f"Analyze this compliance topic: {topic}\n\nContext: {context}"}
        ]
    )
    analysis = response.choices[0].message.content

    # Send to Slack
    slack_message = {"text": f"Compliance Alert: {topic}\n\n{analysis}"}
    requests.post(SLACK_WEBHOOK_URL, json=slack_message)

    # Create Jira ticket
    jira_headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    jira_data = {
        "fields": {
            "project": {"key": JIRA_PROJECT_KEY},
            "summary": f"Compliance Issue: {topic}",
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": analysis
                            }
                        ]
                    }
                ]
            },
            "issuetype": {"name": "Task"}
        }
    }
    jira_response = requests.post(
        f"{JIRA_URL}/rest/api/3/issue",
        json=jira_data,
        headers=jira_headers,
        auth=(JIRA_EMAIL, JIRA_API_TOKEN)
    )
    print("Jira response:", jira_response.status_code, jira_response.text)

    return {"analysis": analysis}