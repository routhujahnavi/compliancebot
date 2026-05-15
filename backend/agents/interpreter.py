import os
import json
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from groq import Groq
from tavily import TavilyClient
from dotenv import load_dotenv
from database import SessionLocal, Regulation, AuditTrail
from datetime import datetime, timedelta
import uuid

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

def log_audit(pipeline_run_id, action, decision, branch=None, confidence=None, regulation_title=None):
    db = SessionLocal()
    try:
        db.add(AuditTrail(
            pipeline_run_id=pipeline_run_id,
            agent_name="Interpreter",
            action=action,
            decision=decision,
            branch_taken=branch or "",
            confidence=confidence,
            regulation_title=regulation_title or ""
        ))
        db.commit()
    finally:
        db.close()

def get_enforcement_news(regulation_title: str, topic: str) -> str:
    """USB 08 — Live enforcement news injection"""
    try:
        query = f"enforcement action fine penalty {topic} {regulation_title} 2024 2025"
        results = tavily.search(query, max_results=3)
        news_items = []
        for r in results.get("results", [])[:3]:
            news_items.append(f"• {r['title']}: {r['content'][:200]}")
        if news_items:
            return "\n".join(news_items)
        return "No recent enforcement actions found."
    except:
        return "Enforcement news unavailable."

def calculate_days_remaining(deadline_str: str) -> int:
    """USB 07 — Calculate days remaining to deadline"""
    try:
        formats = ["%Y-%m-%d", "%B %d, %Y", "%b %d, %Y", "%d/%m/%Y"]
        for fmt in formats:
            try:
                deadline = datetime.strptime(deadline_str.strip(), fmt)
                delta = deadline - datetime.utcnow()
                return max(0, delta.days)
            except:
                continue
        return -1
    except:
        return -1

async def run_interpreter(document: dict, pipeline_run_id: str = None):
    if not pipeline_run_id:
        pipeline_run_id = str(uuid.uuid4())[:8]

    print(f"📖 Agent 2: Interpreter reading: {document['title'][:60]}")

    # Save regulation to DB
    db = SessionLocal()
    try:
        existing = db.query(Regulation).filter_by(hash=document.get("hash", "")).first()
        if not existing:
            db.add(Regulation(
                hash=document.get("hash", ""),
                title=document.get("title", ""),
                url=document.get("url", ""),
                jurisdiction=document.get("jurisdiction", "US"),
                topic=document.get("topic", ""),
                summary=document.get("summary", ""),
                processed=False
            ))
            db.commit()
    finally:
        db.close()

    # USB 08 — Get enforcement news
    print("  🔎 Fetching enforcement news (USB 08)...")
    enforcement_context = get_enforcement_news(
        document.get("title", ""),
        document.get("topic", "general compliance")
    )

    prompt = f"""You are a regulatory compliance expert.

Read this regulation and extract structured information.

REGULATION TITLE: {document['title']}
JURISDICTION: {document.get('jurisdiction', 'US')}
CONTENT: {document.get('summary', '')}

Return ONLY this JSON (no markdown):
{{
  "title": "regulation title",
  "jurisdiction": "US/EU/IN/etc",
  "topic": "main topic",
  "obligations": ["obligation 1", "obligation 2", "obligation 3"],
  "deadline": "YYYY-MM-DD or empty string if not found",
  "confidence": 0.0-1.0,
  "requires_human_review": true/false
}}

Set requires_human_review to true if confidence < 0.7."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "Return only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1
    )

    raw = response.choices[0].message.content.strip()

    try:
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
    except:
        result = {
            "title": document.get("title", ""),
            "jurisdiction": document.get("jurisdiction", "US"),
            "topic": document.get("topic", ""),
            "obligations": [],
            "deadline": "",
            "confidence": 0.5,
            "requires_human_review": True
        }

    # USB 07 — Add deadline countdown
    deadline = result.get("deadline", "")
    days_remaining = calculate_days_remaining(deadline) if deadline else -1
    result["days_remaining"] = days_remaining

    # USB 08 — Attach enforcement context
    result["enforcement_context"] = enforcement_context
    result["hash"] = document.get("hash", "")

    log_audit(
        pipeline_run_id,
        "interpreted_regulation",
        f"Found {len(result.get('obligations', []))} obligations. Confidence: {result.get('confidence')}",
        branch="human_review" if result.get("requires_human_review") else "auto",
        confidence=result.get("confidence"),
        regulation_title=result.get("title")
    )

    print(f"  ✅ {len(result.get('obligations', []))} obligations. Deadline: {deadline} ({days_remaining} days). Confidence: {result.get('confidence')}")
    return result