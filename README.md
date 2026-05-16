<div align="center">
  <div style="background: #185FA5; display: inline-block; padding: 12px; border-radius: 12px; margin-bottom: 16px;">
    <img src="https://img.icons8.com/color/96/000000/shield-check.png" alt="Logo" width="60"/>
  </div>
  <h1>ComplianceBot</h1>
  <p><strong>Enterprise-Grade AI Regulatory Compliance & Automation Pipeline</strong></p>

  <p>
    <a href="https://compliancebot-roan.vercel.app" target="_blank">View Live Dashboard</a> ·
    <a href="https://compliancebot-backend-pq1q.onrender.com" target="_blank">Backend API</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
    <img src="https://img.shields.io/badge/Groq-Llama_3.3_70B-f55036?style=for-the-badge" alt="Groq" />
  </p>
</div>

---

## 📑 Overview

**ComplianceBot** is a fully autonomous, agentic AI platform designed to modernize regulatory compliance for modern enterprises. By leveraging a specialized multi-agent architecture, the system continuously monitors global regulatory changes, instantly maps them against internal company policies, detects compliance gaps, and automatically drafts updated Standard Operating Procedures (SOPs).

It eliminates the manual overhead of compliance tracking while maintaining strict governance through **Human-in-the-Loop (HITL)** workflows and comprehensive audit trails.

---

## 🌟 Comprehensive Feature List

Here is exactly what ComplianceBot is capable of doing autonomously:

1. **The 6-Agent Swarm Pipeline**: A coordinated team of AI agents (Monitor, Interpreter, Comparator, Conflict Detector, Drafter, Orchestrator) that handle the entire compliance lifecycle from discovery to drafting.
2. **Automated Regulatory Monitoring**: Scans government APIs and legal news feeds to detect new regulatory publications in real-time.
3. **Obligation Extraction (Llama-3.3-70b)**: Ingests dense legal text and extracts structured data containing exact obligations, enforcement deadlines, and penalties.
4. **Internal Policy Gap Analysis**: Instantly cross-references newly extracted obligations against existing internal company policies to highlight missing compliance coverage.
5. **Cross-Jurisdictional Conflict Detection**: Analyzes multi-national policies to identify contradictions (e.g., EU GDPR's "Right to Erasure" vs. US SEC Data Retention laws).
6. **Automated SOP Drafting**: Automatically drafts highly professional, formal policy addendums to remediate identified gaps.
7. **PDF & DOCX Exports**: One-click generation of beautifully formatted, executive-ready Gap Reports and updated SOP documents.
8. **Human-in-the-Loop (HITL) Governance**: If the AI's confidence drops below 80%, the system pauses automation and queues the item for a human compliance officer to approve, rewrite, or dismiss.
9. **Event-Driven Webhook Automation**: External systems can send a webhook payload to instantly trigger the pipeline without human intervention.
10. **Jira Issue Tracking Integration**: Automatically creates Jira tasks for critical compliance gaps, complete with context and deadlines.
11. **Slack & Email Alerting**: Real-time notifications sent to compliance teams when urgent reviews are needed or gaps are found.
12. **Permanent Audit Trail**: Every AI decision, confidence score, and branch logic is immutably logged for external auditors.
13. **Automated Background Scheduler**: Configurable interval-based execution to run compliance checks autonomously on a defined schedule.

---

## 🧠 The 6-Agent Swarm Architecture Deep Dive

| Agent | Core Function | Technical Details |
| :--- | :--- | :--- |
| 👁️ **Monitor** | **Regulatory Surveillance** | Scans government APIs, federal registers, and legal news feeds (via Tavily) to detect new regulatory publications in real-time. |
| ⚡ **Interpreter** | **Obligation Extraction** | Uses Llama-3.3-70b to ingest dense legal text and extract structured JSON. |
| 🔍 **Comparator** | **Gap Analysis** | Cross-references newly extracted obligations against the database of existing internal company policies. |
| ⚖️ **Conflict Detector** | **Jurisdiction Checking** | Highlights cross-jurisdictional contradictions. |
| ✍️ **Drafter** | **SOP Generation** | Drafts formal policy addendums and exports to PDF/DOCX. |
| 🎛️ **Orchestrator** | **System Coordination** | Manages the state machine, triggers Slack alerts, opens Jira remediation tickets, and maintains the audit log. |

---

## 🔑 API Keys & Environment Variables (For Judges/Reviewers)

To run this project locally, you will need the following API keys. Create a `.env` file in the root directory and add:

```env
# AI Models & Agents
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# Integrations (Slack & Jira)
SLACK_WEBHOOK_URL=your_slack_webhook_here
JIRA_API_TOKEN=your_jira_token_here
JIRA_EMAIL=your_jira_email_here
JIRA_URL=https://your_domain.atlassian.net
JIRA_PROJECT_KEY=COM

# Email Alerts
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_FROM=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_RECIPIENTS=recipient@gmail.com

# System
WEBHOOK_SECRET=compliancebot-secret
```

*(Note to Judges: Please refer to the Devpost submission or private project notes for the live testing credentials, as they have been removed from the public repository for security.)*

---

## ⚙️ Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/routhujahnavi/compliancebot.git
cd compliancebot
```

### 2. Backend Initialization
```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required Python packages
pip install -r requirements.txt

# Start the FastAPI backend server
cd backend
uvicorn main:app --reload --port 8001
```

### 3. Frontend Initialization
```bash
# Open a new terminal and navigate to the frontend folder
cd frontend

# Install Node modules
npm install

# Start the React development server
npm start
```
The application will be accessible at `http://localhost:3000`.

---
*Built to ensure regulatory peace of mind.*
