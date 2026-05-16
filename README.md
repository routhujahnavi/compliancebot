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

**ComplianceBot** is a fully autonomous, agentic AI platform designed to modernize regulatory compliance for enterprises. By leveraging a specialized multi-agent architecture, the system continuously monitors global regulatory changes, instantly maps them against internal company policies, detects compliance gaps, and automatically drafts updated Standard Operating Procedures (SOPs).

It eliminates the manual overhead of compliance tracking while maintaining strict governance through **Human-in-the-Loop (HITL)** workflows and comprehensive audit trails.

---

## 🌟 Comprehensive Feature List

### 1. Autonomous AI Agent Swarm
A coordinated team of AI agents that handle the entire compliance lifecycle without human intervention:
* **Monitor Agent**: Scans government APIs and legal news feeds (via Tavily) to detect new regulatory publications in real-time.
* **Interpreter Agent**: Uses Llama-3.3-70b to ingest dense legal text and extract structured JSON containing exact obligations, enforcement deadlines, and penalties.
* **Comparator Agent**: Cross-references newly extracted obligations against the vector-indexed database of existing internal company policies to highlight missing coverage.
* **Conflict Detector Agent**: Analyzes multi-national policies to identify cross-jurisdictional contradictions (e.g., EU GDPR vs. US SEC laws).
* **Drafter Agent**: Automatically drafts highly professional, formal policy addendums to remediate identified gaps and exports them to PDF/DOCX.
* **Orchestrator Agent**: Manages the state machine, triggers external alerts, and coordinates the entire pipeline.

### 2. Human-in-the-Loop (HITL) Governance Workflow
AI hallucinations are unacceptable in legal compliance. Every decision made by the AI agents is assigned a **Confidence Score**. 
* If a gap analysis or policy draft scores **below 80%**, the system pauses automation and queues the item in the dashboard.
* Compliance officers can review the exact context, approve the AI's suggested rewrite, or manually dismiss the flag directly from the UI.

### 3. Event-Driven Webhook Automation
External systems (such as government RSS feeds or legal tech APIs) can send a POST request to the `/webhook` endpoint. This autonomously wakes up the Orchestrator agent to process the new regulation in the background, making the system highly reactive.

### 4. Seamless Enterprise Integrations
* **Jira Tracking:** Automatically creates Jira tasks for critical compliance gaps, complete with deadlines and context.
* **Slack Alerts:** Real-time notifications for overdue compliance deadlines or critical cross-jurisdiction conflicts.
* **Automated Email Notifications:** Sends email alerts to the compliance team when Human-in-the-Loop reviews are required.

### 5. Automated Scheduling System
A built-in cron scheduler allows the pipeline to run autonomously at defined intervals (e.g., every 1 hour, 6 hours, or 7 days) without manual intervention, keeping compliance checks running continuously in the background.

---

## 💻 Dashboard Elements & UI

The React frontend provides a comprehensive, beautifully designed control center for compliance officers:

* 🎛️ **Main Dashboard:** Features high-level statistical cards, an animated visual representation of the agent pipeline, and a live-streaming output log to monitor the AI's thought process in real time.
* 🚨 **Gap Reports Panel:** Displays all identified compliance gaps, complete with the AI's confidence badge, missing policy section, jurisdiction, and remaining days until the enforcement deadline.
* 👥 **HITL Reviews Tab:** The queue where human reviewers can read AI-suggested policy rewrites and click "Approve & Rewrite" to execute them into the system.
* ⚔️ **Conflicts Matrix:** A visual mapping of contradictory regulations detected across different countries or jurisdictions.
* 🛡️ **Policies Database:** A clean, searchable view of all active internal company policies, their version history, and whether they were last updated by a human or the AI agent.
* 📜 **Audit Trail:** An immutable, database-backed log of every single action taken by the AI. It records timestamps, the agent responsible, the confidence score, and the exact logical branch taken (essential for external auditors).
* ⏱️ **Scheduler Control:** A dedicated panel to toggle the automated background cron-jobs, test email connectivity, and review the history of past pipeline runs.
* 📥 **PDF Exporting:** One-click generation of beautifully formatted, executive-ready PDF Gap Reports summarizing all current vulnerabilities and conflicts.

---

## 🛠️ Technology Stack

* **Frontend**: React.js, Vanilla CSS (Custom enterprise UI)
* **Backend**: Python, FastAPI, SQLAlchemy, APScheduler
* **Database**: SQLite (Robust relational schema for policies, reports, and logs)
* **AI & LLMs**: Groq API (Llama-3.3-70b-versatile), Tavily API (Search scraping)

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

# Create a .env file based on the required environment variables (API keys)
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
