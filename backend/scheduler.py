import asyncio
import os
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from agents.monitor import run_monitor
from agents.orchestrator import run_orchestrator

INTERVAL_SECONDS = 3600  # 1 hour

async def run_pipeline_once():
    pipeline_run_id = str(uuid.uuid4())[:8]
    print(f"\n{'='*60}")
    print(f"🚀 Scheduled Pipeline Run | ID: {pipeline_run_id}")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    try:
        new_docs = await run_monitor()

        if not new_docs:
            print("📭 No new documents found. Pipeline complete.")
            return

        print(f"📬 {len(new_docs)} new documents — running orchestrator...")
        await run_orchestrator(new_docs, pipeline_run_id=pipeline_run_id)
        print(f"✅ Pipeline run {pipeline_run_id} complete.")

    except Exception as e:
        print(f"❌ Pipeline error: {e}")

async def start_scheduler():
    print(f"⏱️  Scheduler started — running every {INTERVAL_SECONDS // 60} minutes")
    print(f"🔁 First run starting now...\n")

    while True:
        await run_pipeline_once()
        print(f"\n💤 Sleeping for {INTERVAL_SECONDS // 60} minutes...\n")
        await asyncio.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    asyncio.run(start_scheduler())