import { useState } from "react";

const BACKEND = "http://192.168.137.155:8000";

const agents = [
  { id: 1, name: "Monitor", icon: "🔍", desc: "Watches regulatory sources" },
  { id: 2, name: "Interpreter", icon: "📖", desc: "Extracts obligations from laws" },
  { id: 3, name: "Comparator", icon: "⚖️", desc: "Finds gaps in your SOPs" },
  { id: 4, name: "Drafter", icon: "✍️", desc: "Writes SOP updates + Jira + Slack" },
  { id: 5, name: "Orchestrator", icon: "🤖", desc: "Manages all agents" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [topic, setTopic] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [agentStates, setAgentStates] = useState({1:"idle",2:"idle",3:"idle",4:"idle",5:"idle"});
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  const checkCompliance = async () => {
    if (!topic) return;
    setLoadingAnalysis(true);
    setAnalysis("");
    try {
      const res = await fetch(`${BACKEND}/check-compliance?topic=${encodeURIComponent(topic)}`, { method: "POST" });
      const data = await res.json();
      setAnalysis(data.analysis);
      addLog(`✅ Compliance analysis done for: ${topic}`);
    } catch {
      setAnalysis("Error connecting to backend.");
      addLog("❌ Backend connection failed");
    }
    setLoadingAnalysis(false);
  };

  const runPipeline = async () => {
    setLoadingPipeline(true);
    setPipelineStatus(null);
    setAgentStates({1:"idle",2:"idle",3:"idle",4:"idle",5:"idle"});
    setLogs([]);

    addLog("🤖 Orchestrator starting pipeline...");
    setAgentStates(s => ({...s, 5:"running"}));
    await sleep(500);

    addLog("🔍 Agent 1: Monitor scanning RSS feeds...");
    setAgentStates(s => ({...s, 1:"running"}));
    await sleep(1000);
    setAgentStates(s => ({...s, 1:"done"}));
    addLog("✅ Monitor: test document loaded");

    addLog("📖 Agent 2: Interpreter extracting obligations...");
    setAgentStates(s => ({...s, 2:"running"}));
    await sleep(1000);

    try {
      const res = await fetch(`${BACKEND}/run-pipeline-test`, { method: "POST" });
      const data = await res.json();

      setAgentStates(s => ({...s, 2:"done"}));
      addLog(`✅ Interpreter: ${data.obligations_found} obligations found`);

      setAgentStates(s => ({...s, 3:"running"}));
      addLog("⚖️  Agent 3: Comparator finding gaps...");
      await sleep(800);
      setAgentStates(s => ({...s, 3:"done"}));
      addLog(`✅ Comparator: ${data.gaps_found} gaps found`);

      setAgentStates(s => ({...s, 4:"running"}));
      addLog("✍️  Agent 4: Drafter creating outputs...");
      await sleep(800);
      setAgentStates(s => ({...s, 4:"done"}));
      addLog(`✅ Drafter: Jira ${data.jira_key} created + Slack sent`);

      setAgentStates(s => ({...s, 5:"done"}));
      addLog("🎯 Pipeline complete!");

      if (data.requires_human_review) {
        addLog("⚠️  Human review required — Slack alert sent!");
      }

      setPipelineStatus(data);
    } catch {
      addLog("❌ Pipeline failed — check backend");
      setAgentStates({1:"idle",2:"idle",3:"idle",4:"idle",5:"idle"});
    }
    setLoadingPipeline(false);
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const stateColor = { idle: "#94a3b8", running: "#f59e0b", done: "#22c55e" };
  const stateLabel = { idle: "Idle", running: "Running...", done: "Done ✓" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#e2e8f0", fontFamily: "Arial" }}>

      {/* Header */}
      <div style={{ backgroundColor: "#1e293b", padding: "16px 32px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>🤖</span>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#38bdf8" }}>ComplianceBot</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>AI-Powered Regulatory Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {["dashboard", "analyze", "logs"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", textTransform: "capitalize",
              backgroundColor: activeTab === tab ? "#38bdf8" : "#334155",
              color: activeTab === tab ? "#0f172a" : "#94a3b8"
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div>
            <h2 style={{ color: "#38bdf8", marginBottom: "8px" }}>Agent Pipeline Dashboard</h2>
            <p style={{ color: "#64748b", marginBottom: "32px" }}>Monitor all 5 AI agents in real-time</p>

            {/* Agent Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "32px" }}>
              {agents.map(agent => (
                <div key={agent.id} style={{
                  backgroundColor: "#1e293b", borderRadius: "12px", padding: "16px", textAlign: "center",
                  border: `2px solid ${agentStates[agent.id] === "running" ? "#f59e0b" : agentStates[agent.id] === "done" ? "#22c55e" : "#334155"}`,
                  transition: "all 0.3s"
                }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>{agent.icon}</div>
                  <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>{agent.name}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "10px" }}>{agent.desc}</div>
                  <div style={{
                    fontSize: "11px", fontWeight: "bold", padding: "3px 8px", borderRadius: "20px", display: "inline-block",
                    backgroundColor: agentStates[agent.id] === "running" ? "#78350f" : agentStates[agent.id] === "done" ? "#14532d" : "#1e293b",
                    color: stateColor[agentStates[agent.id]]
                  }}>{stateLabel[agentStates[agent.id]]}</div>
                </div>
              ))}
            </div>

            {/* Run Button */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <button onClick={runPipeline} disabled={loadingPipeline} style={{
                padding: "14px 48px", fontSize: "16px", fontWeight: "bold", borderRadius: "10px", border: "none", cursor: loadingPipeline ? "not-allowed" : "pointer",
                backgroundColor: loadingPipeline ? "#334155" : "#38bdf8", color: loadingPipeline ? "#64748b" : "#0f172a"
              }}>
                {loadingPipeline ? "⏳ Pipeline Running..." : "▶️ Run Full Pipeline"}
              </button>
            </div>

            {/* Result Cards */}
            {pipelineStatus && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
                {[
                  { label: "Obligations Found", value: pipelineStatus.obligations_found, color: "#38bdf8" },
                  { label: "Gaps Detected", value: pipelineStatus.gaps_found, color: "#f87171" },
                  { label: "Jira Ticket", value: pipelineStatus.jira_key, color: "#a78bfa" },
                  { label: "Human Review", value: pipelineStatus.requires_human_review ? "⚠️ Yes" : "✅ No", color: pipelineStatus.requires_human_review ? "#f59e0b" : "#22c55e" },
                ].map(card => (
                  <div key={card.label} style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", textAlign: "center", border: "1px solid #334155" }}>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: card.color }}>{card.value}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>{card.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Live Logs */}
            {logs.length > 0 && (
              <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
                <div style={{ fontWeight: "bold", color: "#38bdf8", marginBottom: "12px" }}>📋 Live Logs</div>
                {logs.map((log, i) => (
                  <div key={i} style={{ fontSize: "13px", color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #0f172a" }}>{log}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYZE TAB */}
        {activeTab === "analyze" && (
          <div>
            <h2 style={{ color: "#38bdf8", marginBottom: "8px" }}>Quick Compliance Analysis</h2>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>Enter any compliance topic for instant AI analysis</p>
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && checkCompliance()}
                placeholder="e.g. GDPR data privacy, HIPAA healthcare, RBI lending rules"
                style={{
                  flex: 1, padding: "12px 16px", fontSize: "15px", borderRadius: "10px",
                  border: "2px solid #334155", backgroundColor: "#1e293b", color: "#e2e8f0", outline: "none"
                }}
              />
              <button onClick={checkCompliance} disabled={loadingAnalysis} style={{
                padding: "12px 28px", fontSize: "15px", fontWeight: "bold", borderRadius: "10px", border: "none", cursor: "pointer",
                backgroundColor: "#38bdf8", color: "#0f172a"
              }}>
                {loadingAnalysis ? "Analyzing..." : "Analyze"}
              </button>
            </div>
            {analysis && (
              <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px", border: "1px solid #334155", whiteSpace: "pre-wrap", lineHeight: "1.7", color: "#cbd5e1" }}>
                <div style={{ fontWeight: "bold", color: "#38bdf8", marginBottom: "12px" }}>📋 Analysis Result</div>
                {analysis}
              </div>
            )}
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === "logs" && (
          <div>
            <h2 style={{ color: "#38bdf8", marginBottom: "8px" }}>System Logs</h2>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>All agent activity from this session</p>
            <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155", minHeight: "300px" }}>
              {logs.length === 0
                ? <div style={{ color: "#475569", textAlign: "center", marginTop: "80px" }}>No logs yet — run the pipeline from the Dashboard tab</div>
                : logs.map((log, i) => (
                  <div key={i} style={{ fontSize: "13px", color: "#94a3b8", padding: "5px 0", borderBottom: "1px solid #0f172a", fontFamily: "monospace" }}>{log}</div>
                ))
              }
            </div>
          </div>
        )}

      </div>
    </div>
  );
}