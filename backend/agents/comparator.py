import os
import json
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from groq import Groq
from dotenv import load_dotenv
from database import SessionLocal, CompanyPolicy, AuditTrail
from datetime import datetime
import uuid

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def log_audit(pipeline_run_id, action, decision, branch=None, confidence=None, regulation_title=None):
    db = SessionLocal()
    try:
        db.add(AuditTrail(
            pipeline_run_id=pipeline_run_id,
            agent_name="Comparator",
            action=action,
            decision=decision,
            branch_taken=branch or "",
            confidence=confidence,
            regulation_title=regulation_title or ""
        ))
        db.commit()
    finally:
        db.close()

def get_policies_from_db(topic=None, jurisdiction=None):
    db = SessionLocal()
    try:
        query = db.query(CompanyPolicy).filter(CompanyPolicy.is_active == True)
        if topic:
            query = query.filter(CompanyPolicy.topic.contains(topic))
        policies = query.all()
        if not policies:
            policies = db.query(CompanyPolicy).filter(CompanyPolicy.is_active == True).all()
        return [
            {
                "title": p.title,
                "section": p.section,
                "content": p.content,
                "version": p.version,
                "jurisdiction": p.jurisdiction,
                "topic": p.topic
            }
            for p in policies
        ]
    finally:
        db.close()

async def run_comparator(interpreted: dict, pipeline_run_id: str = None):
    if not pipeline_run_id:
        pipeline_run_id = str(uuid.uuid4())[:8]

    print("🔍 Agent 3: Comparator finding gaps (with confidence scores)...")

    obligations = interpreted.get("obligations", [])
    topic = interpreted.get("topic", "")
    jurisdiction = interpreted.get("jurisdiction", "US")
    regulation_title = interpreted.get("title", "")

    # Pull policies from DB
    policies = get_policies_from_db(topic=topic, jurisdiction=jurisdiction)
    log_audit(pipeline_run_id, "pulled_policies", f"Found {len(policies)} relevant policies", regulation_title=regulation_title)

    policy_text = "\n\n".join([
        f"[{p['section']} — {p['title']}]\n{p['content']}"
        for p in policies
    ])

    obligations_text = "\n".join([f"- {o}" for o in obligations])

    prompt = f"""You are a compliance gap analyst.

REGULATION: {regulation_title} ({jurisdiction})

NEW OBLIGATIONS:
{obligations_text}

CURRENT COMPANY POLICIES:
{policy_text}

For each obligation, check if our policies cover it. Return a JSON array of gaps only.
Each gap must have:
- "gap": what is missing (one sentence)
- "obligation": the regulation requirement
- "policy_section": which policy section is affected
- "confidence_score": float 0.0-1.0 (how confident you are this is a real gap)
- "confidence_reason": plain English explanation of why this is a gap and your confidence level
- "suggested_fix": one sentence fix

Return ONLY valid JSON array. No markdown, no explanation outside JSON."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a compliance expert. Return only valid JSON."},
            {"role": "user", "content":