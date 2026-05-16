# 🛡️ ComplianceBot

> An autonomous, AI-driven compliance pipeline that monitors regulatory changes, identifies policy gaps, and automatically drafts updated Standard Operating Procedures (SOPs).

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-f55036?style=for-the-badge)
![Tavily](https://img.shields.io/badge/Tavily-Search_Agent-2294f2?style=for-the-badge)

**🚀 Live Demo**
* Frontend: [https://compliancebot-roan.vercel.app](https://compliancebot-roan.vercel.app)
* Backend: [https://compliancebot-backend-pq1q.onrender.com](https://compliancebot-backend-pq1q.onrender.com)

---

## ✨ Key Features

ComplianceBot utilizes a **6-Agent Swarm** to handle end-to-end regulatory compliance management:

1. **Monitor Agent**: Continuously scans the web and federal registers for new regulatory updates using Tavily API.
2. **Interpreter Agent**: Extracts legal obligations and compliance deadlines using Llama-3.3-70b.
3. **Comparator Agent**: Cross-references new regulations against internal company policies to identify compliance gaps.
4. **Conflict Detector**: Highlights cross-jurisdictional contradictions (e.g., EU GDPR vs US CLOUD Act).
5. **Drafter Agent**: Automatically generates updated policy documents (SOPs) and exports them to PDF/Docx.
6. **Orchestrator Agent**: Manages the pipeline state, coordinates Slack alerts, and creates Jira tickets for remediation.

### 👥 Human-in-the-Loop (HITL)
For AI judgments that fall below an 80% confidence threshold, the system pauses and triggers a **Human-in-the-Loop** review. Compliance officers can review the gap analysis, approve the AI's suggested rewrite, or dismiss the flag directly from the dashboard.

### 🔔 Event-Driven Architecture
The pipeline can be triggered fully autonomously via an external Webhook payload—allowing immediate processing the moment a government API or legal RSS feed detects a change. 

---

## 🛠️ Local Setup Instructions

If you wish to run this project locally:

### 1. Backend (FastAPI)
```bash
# Navigate to the root directory
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file and add your GROQ_API_KEY, TAVILY_API_KEY, etc.

# Start the server
cd backend
uvicorn main:app --reload --port 8001
```

### 2. Frontend (React)
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

---

## 🏆 Hackathon Ready
This project was built rapidly to demonstrate the power of agentic AI workflows in enterprise compliance, emphasizing reliability (HITL), traceability (Audit trails), and actionable output (SOP drafting). 
