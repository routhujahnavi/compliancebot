import os
import requests
from docx import Document
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN")
JIRA_EMAIL = os.getenv("JIRA_EMAIL")
JIRA_URL = os.getenv("JIRA_URL")
JIRA_PROJECT_KEY = os.getenv("JIRA_PROJECT_KEY")

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "../data/")

async def run_drafter(gap_data: dict):
    print("✍️  Agent 4: Drafter creating outputs...")

    gap_report = gap_data.get("gap_report", [])
    title = gap_data.get("title", "Unknown Regulation")
    summary = gap_data.get("summary", "")
    url = gap_data.get("url", "")
    deadlines = gap_data.get("deadlines", [])

    gaps_only = [g for g in gap_report if g["action_needed"]]

    # 1 — Create Word Document
    doc_path = create_word_doc(title, summary, gaps_only, deadlines)

    # 2 — Create Jira Ticket
    jira_key = create_jira_ticket(title, summary, gaps_only, deadlines, url)

    # 3 — Send Slack Message
    send_slack_message(title, summary, gaps_only, jira_key, url)

    print("✅ Drafter done — Word doc, Jira ticket, Slack message created!")

    return {
        "doc_path": doc_path,
        "jira_key": jira_key,
        "gaps_count": len(gaps_only)
    }


def create_word_doc(title, summary, gaps, deadlines):
    doc = Document()

    doc.add_heading("COMPLIANCE SOP UPDATE DRAFT", 0)
    doc.add_heading(f"Regulation: {title}", level=1)

    doc.add_heading("Summary", level=2)
    doc.add_paragraph(summary or "No summary available.")

    doc.add_heading("Identified Gaps", level=2)
    if gaps:
        for i, gap in enumerate(gaps, 1):
            doc.add_paragraph(
                f"{i}. {gap['obligation']}",
                style="List Number"
            )
            doc.add_paragraph(f"   Status: {gap['status']}")
            doc.add_paragraph(f"   Existing Coverage: {gap['matched_section']}")
    else:
        doc.add_paragraph("No gaps found — all obligations are covered.")

    doc.add_heading("Deadlines", level=2)
    if deadlines:
        for d in deadlines:
            doc.add_paragraph(f"• {d['text']}", style="List Bullet")
    else:
        doc.add_paragraph("No specific deadlines identified.")

    doc.add_heading("Recommended Actions", level=2)
    for gap in gaps:
        if gap["status"] == "NO_COVERAGE":
            doc.add_paragraph(
                f"• CREATE new policy section for: {gap['obligation'][:80]}",
                style="List Bullet"
            )
        elif gap["status"] == "PARTIAL_COVERAGE":
            doc.add_paragraph(
                f"• UPDATE existing section: {gap['matched_section'][:80]}",
                style="List Bullet"
            )

    doc.add_paragraph(f"\nGenerated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    filename = f"SOP_Update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
    path = os.path.join(OUTPUT_PATH, filename)
    doc.save(path)
    print(f"📄 Word doc saved: {filename}")
    return path


def create_jira_ticket(title, summary, gaps, deadlines, url):
    deadline_text = deadlines[0]["text"] if deadlines else "No specific deadline"
    gaps_text = "\n".join([f"- {g['obligation']}" for g in gaps[:5]])

    description = {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": f"Regulation: {title}"}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": f"Summary: {summary}"}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": f"Gaps Found:\n{gaps_text}"}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": f"Deadline: {deadline_text}"}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": f"Source: {url}"}]
            }
        ]
    }

    jira_data = {
        "fields": {
            "project": {"key": JIRA_PROJECT_KEY},
            "summary": f"Compliance Update Required: {title[:60]}",
            "description": description,
            "issuetype": {"name": "Task"}
        }
    }

    try:
        response = requests.post(
            f"{JIRA_URL}/rest/api/3/issue",
            json=jira_data,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(JIRA_EMAIL, JIRA_API_TOKEN)
        )
        key = response.json().get("key", "N/A")
        print(f"🎫 Jira ticket created: {key}")
        return key
    except Exception as e:
        print(f"❌ Jira error: {e}")
        return "N/A"


def send_slack_message(title, summary, gaps, jira_key, url):
    gaps_count = len(gaps)
    gap_lines = "\n".join([f"• {g['obligation'][:80]}" for g in gaps[:3]])

    message = {
        "text": (
            f"🚨 *New Compliance Alert*\n\n"
            f"*Regulation:* {title[:80]}\n"
            f"*Summary:* {summary[:200]}\n\n"
            f"*{gaps_count} gaps found:*\n{gap_lines}\n\n"
            f"*Jira Ticket:* {jira_key}\n"
            f"*Source:* {url}"
        )
    }

    try:
        requests.post(SLACK_WEBHOOK_URL, json=message)
        print("💬 Slack message sent!")
    except Exception as e:
        print(f"❌ Slack error: {e}")