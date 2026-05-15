import asyncio
import os
import uuid
import requests
from dotenv import load_dotenv
from agents.monitor import run_monitor
from agents.interpreter import run_interpreter
from agents.comparator import run_comparator
from agents.drafter import run_drafter
from agents.conflict_detector import run_conflict_detector

load_dotenv()

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

def send_human_review_alert(title, reason):
    message = {
        "text": (
            f"🟡 *Human Review Required*\n\n"
            f"*Regulation:* {title}\n"
            f"*Reason:* {reason}\n\n"
            f"Please review and respond to continue processing."
        )
    }
    try:
        requests.post(SLACK_WEBHOOK_URL, json=message)
        print("⚠️  Human review alert sent to Slack")
    except Exception as e:
        print(f"❌ Slack alert error: {e}")

async def run_pipeline(document: dict):
    pipeline_run_id = str(uuid.uuid4())[:8]

    results = {
        "document_title": document.get("title", ""),
        "pipeline_run_id": pipeline_run_id,
        "stages": {}
    }

    # Stage 2: Interpret
    print("\n--- Stage 2: Interpreter ---")
    interpreted = None
    for attempt in range(3):
        try:
            interpreted = await run_interpreter(document, pipeline_run_id=pipeline_run_id)
            if interpreted:
                results["stages"]["interpreter"] = "success"
                break
        except Exception as e:
            print(f"  Retry {attempt+1}/3: {e}")
            await asyncio.sleep(2)

    if not interpreted:
        results["stages"]["interpreter"] = "failed"
        print("❌ Interpreter failed after 3 attempts")
        return results

    # Human-in-the-loop check
    if interpreted.get("requires_human_review"):
        send_human_review_alert(
            interpreted.get("title", "Unknown"),
            "Low confidence extraction — human verification needed"
        )
        results["stages"]["human_review"] = "flagged"
        print("⏸️  Pipeline paused — waiting for human review")

    # Stage 3: Compare
    print("\n--- Stage 3: Comparator ---")
    gap_data = None
    for attempt in range(3):
        try:
            gap_data = await run_comparator(interpreted, pipeline_run_id=pipeline_run_id)
            if gap_data:
                results["stages"]["comparator"] = "success"
                break
        except Exception as e:
            print(f"  Retry {attempt+1}/3: {e}")
            await asyncio.sleep(2)

    if not gap_data:
        results["stages"]["comparator"] = "failed"
        return results

    # Stage 3b: USB 06 — Cross-jurisdiction conflict detection
    print("\n--- Stage 3b: Conflict Detector (USB 06) ---")
    conflict_result = {"conflicts": []}
    try:
        conflict_result = await run_conflict_detector(interpreted, pipeline_run_id=pipeline_run_id)
        results["stages"]["conflict_detector"] = "success"
        results["conflicts_found"] = len(conflict_result.get("conflicts", []))
    except Exception as e:
        print(f"  ⚠️  Conflict detector error (non-fatal): {e}")
        results["stages"]["conflict_detector"] = "skipped"
        results["conflicts_found"] = 0

    # Stage 4: Draft
    print("\n--- Stage 4: Drafter ---")
    draft_result = None
    for attempt in range(3):
        try:
            draft_result = await run_drafter(gap_data, pipeline_run_id=pipeline_run_id)
            if draft_result:
                results["stages"]["drafter"] = "success"
                break
        except Exception as e:
            print(f"  Retry {attempt+1}/3: {e}")
            await asyncio.sleep(2)

    if not draft_result:
        results["stages"]["drafter"] = "failed"
        return results

    results["jira_key"] = draft_result.get("jira_key")
    results["gaps_count"] = draft_result.get("gaps_count")
    results["doc_path"] = draft_result.get("doc_path")
    results["requires_human_review"] = draft_result.get("requires_human_review", False)
    results["status"] = "complete"

    print(f"\n✅ Pipeline complete! Gaps: {results['gaps_count']} | Conflicts: {results['conflicts_found']} | Jira: {results['jira_key']}")
    return results


async def run_orchestrator():
    print("🤖 Agent 5: Orchestrator starting full pipeline...\n")
    print("--- Stage 1: Monitor ---")

    documents = await run_monitor()

    if not documents:
        print("ℹ️  No new documents found.")
        return []

    all_results = []
    for doc in documents[:2]:  # Process max 2 docs per run
        print(f"\n🔄 Processing: {doc['title'][:60]}")
        result = await run_pipeline(doc)
        all_results.append(result)

    print(f"\n🎯 Orchestrator done. Processed {len(all_results)} documents.")
    return all_results