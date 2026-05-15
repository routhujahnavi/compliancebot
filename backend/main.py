from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
import requests
from groq import Groq
from tavily import TavilyClient
from agents.orchestrator import run_orchestrator
from agents.monitor import run_monitor
import asyncio

load_dotenv()

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
    search_results = tavily_client.search(topic)
    context = search_results["results"][0]["content"]

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a compliance expert."},
            {"role": "user", "content": f"Analyze this compliance topic: {topic}\n\nContext: {context}"}
        ]
    )
    analysis = response.choices[0].message.content

    slack_message = {"text": f"Compliance Alert: {topic}\n\n{analysis}"}
    requests.post(SLACK_WEBHOOK_URL, json=slack_message)

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

@app.post("/run-pipeline")
async def run_pipeline_endpoint():
    try:
        results = await run_orchestrator()
        return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/pipeline-status")
async def pipeline_status():
    return {
        "agents": ["Monitor", "Interpreter", "Comparator", "Drafter", "Orchestrator"],
        "status": "ready"
    }

@app.post("/run-pipeline-test")
async def run_pipeline_test():
    try:
        test_document = {
            "hash": "test123",
            "url": "https://www.federalregister.gov/test",
            "title": "New Data Privacy Amendment 2025 - Financial Institutions Must Encrypt Customer Data",
            "date": "2025-01-15",
            "jurisdiction": "US",
            "topic": "data privacy",
            "summary": "Financial institutions must implement end-to-end encryption for all customer data by March 2025. Institutions must conduct quarterly security audits. Failure to comply results in fines up to $500,000. All third party vendors must be certified within 60 days."
        }

        from agents.interpreter import run_interpreter
        from agents.comparator import run_comparator
        from agents.drafter import run_drafter

        print("\n🧪 TEST MODE — running with sample document")

        interpreted = await run_interpreter(test_document)
        if not interpreted:
            return {"status": "error", "stage": "interpreter"}

        gap_data = await run_comparator(interpreted)
        if not gap_data:
            return {"status": "error", "stage": "comparator"}

        draft_result = await run_drafter(gap_data)

        return {
            "status": "success",
            "obligations_found": len(interpreted.get("obligations", [])),
            "gaps_found": draft_result.get("gaps_count"),
            "jira_key": draft_result.get("jira_key"),
            "requires_human_review": interpreted.get("requires_human_review")
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}