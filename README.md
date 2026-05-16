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

### 🌟 Core System Highlights
* ✅ **The 6-Agent Swarm Pipeline** (Monitor, Interpreter, Comparator, Conflict Detector, Drafter, Orchestrator)
* ✅ **Human-in-the-Loop (HITL) Dashboard** (For reviewing low-confidence AI decisions)
* ✅ **Automated SOP Drafting & PDF/Docx Exports**
* ✅ **Cross-Jurisdictional Conflict Detection** (e.g., EU vs US regulations)
* ✅ **Jira & Slack Integrations** (For alerting and remediation task creation)
* ✅ **Event-Driven Webhook Automation** (Instantly reacts to external policy triggers)
* ✅ **Permanent Audit Trail** (For immutable regulatory tracking and provenance)
* ✅ **Automated Scheduler** (Cron-based autonomous background scanning)

---

## 🧠 The 6-Agent Swarm Architecture

At the core of ComplianceBot is a deeply integrated pipeline of six specialized AI agents, each strictly scoped to handle a specific phase of the compliance lifecycle.

| Agent | Core Function | Technical Details |
| :--- | :--- | :--- |
| 👁️ **Monitor** | **Regulatory Surveillance** | Scans government APIs, federal registers, and legal news feeds (via Tavily) to detect new regulatory publications in real-time. |
| ⚡ **Interpreter** | **Obligation Extraction** | Uses Llama-3.3-70b to ingest dense legal text and extract structured JSON containing exact obligations, jurisdictions, enforcement deadlines, and penalties. |
| 🔍 **Comparator** | **Gap Analysis** | Cross-references newly extracted obligations against the vector-indexed database of existing internal company policies to highlight missing compliance coverage. |
| ⚖️ **Conflict Detector** | **Jurisdiction Checking** | Analyzes multi-national policies to identify cross-jurisdictional contradictions (e.g., EU GDPR "Right to be Forgotten" vs. US SEC Data Retention laws). |
| ✍️ **Drafter** | **SOP Generation** | Automatically drafts highly professional, formal policy addendums to remediate identified gaps. Exports final policies to perfectly formatted PDF and DOCX files. |
| 🎛️ **Orchestrator** | **System Coordination** | Manages the state machine, triggers Slack alerts, opens Jira remediation tickets, and maintains the immutable audit log. |

---

## 🚀 Core Features & Capabilities

### 🔄 Event-Driven Webhook Automation
The pipeline operates on a fully reactive, event-driven architecture. External systems (such as government RSS feeds or legal tech APIs) can send a POST request to our `/webhook` endpoint, which autonomously wakes up the Orchestrator agent to process the new regulation in the background without any manual human trigger.

### 🛡️ Human-in-the-Loop (HITL) Governance
AI hallucinations are unacceptable in legal compliance. Every decision made by the AI agents is assigned a **Confidence Score**. 
* If a gap analysis or policy draft scores **below 80%**, the system pauses automation and queues the item in the "HITL Reviews" dashboard.
* Compliance officers are instantly alerted via Slack/Email.
* Officers can review the exact context, approve the AI's suggested rewrite, or manually dismiss the flag directly from the UI.

### 📊 Comprehensive Audit Trail
Every action taken by an AI agent is permanently logged in the SQLite database. The audit trail records the exact prompt timestamp, the agent responsible, the LLM confidence score, and the specific branch logic taken (e.g., auto-approved vs. routed to human). This ensures total transparency for external auditors.

### 🖇️ Seamless Enterprise Integrations
* **Jira Tracking:** Automatically creates Jira tasks for critical compliance gaps, complete with deadlines and context.
* **Slack & Email Alerts:** Real-time notifications for overdue compliance deadlines or critical cross-jurisdiction conflicts.
* **PDF Reporting:** One-click generation of beautifully formatted, executive-ready Gap Reports directly from the dashboard.

---

## 💻 Technology Stack

### Frontend
* **React.js**: Highly responsive, dynamic Single Page Application.
* **Vanilla CSS**: Custom-built, premium, enterprise-grade UI design featuring micro-animations, glassmorphism, and a robust status-tracking dashboard.

### Backend
* **Python / FastAPI**: High-performance, asynchronous REST API serving as the backbone of the agent orchestration.
* **SQLite / SQLAlchemy**: Lightweight, robust relational database handling policy schemas, gap reports, and audit logs.
* **APScheduler**: Manages automated cron-jobs for routine compliance scans.

### Artificial Intelligence
* **Groq API**: Powering ultra-low latency inference using the `llama-3.3-70b-versatile` model.
* **Tavily API**: Specialized search agent for precise regulatory web scraping.

---

## ⚙️ Local Development Setup

To run ComplianceBot locally on your machine, follow these instructions:

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

# Environment Variables
# Create a .env file in the root directory with the following keys:
# GROQ_API_KEY=your_key
# TAVILY_API_KEY=your_key
# SLACK_WEBHOOK_URL=your_webhook
# JIRA_API_TOKEN=your_token
# JIRA_EMAIL=your_email
# JIRA_URL=your_jira_url
# JIRA_PROJECT_KEY=YOURKEY

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
