from fastapi import FastAPI, Depends
from fastapi.responses import FileResponse
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
from database import init_db, get_db, AuditTrail, GapReport, JurisdictionConflict, CompanyPolicy
from sqlalchemy.orm import Session
import asyncio

load_dotenv()

app = FastAPI()

# Initialize database on startup
init_db()

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
                        "content": [{"type": "text", "text": analysis}]
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
        "agents": ["Monitor", "Interpreter", "Comparator", "ConflictDetector", "Drafter", "Orchestrator"],
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
        from agents.conflict_detector import run_conflict_detector
        import uuid

        pipeline_run_id = str(uuid.uuid4())[:8]

        print("\n🧪 TEST MODE — running with sample document")

        interpreted = await run_interpreter(test_document, pipeline_run_id=pipeline_run_id)
        if not interpreted:
            return {"status": "error", "stage": "interpreter"}

        gap_data = await run_comparator(interpreted, pipeline_run_id=pipeline_run_id)
        if not gap_data:
            return {"status": "error", "stage": "comparator"}

        conflict_result = await run_conflict_detector(interpreted, pipeline_run_id=pipeline_run_id)

        draft_result = await run_drafter(gap_data, pipeline_run_id=pipeline_run_id)

        return {
            "status": "success",
            "pipeline_run_id": pipeline_run_id,
            "obligations_found": len(interpreted.get("obligations", [])),
            "gaps_found": draft_result.get("gaps_count"),
            "conflicts_found": len(conflict_result.get("conflicts", [])),
            "jira_key": draft_result.get("jira_key"),
            "requires_human_review": interpreted.get("requires_human_review"),
            "deadline": interpreted.get("deadline", ""),
            "days_remaining": interpreted.get("days_remaining", -1)
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

# ── USB 10: Audit Trail ───────────────────────────────────────────────
@app.get("/audit-trail")
def get_audit_trail(limit: int = 50, db: Session = Depends(get_db)):
    entries = db.query(AuditTrail).order_by(AuditTrail.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "pipeline_run_id": e.pipeline_run_id,
            "agent_name": e.agent_name,
            "action": e.action,
            "decision": e.decision,
            "branch_taken": e.branch_taken,
            "confidence": e.confidence,
            "regulation_title": e.regulation_title,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None
        }
        for e in entries
    ]

# ── USB 09: Gap Reports ───────────────────────────────────────────────
@app.get("/gap-reports")
def get_gap_reports(limit: int = 20, db: Session = Depends(get_db)):
    entries = db.query(GapReport).order_by(GapReport.created_at.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "regulation_title": e.regulation_title,
            "gap_description": e.gap_description,
            "confidence_score": e.confidence_score,
            "confidence_reason": e.confidence_reason,
            "policy_section": e.policy_section,
            "jurisdiction": e.jurisdiction,
            "deadline": e.deadline,
            "days_remaining": e.days_remaining,
            "enforcement_context": e.enforcement_context,
            "jira_key": e.jira_key,
            "requires_human_review": e.requires_human_review,
            "created_at": e.created_at.isoformat() if e.created_at else None
        }
        for e in entries
    ]

# ── USB 06: Jurisdiction Conflicts ────────────────────────────────────
@app.get("/conflicts")
def get_conflicts(db: Session = Depends(get_db)):
    entries = db.query(JurisdictionConflict).order_by(JurisdictionConflict.detected_at.desc()).all()
    return [
        {
            "id": e.id,
            "regulation_1_title": e.regulation_1_title,
            "regulation_1_jurisdiction": e.regulation_1_jurisdiction,
            "regulation_2_title": e.regulation_2_title,
            "regulation_2_jurisdiction": e.regulation_2_jurisdiction,
            "conflict_description": e.conflict_description,
            "plain_english_explanation": e.plain_english_explanation,
            "detected_at": e.detected_at.isoformat() if e.detected_at else None,
            "resolved": e.resolved
        }
        for e in entries
    ]

# ── Policies ──────────────────────────────────────────────────────────
@app.get("/policies")
def get_policies(db: Session = Depends(get_db)):
    entries = db.query(CompanyPolicy).filter(CompanyPolicy.is_active == True).all()
    return [
        {
            "id": e.id,
            "title": e.title,
            "section": e.section,
            "content": e.content,
            "version": e.version,
            "jurisdiction": e.jurisdiction,
            "topic": e.topic,
            "last_updated": e.last_updated.isoformat() if e.last_updated else None,
            "updated_by": e.updated_by
        }
        for e in entries
    ]

# ── PDF Export ────────────────────────────────────────────────────────
@app.get("/export-pdf")
def export_gap_report_pdf(db: Session = Depends(get_db)):
    try:
        from pdf_exporter import generate_gap_report_pdf

        gap_reports = db.query(GapReport).order_by(GapReport.created_at.desc()).limit(50).all()
        conflicts = db.query(JurisdictionConflict).order_by(JurisdictionConflict.detected_at.desc()).all()

        gap_list = [
            {
                "regulation_title": g.regulation_title,
                "gap_description": g.gap_description,
                "confidence_score": g.confidence_score,
                "confidence_reason": g.confidence_reason,
                "policy_section": g.policy_section,
                "jurisdiction": g.jurisdiction,
                "deadline": g.deadline,
                "days_remaining": g.days_remaining,
                "requires_human_review": g.requires_human_review,
                "jira_key": g.jira_key
            }
            for g in gap_reports
        ]

        conflict_list = [
            {
                "regulation_1_title": c.regulation_1_title,
                "regulation_1_jurisdiction": c.regulation_1_jurisdiction,
                "regulation_2_title": c.regulation_2_title,
                "regulation_2_jurisdiction": c.regulation_2_jurisdiction,
                "plain_english_explanation": c.plain_english_explanation
            }
            for c in conflicts
        ]

        pdf_path = generate_gap_report_pdf(gap_list, conflict_list)

        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename="ComplianceBot_GapReport.pdf"
        )

    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/export-pdf-test")
def export_pdf_test():
    try:
        from pdf_exporter import generate_gap_report_pdf

        test_gaps = [
            {
                "regulation_title": "Data Privacy Amendment 2025",
                "gap_description": "No end-to-end encryption policy for customer data at rest",
                "confidence_score": 0.91,
                "confidence_reason": "Direct obligation match found in regulation text",
                "policy_section": "Section 4.2 — Data Security",
                "jurisdiction": "US",
                "deadline": "2025-03-31",
                "days_remaining": 45,
                "requires_human_review": False,
                "jira_key": "COMP-42"
            },
            {
                "regulation_title": "EU GDPR Article 17 Update",
                "gap_description": "Right to erasure not implemented for third-party vendor data",
                "confidence_score": 0.65,
                "confidence_reason": "Partial match — vendor contracts unclear",
                "policy_section": "Section 7.1 — Vendor Management",
                "jurisdiction": "EU",
                "deadline": "2025-06-01",
                "days_remaining": 12,
                "requires_human_review": True,
                "jira_key": "COMP-43"
            }
        ]

        test_conflicts = [
            {
                "regulation_1_title": "US CLOUD Act",
                "regulation_1_jurisdiction": "US",
                "regulation_2_title": "EU GDPR",
                "regulation_2_jurisdiction": "EU",
                "plain_english_explanation": "US law requires data disclosure to authorities in ways that violate EU privacy rights."
            }
        ]

        pdf_path = generate_gap_report_pdf(test_gaps, test_conflicts)

        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename="ComplianceBot_TestReport.pdf"
        )

    except Exception as e:
        return {"status": "error", "message": str(e)}