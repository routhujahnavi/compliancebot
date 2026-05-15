import os
import json
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from groq import Groq
from dotenv import load_dotenv
from database import SessionLocal, Regulation, JurisdictionConflict, AuditTrail
import uuid

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def log_audit(pipeline_run_id, action, decision, branch=None, regulation_title=None):
    db = SessionLocal()
    try:
        db.add(AuditTrail(
            pipeline_run_id=pipeline_run_id,
            agent_name="ConflictDetector",
            action=action,
            decision=decision,
            branch_taken=branch or "",
            regulation_title=regulation_title or ""
        ))
        db.commit()
    finally:
        db.close()

async def run_conflict_detector(interpreted: dict, pipeline_run_id: str = None):
    if not pipeline_run_id:
        pipeline_run_id = str(uuid.uuid4())[:8]

    print("⚖️  USB 06: Conflict Detector checking cross-jurisdiction conflicts...")

    current_jurisdiction = interpreted.get("jurisdiction", "US")
    current_title = interpreted.get("title", "")
    current_obligations = interpreted.get("obligations", [])

    # Pull other regulations from DB with different jurisdictions
    db = SessionLocal()
    try:
        other_regs = db.query(Regulation).filter(
            Regulation.jurisdiction != current_jurisdiction,
            Regulation.processed == True
        ).order_by(Regulation.detected_at.desc()).limit(10).all()

        if not other_regs:
            print("  ℹ️  No other jurisdictions in DB yet — skipping conflict check")
            log_audit(pipeline_run_id, "conflict_check_skipped", "No other jurisdictions found", regulation_title=current_title)
            return {"conflicts": []}

        other_regs_text = "\n\n".join([
            f"[{r.jurisdiction}] {r.title}: {r.summary[:300] if r.summary else 'No summary'}"
            for r in other_regs
        ])

        obligations_text = "\n".join([f"- {o}" for o in current_obligations])

        prompt = f"""You are a cross-jurisdiction compliance expert.

NEW REGULATION:
Jurisdiction: {current_jurisdiction}
Title: {current_title}
Obligations:
{obligations_text}

EXISTING REGULATIONS FROM OTHER JURISDICTIONS:
{other_regs_text}

Identify any direct conflicts where the new regulation contradicts an existing one.
A conflict means: complying with one regulation would make you non-compliant with another.

Return ONLY a JSON array. Each conflict:
{{
  "regulation_1_title": "{current_title}",
  "regulation_1_jurisdiction": "{current_jurisdiction}",
  "regulation_2_title": "title of conflicting regulation",
  "regulation_2_jurisdiction": "its jurisdiction",
  "conflict_description": "technical description of the conflict",
  "plain_english_explanation": "1-2 sentences a non-lawyer can understand"
}}

If no real conflicts exist, return empty array [].
Return ONLY valid JSON. No markdown."""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a compliance expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )

        raw = response.choices[0].message.content.strip()

        try:
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            conflicts = json.loads(raw.strip())
        except:
            conflicts = []

        # Save conflicts to DB
        for c in conflicts:
            db.add(JurisdictionConflict(
                regulation_1_title=c.get("regulation_1_title", ""),
                regulation_1_jurisdiction=c.get("regulation_1_jurisdiction", ""),
                regulation_2_title=c.get("regulation_2_title", ""),
                regulation_2_jurisdiction=c.get("regulation_2_jurisdiction", ""),
                conflict_description=c.get("conflict_description", ""),
                plain_english_explanation=c.get("plain_english_explanation", "")
            ))
        db.commit()

        # Mark current regulation as processed
        reg = db.query(Regulation).filter_by(hash=interpreted.get("hash", "")).first()
        if reg:
            reg.processed = True
            db.commit()

    finally:
        db.close()

    log_audit(pipeline_run_id, "conflicts_detected", f"{len(conflicts)} conflicts found", regulation_title=current_title)
    print(f"  ✅ {len(conflicts)} cross-jurisdiction conflicts detected")

    return {"conflicts": conflicts}