import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from agents.monitor import run_monitor
from agents.orchestrator import run_orchestrator
from email_alerts import send_pipeline_summary_email
from database import SessionLocal, ScheduleConfig, PipelineRunLog

scheduler = AsyncIOScheduler()

JOB_ID = "compliance_pipeline"


def get_schedule_config():
    """Get current schedule config from DB (or create default)."""
    db = SessionLocal()
    try:
        config = db.query(ScheduleConfig).first()
        if not config:
            config = ScheduleConfig(
                interval_minutes=360,
                enabled=False
            )
            db.add(config)
            db.commit()
            db.refresh(config)
        return {
            "id": config.id,
            "interval_minutes": config.interval_minutes,
            "enabled": config.enabled,
            "last_run_at": config.last_run_at.isoformat() if config.last_run_at else None,
            "next_run_at": config.next_run_at.isoformat() if config.next_run_at else None,
        }
    finally:
        db.close()


def update_schedule_config(interval_minutes: int = None, enabled: bool = None):
    """Update schedule config in DB and reschedule the job."""
    db = SessionLocal()
    try:
        config = db.query(ScheduleConfig).first()
        if not config:
            config = ScheduleConfig(interval_minutes=360, enabled=False)
            db.add(config)
            db.commit()
            db.refresh(config)

        if interval_minutes is not None:
            config.interval_minutes = interval_minutes
        if enabled is not None:
            config.enabled = enabled

        config.updated_at = datetime.utcnow()

        if config.enabled:
            config.next_run_at = datetime.utcnow() + timedelta(minutes=config.interval_minutes)
        else:
            config.next_run_at = None

        db.commit()

        # Update the APScheduler job
        _sync_scheduler_job(config.interval_minutes, config.enabled)

        return {
            "id": config.id,
            "interval_minutes": config.interval_minutes,
            "enabled": config.enabled,
            "last_run_at": config.last_run_at.isoformat() if config.last_run_at else None,
            "next_run_at": config.next_run_at.isoformat() if config.next_run_at else None,
        }
    finally:
        db.close()


def _sync_scheduler_job(interval_minutes: int, enabled: bool):
    """Add, update, or remove the scheduled job based on config."""
    existing = scheduler.get_job(JOB_ID)

    if not enabled:
        if existing:
            scheduler.remove_job(JOB_ID)
            print(f"⏸️  Scheduler disabled — job removed")
        return

    if existing:
        scheduler.reschedule_job(
            JOB_ID,
            trigger=IntervalTrigger(minutes=interval_minutes)
        )
        print(f"🔄 Scheduler rescheduled — every {interval_minutes} minutes")
    else:
        scheduler.add_job(
            scheduled_pipeline_run,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id=JOB_ID,
            name="Compliance Pipeline",
            replace_existing=True
        )
        print(f"▶️  Scheduler started — every {interval_minutes} minutes")


async def scheduled_pipeline_run():
    """Run the compliance pipeline as a scheduled job."""
    pipeline_run_id = str(uuid.uuid4())[:8]
    print(f"\n{'='*60}")
    print(f"🚀 Scheduled Pipeline Run | ID: {pipeline_run_id}")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    # Create a run log entry
    db = SessionLocal()
    run_log = PipelineRunLog(
        pipeline_run_id=pipeline_run_id,
        trigger="scheduled",
        status="running"
    )
    db.add(run_log)
    db.commit()
    run_log_id = run_log.id

    # Update last_run_at in schedule config
    config = db.query(ScheduleConfig).first()
    if config:
        config.last_run_at = datetime.utcnow()
        config.next_run_at = datetime.utcnow() + timedelta(minutes=config.interval_minutes)
        db.commit()
    db.close()

    try:
        new_docs = await run_monitor()

        if not new_docs:
            print("📭 No new documents found. Pipeline complete.")
            _update_run_log(run_log_id, "complete", 0, 0, 0)
            return

        print(f"📬 {len(new_docs)} new documents — running orchestrator...")
        results = await run_orchestrator(new_docs, pipeline_run_id=pipeline_run_id)

        total_gaps = sum(r.get("gaps_count", 0) for r in results)
        total_conflicts = sum(r.get("conflicts_found", 0) for r in results)

        _update_run_log(run_log_id, "complete", len(results), total_gaps, total_conflicts)

        # Send pipeline summary email
        try:
            send_pipeline_summary_email(results)
        except Exception as e:
            print(f"  ⚠️  Summary email failed: {e}")

        print(f"✅ Pipeline run {pipeline_run_id} complete.")

    except Exception as e:
        print(f"❌ Pipeline error: {e}")
        _update_run_log(run_log_id, "error", 0, 0, 0, str(e))


def _update_run_log(log_id: int, status: str, docs: int, gaps: int, conflicts: int, error: str = None):
    """Update a pipeline run log entry."""
    db = SessionLocal()
    try:
        log = db.query(PipelineRunLog).filter(PipelineRunLog.id == log_id).first()
        if log:
            log.status = status
            log.documents_processed = docs
            log.gaps_found = gaps
            log.conflicts_found = conflicts
            log.error_message = error
            log.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def start_scheduler():
    """Initialize and start the APScheduler. Call this on app startup."""
    config = get_schedule_config()

    if not scheduler.running:
        scheduler.start()
        print("⏱️  APScheduler started")

    if config["enabled"]:
        _sync_scheduler_job(config["interval_minutes"], True)
        print(f"▶️  Auto-run enabled — every {config['interval_minutes']} minutes")
    else:
        print("⏸️  Scheduler initialized but auto-run is disabled")


def stop_scheduler():
    """Shut down the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("⏹️  Scheduler stopped")


# Standalone mode for running as a separate process
if __name__ == "__main__":
    async def main():
        start_scheduler()
        update_schedule_config(interval_minutes=60, enabled=True)
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            stop_scheduler()

    asyncio.run(main())