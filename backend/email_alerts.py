import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

SMTP_HOST = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("EMAIL_SMTP_PORT", "587"))
EMAIL_FROM = os.getenv("EMAIL_FROM", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_RECIPIENTS = os.getenv("EMAIL_RECIPIENTS", "")


def _get_recipients():
    """Parse comma-separated email recipients from env."""
    if not EMAIL_RECIPIENTS:
        return []
    return [e.strip() for e in EMAIL_RECIPIENTS.split(",") if e.strip()]


def _send_email(subject: str, html_body: str, recipients: list = None):
    """Send an HTML email via SMTP."""
    to_list = recipients or _get_recipients()
    if not to_list or not EMAIL_FROM or not EMAIL_PASSWORD:
        print("  ⚠️  Email not configured — skipping email alert")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"ComplianceBot <{EMAIL_FROM}>"
    msg["To"] = ", ".join(to_list)
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(EMAIL_FROM, EMAIL_PASSWORD)
            server.sendmail(EMAIL_FROM, to_list, msg.as_string())
        print(f"  📧 Email sent to {', '.join(to_list)}")
        return True
    except Exception as e:
        print(f"  ❌ Email error: {e}")
        return False


def send_gap_alert_email(gap_data: dict, jira_key: str = None):
    """Send an HTML email alert when compliance gaps are found."""
    regulation_title = gap_data.get("regulation_title", "Unknown Regulation")
    gaps = gap_data.get("gaps", [])
    jurisdiction = gap_data.get("jurisdiction", "US")
    deadline = gap_data.get("deadline", "")
    days_remaining = gap_data.get("days_remaining", -1)

    if not gaps:
        return False

    # Build the gaps table rows
    gap_rows = ""
    for g in gaps:
        score = g.get("confidence_score", 0)
        score_pct = f"{score:.0%}"
        if score >= 0.8:
            score_color = "#10b981"
        elif score >= 0.6:
            score_color = "#f59e0b"
        else:
            score_color = "#ef4444"

        review_badge = ""
        if score < 0.7:
            review_badge = '<span style="background:#92400e;color:#fcd34d;border-radius:4px;padding:2px 6px;font-size:11px;">⚠️ Human Review</span>'

        gap_rows += f"""
        <tr style="border-bottom:1px solid #334155;">
            <td style="padding:12px;color:#e2e8f0;font-size:13px;">{g.get('gap', '')}</td>
            <td style="padding:12px;text-align:center;">
                <span style="background:{score_color};color:#fff;border-radius:4px;padding:3px 8px;font-size:12px;font-weight:700;">{score_pct}</span>
                {review_badge}
            </td>
            <td style="padding:12px;color:#94a3b8;font-size:12px;">{g.get('policy_section', 'N/A')}</td>
            <td style="padding:12px;color:#94a3b8;font-size:12px;">{g.get('suggested_fix', 'N/A')}</td>
        </tr>"""

    deadline_section = ""
    if deadline:
        urgency_color = "#ef4444" if days_remaining <= 30 else "#f59e0b" if days_remaining <= 90 else "#10b981"
        deadline_section = f"""
        <div style="background:#1e293b;border-radius:8px;padding:16px;margin-bottom:20px;border-left:4px solid {urgency_color};">
            <span style="font-size:16px;">📅</span>
            <strong style="color:#e2e8f0;"> Compliance Deadline:</strong>
            <span style="color:{urgency_color};font-weight:700;"> {deadline}</span>
            <span style="color:#94a3b8;"> ({days_remaining} days remaining)</span>
        </div>"""

    jira_section = ""
    if jira_key:
        jira_section = f"""
        <div style="margin-top:16px;">
            <span style="background:#1d4ed8;color:#fff;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:700;">🎫 Jira: {jira_key}</span>
        </div>"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:680px;margin:0 auto;padding:24px;">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:12px;padding:24px;margin-bottom:20px;border:1px solid #334155;">
                <h1 style="margin:0;color:#38bdf8;font-size:22px;">🤖 ComplianceBot Alert</h1>
                <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Compliance Gaps Detected — Immediate Attention Required</p>
            </div>

            <!-- Regulation Info -->
            <div style="background:#1e293b;border-radius:8px;padding:16px;margin-bottom:20px;">
                <div style="color:#94a3b8;font-size:12px;margin-bottom:4px;">REGULATION</div>
                <div style="color:#e2e8f0;font-size:16px;font-weight:700;">{regulation_title}</div>
                <div style="margin-top:6px;">
                    <span style="background:#0f172a;color:#64748b;border-radius:4px;padding:3px 10px;font-size:12px;">🌍 {jurisdiction}</span>
                    <span style="background:#92400e;color:#fcd34d;border-radius:4px;padding:3px 10px;font-size:12px;margin-left:6px;">🔍 {len(gaps)} Gap{'s' if len(gaps) != 1 else ''} Found</span>
                </div>
            </div>

            {deadline_section}

            <!-- Gaps Table -->
            <div style="background:#1e293b;border-radius:8px;overflow:hidden;margin-bottom:20px;">
                <div style="padding:14px 16px;border-bottom:1px solid #334155;">
                    <strong style="color:#f59e0b;font-size:14px;">🔍 Compliance Gaps</strong>
                </div>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#0f172a;">
                            <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;">Gap</th>
                            <th style="padding:10px 12px;text-align:center;color:#64748b;font-size:11px;text-transform:uppercase;">Confidence</th>
                            <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;">Policy Section</th>
                            <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;">Suggested Fix</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gap_rows}
                    </tbody>
                </table>
            </div>

            {jira_section}

            <!-- Footer -->
            <div style="text-align:center;margin-top:24px;padding:16px;border-top:1px solid #334155;">
                <p style="color:#475569;font-size:11px;margin:0;">
                    Generated by ComplianceBot · {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                </p>
            </div>

        </div>
    </body>
    </html>
    """

    subject = f"🚨 ComplianceBot: {len(gaps)} Gap{'s' if len(gaps) != 1 else ''} Found — {regulation_title[:60]}"
    return _send_email(subject, html)


def send_pipeline_summary_email(results: list):
    """Send a summary email after a scheduled pipeline run."""
    if not results:
        return False

    total_gaps = sum(r.get("gaps_count", 0) for r in results)
    total_conflicts = sum(r.get("conflicts_found", 0) for r in results)
    docs_processed = len(results)

    result_rows = ""
    for r in results:
        status_color = "#10b981" if r.get("status") == "complete" else "#ef4444"
        result_rows += f"""
        <tr style="border-bottom:1px solid #334155;">
            <td style="padding:10px 12px;color:#e2e8f0;font-size:13px;">{r.get('document_title', 'Unknown')[:50]}</td>
            <td style="padding:10px 12px;text-align:center;">
                <span style="color:{status_color};font-weight:700;font-size:12px;">{r.get('status', 'unknown').upper()}</span>
            </td>
            <td style="padding:10px 12px;text-align:center;color:#f59e0b;font-size:13px;">{r.get('gaps_count', 0)}</td>
            <td style="padding:10px 12px;text-align:center;color:#a78bfa;font-size:13px;">{r.get('conflicts_found', 0)}</td>
            <td style="padding:10px 12px;text-align:center;color:#38bdf8;font-size:12px;">{r.get('jira_key', 'N/A')}</td>
        </tr>"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:680px;margin:0 auto;padding:24px;">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:12px;padding:24px;margin-bottom:20px;border:1px solid #334155;">
                <h1 style="margin:0;color:#38bdf8;font-size:22px;">🤖 ComplianceBot — Scheduled Run Summary</h1>
                <p style="margin:4px 0 0;color:#64748b;font-size:13px;">{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>

            <!-- Summary Cards -->
            <div style="display:flex;gap:12px;margin-bottom:20px;">
                <div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#38bdf8;">{docs_processed}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Documents</div>
                </div>
                <div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#f59e0b;">{total_gaps}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Gaps Found</div>
                </div>
                <div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#a78bfa;">{total_conflicts}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Conflicts</div>
                </div>
            </div>

            <!-- Results Table -->
            <div style="background:#1e293b;border-radius:8px;overflow:hidden;margin-bottom:20px;">
                <div style="padding:14px 16px;border-bottom:1px solid #334155;">
                    <strong style="color:#e2e8f0;font-size:14px;">📋 Pipeline Results</strong>
                </div>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#0f172a;">
                            <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:11px;">Document</th>
                            <th style="padding:10px 12px;text-align:center;color:#64748b;font-size:11px;">Status</th>
                            <th style="padding:10px 12px;text-align:center;color:#64748b;font-size:11px;">Gaps</th>
                            <th style="padding:10px 12px;text-align:center;color:#64748b;font-size:11px;">Conflicts</th>
                            <th style="padding:10px 12px;text-align:center;color:#64748b;font-size:11px;">Jira</th>
                        </tr>
                    </thead>
                    <tbody>
                        {result_rows}
                    </tbody>
                </table>
            </div>

            <!-- Footer -->
            <div style="text-align:center;margin-top:24px;padding:16px;border-top:1px solid #334155;">
                <p style="color:#475569;font-size:11px;margin:0;">
                    Automated run by ComplianceBot Scheduler
                </p>
            </div>

        </div>
    </body>
    </html>
    """

    subject = f"📊 ComplianceBot: Scheduled Run — {docs_processed} docs, {total_gaps} gaps found"
    return _send_email(subject, html)


def send_test_email():
    """Send a test email to verify configuration."""
    html = """
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:500px;margin:0 auto;padding:40px;">
            <div style="background:#1e293b;border-radius:12px;padding:32px;text-align:center;border:1px solid #334155;">
                <div style="font-size:48px;margin-bottom:16px;">✅</div>
                <h2 style="color:#10b981;margin:0 0 8px;">Email Configuration Working!</h2>
                <p style="color:#94a3b8;font-size:14px;margin:0;">
                    ComplianceBot email alerts are properly configured.
                    You will receive notifications when compliance gaps are detected.
                </p>
                <div style="margin-top:20px;padding-top:16px;border-top:1px solid #334155;">
                    <p style="color:#475569;font-size:11px;margin:0;">
                        ComplianceBot · """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return _send_email("✅ ComplianceBot — Email Test Successful", html)


def send_hitl_review_email(review_id: int, policy_name: str, confidence_score: float,
                            gap_description: str = "", regulation_title: str = "",
                            base_url: str = "http://localhost:8001"):
    """Send email when a low-confidence policy needs human review."""
    score_pct = f"{confidence_score:.0%}"
    score_color = "#ef4444" if confidence_score < 0.5 else "#f59e0b"
    approve_url = f"{base_url}/hitl-reviews/{review_id}/approve"
    dismiss_url = f"{base_url}/hitl-reviews/{review_id}/dismiss"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:12px;padding:24px;margin-bottom:20px;border:1px solid #334155;">
                <h1 style="margin:0;color:#f59e0b;font-size:20px;">⚠️ Human Review Required</h1>
                <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Low-confidence policy detected — action needed</p>
            </div>
            <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:16px;border-left:4px solid {score_color};">
                <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin-bottom:6px;">Policy</div>
                <div style="color:#e2e8f0;font-size:16px;font-weight:700;margin-bottom:12px;">{policy_name}</div>
                <div style="display:flex;gap:12px;margin-bottom:12px;">
                    <span style="background:{score_color};color:#fff;border-radius:4px;padding:4px 10px;font-size:13px;font-weight:700;">Confidence: {score_pct}</span>
                    <span style="background:#0f172a;color:#64748b;border-radius:4px;padding:4px 10px;font-size:12px;">{regulation_title[:50] if regulation_title else 'N/A'}</span>
                </div>
                <div style="color:#94a3b8;font-size:13px;">{gap_description}</div>
            </div>
            <div style="text-align:center;margin:24px 0;">
                <a href="{approve_url}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;padding:12px 32px;font-size:14px;font-weight:700;margin-right:12px;">✅ Approve Rewrite</a>
                <a href="{dismiss_url}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;padding:12px 32px;font-size:14px;font-weight:700;">❌ Dismiss</a>
            </div>
            <div style="text-align:center;padding:16px;border-top:1px solid #334155;">
                <p style="color:#475569;font-size:11px;margin:0;">ComplianceBot · {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </div>
    </body>
    </html>
    """
    subject = f"⚠️ HITL Review: {policy_name} — {score_pct} confidence"
    return _send_email(subject, html)
