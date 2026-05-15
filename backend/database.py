from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = "sqlite:///./compliancebot.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Table 1: Company Policies
class CompanyPolicy(Base):
    __tablename__ = "company_policies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    section = Column(String)
    content = Column(Text, nullable=False)
    version = Column(String, default="1.0")
    jurisdiction = Column(String, default="US")
    topic = Column(String)
    last_updated = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, default="system")
    is_active = Column(Boolean, default=True)

# Table 2: Regulations detected by Monitor
class Regulation(Base):
    __tablename__ = "regulations"

    id = Column(Integer, primary_key=True, index=True)
    hash = Column(String, unique=True, index=True)
    title = Column(String)
    url = Column(String)
    jurisdiction = Column(String)
    topic = Column(String)
    summary = Column(Text)
    detected_at = Column(DateTime, default=datetime.utcnow)
    processed = Column(Boolean, default=False)

# Table 3: Gap Reports (USB 09 — confidence scored)
class GapReport(Base):
    __tablename__ = "gap_reports"

    id = Column(Integer, primary_key=True, index=True)
    regulation_title = Column(String)
    regulation_hash = Column(String)
    gap_description = Column(Text)
    confidence_score = Column(Float)
    confidence_reason = Column(Text)
    policy_section = Column(String)
    jurisdiction = Column(String)
    deadline = Column(String)           # USB 07
    days_remaining = Column(Integer)    # USB 07
    enforcement_context = Column(Text)  # USB 08
    jira_key = Column(String)
    doc_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    requires_human_review = Column(Boolean, default=False)

# Table 4: Cross-jurisdiction conflicts (USB 06)
class JurisdictionConflict(Base):
    __tablename__ = "jurisdiction_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    regulation_1_title = Column(String)
    regulation_1_jurisdiction = Column(String)
    regulation_2_title = Column(String)
    regulation_2_jurisdiction = Column(String)
    conflict_description = Column(Text)
    plain_english_explanation = Column(Text)
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)

# Table 5: Audit Trail (USB 10)
class AuditTrail(Base):
    __tablename__ = "audit_trail"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_run_id = Column(String)
    agent_name = Column(String)
    action = Column(String)
    decision = Column(Text)
    branch_taken = Column(String)
    confidence = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    regulation_title = Column(String)

# Table 6: Schedule Configuration
class ScheduleConfig(Base):
    __tablename__ = "schedule_config"

    id = Column(Integer, primary_key=True, index=True)
    interval_minutes = Column(Integer, default=60)
    enabled = Column(Boolean, default=False)
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Table 7: Pipeline Run Logs
class PipelineRunLog(Base):
    __tablename__ = "pipeline_run_logs"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_run_id = Column(String)
    trigger = Column(String, default="manual")  # "manual" or "scheduled"
    status = Column(String, default="running")   # "running", "complete", "error"
    documents_processed = Column(Integer, default=0)
    gaps_found = Column(Integer, default=0)
    conflicts_found = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

# Table 8: Human-in-the-Loop Reviews
class HITLReview(Base):
    __tablename__ = "hitl_reviews"

    id = Column(Integer, primary_key=True, index=True)
    gap_report_id = Column(Integer, nullable=True)
    policy_name = Column(String, nullable=False)
    policy_section = Column(String)
    gap_description = Column(Text)
    confidence_score = Column(Float)
    regulation_title = Column(String)
    jurisdiction = Column(String)
    status = Column(String, default="pending")  # pending, approved, dismissed, rewritten
    rewritten_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()