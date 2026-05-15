import { useState, useEffect } from "react";

const BACKEND = "http://localhost:8000";

const AGENTS = ["Monitor", "Interpreter", "Comparator", "ConflictDetector", "Drafter", "Orchestrator"];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [agentStatus, setAgentStatus] = useState({});
  const [auditTrail, setAuditTrail] = useState([]);
  const [gapReports, setGapReports] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [policies, setPolicies] = useState([]);

  const addLog = (msg, type = "info") => {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const fetchData = async () => {
    try {
      const [at, gr, cf, po] = await Promise.all([
        fetch(`${BACKEND}/audit-trail`).then(r => r.json()),
        fetch(`${BACKEND}/gap-reports`).then(r => r.json()),
        fetch(`${BACKEND}/conflicts`).then(r => r.json()),
        fetch(`${BACKEND}/policies`).then(r => r.json()),
      ]);
      setAuditTrail(at);
      setGapReports(gr);
      setConflicts(cf);
      setPolicies(po);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const runPipeline = async () => {
    setRunning(true);
    setLogs([]);
    setAgentStatus({});
    addLog("🚀 Starting pipeline...", "info");

    const agentSequence = [
      { name: "Monitor", delay: 500 },
      { name: "Interpreter", delay: 1500 },
      { name: "Comparator", delay: 3000 },
      { name: "ConflictDetector", delay: 4500 },
      { name: "Drafter", delay: 6000 },
      { name: "Orchestrator", delay: 7500 },
    ];

    agentSequence.forEach(({ name, delay }) => {
      setTimeout(() => {
        setAgentStatus(prev => ({ ...prev, [name]: "running" }));
        addLog(`⚙️  ${name} agent running...`, "info");
      }, delay);
    });

    try {
      const res = await fetch(`${BACKEND}/run-pipeline-test`, { method: "POST" });
      const data = await res.json();

      AGENTS.forEach(name => setAgentStatus(prev => ({ ...prev, [name]: "done" })));

      if (data.status === "success") {
        setLastResult(data);
        addLog(`✅ Pipeline complete!`, "success");
        addLog(`📋 Obligations: ${data.obligations_found}`, "success");
        addLog(`🔍 Gaps: ${data.gaps_found}`, "success");
        addLog(`⚖️  Conflicts: ${data.conflicts_found ?? 0}`, "success");
        addLog(`🎫 Jira: ${data.jira_key}`, "success");
        if (data.deadline) addLog(`📅 Deadline: ${data.deadline} (${data.days_remaining} days)`, "warning");
        if (data.requires_human_review) addLog("⚠️  Human review required", "warning");
        await fetchData();
      } else {
        addLog(`❌ Pipeline failed: ${data.message}`, "error");
        AGENTS.forEach(name => setAgentStatus(prev => ({ ...prev, [name]: "idle" })));
      }
    } catch (e) {
      addLog("❌ Pipeline failed — check backend", "error");
    }
    setRunning(false);
  };

  const statusColor = (s) => ({
    running: "#f59e0b", done: "#10b981", idle: "#6b7280", "": "#6b7280"
  })[s] || "#6b7280";

  const confidenceBadge = (score) => {
    const pct = Math.round((score ?? 0) * 100);
    const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
    return <span style={{ background: color, color: "#fff", borderRadius: 4, padding: "2px 7px", fontSize: 12, fontWeight: 700 }}>{pct}%</span>;
  };

  const tabs = ["dashboard", "gaps", "audit", "conflicts", "policies"];

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "monospace", padding: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#38bdf8" }}>🤖 ComplianceBot</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>RegWatch — Autonomous Compliance Pipeline</p>
        </div>
        <button
          onClick={runPipeline}
          disabled={running}
          style={{
            background: running ? "#334155" : "#3b82f6",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "10px 24px", cursor: running ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 700
          }}
        >
          {running ? "⏳ Running..." : "▶️ Run Full Pipeline"}
        </button>
      </div>

      {/* Agent Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 24 }}>
        {AGENTS.map(name => (
          <div key={name} style={{
            background: "#1e293b", borderRadius: 8, padding: "12px 8px", textAlign: "center",
            border: `2px solid ${statusColor(agentStatus[name] || "")}`,
            transition: "border-color 0.3s"
          }}>
            <div style={{ fontSize: 20 }}>
              {{ Monitor: "👁️", Interpreter: "📖", Comparator: "🔍", ConflictDetector: "⚖️", Drafter: "✍️", Orchestrator: "🎯" }[name]}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{name}</div>
            <div style={{ fontSize: 10, color: statusColor(agentStatus[name] || ""), marginTop: 2, fontWeight: 700 }}>
              {agentStatus[name] === "running" ? "● RUNNING" : agentStatus[name] === "done" ? "✓ DONE" : "○ IDLE"}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      {lastResult && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Obligations", value: lastResult.obligations_found, color: "#38bdf8" },
            { label: "Gaps Found", value: lastResult.gaps_found, color: "#f59e0b" },
            { label: "Conflicts", value: lastResult.conflicts_found ?? 0, color: "#a78bfa" },
            { label: "Jira Ticket", value: lastResult.jira_key, color: "#10b981" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#1e293b", borderRadius: 8, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? "#3b82f6" : "#1e293b",
            color: activeTab === tab ? "#fff" : "#94a3b8",
            border: "none", borderRadius: 6, padding: "6px 16px",
            cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize"
          }}>
            {{ dashboard: "📊 Dashboard", gaps: `🔍 Gaps (${gapReports.length})`, audit: `📋 Audit Trail (${auditTrail.length})`, conflicts: `⚖️ Conflicts (${conflicts.length})`, policies: `📁 Policies (${policies.length})` }[tab]}
          </button>
        ))}
      </div>

      {/* Tab: Dashboard (Logs) */}
      {activeTab === "dashboard" && (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: 16, minHeight: 300 }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Live Logs</div>
          {logs.length === 0
            ? <div style={{ color: "#475569", textAlign: "center", paddingTop: 40 }}>Click "Run Full Pipeline" to start</div>
            : logs.map((l, i) => (
              <div key={i} style={{
                color: { success: "#10b981", error: "#ef4444", warning: "#f59e0b", info: "#94a3b8" }[l.type],
                fontSize: 13, padding: "2px 0"
              }}>
                <span style={{ color: "#475569", marginRight: 8 }}>{l.time}</span>{l.msg}
              </div>
            ))
          }
        </div>
      )}

      {/* Tab: Gap Reports */}
      {activeTab === "gaps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {gapReports.length === 0
            ? <div style={{ color: "#475569", textAlign: "center", padding: 40 }}>No gap reports yet — run the pipeline</div>
            : gapReports.map(g => (
              <div key={g.id} style={{ background: "#1e293b", borderRadius: 8, padding: 16, borderLeft: "4px solid #f59e0b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{g.gap_description}</div>
                  {confidenceBadge(g.confidence_score)}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>📌 {g.policy_section} · {g.jurisdiction} · {g.regulation_title?.slice(0, 50)}...</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>💡 {g.confidence_reason}</div>
                {g.deadline && <div style={{ fontSize: 12, color: "#f59e0b" }}>📅 Deadline: {g.deadline} · {g.days_remaining >= 0 ? `${g.days_remaining} days remaining` : "Overdue"}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {g.jira_key && <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>🎫 {g.jira_key}</span>}
                  {g.requires_human_review && <span style={{ background: "#92400e", color: "#fcd34d", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>⚠️ Human Review</span>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Tab: Audit Trail */}
      {activeTab === "audit" && (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "#64748b", textAlign: "left" }}>
                {["Time", "Run ID", "Agent", "Action", "Decision", "Confidence", "Branch"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", borderBottom: "1px solid #334155" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditTrail.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "6px 10px", color: "#475569" }}>{e.timestamp?.slice(11, 19)}</td>
                  <td style={{ padding: "6px 10px", color: "#38bdf8" }}>{e.pipeline_run_id}</td>
                  <td style={{ padding: "6px 10px", color: "#a78bfa" }}>{e.agent_name}</td>
                  <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{e.action}</td>
                  <td style={{ padding: "6px 10px", color: "#e2e8f0", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.decision}</td>
                  <td style={{ padding: "6px 10px" }}>{e.confidence != null ? confidenceBadge(e.confidence) : "—"}</td>
                  <td style={{ padding: "6px 10px", color: e.branch_taken === "human_review" ? "#f59e0b" : "#64748b" }}>{e.branch_taken || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Conflicts */}
      {activeTab === "conflicts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {conflicts.length === 0
            ? (
              <div style={{ background: "#1e293b", borderRadius: 8, padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚖️</div>
                <div style={{ color: "#64748b" }}>No cross-jurisdiction conflicts detected yet.</div>
                <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Conflicts appear when regulations from different jurisdictions contradict each other.</div>
              </div>
            )
            : conflicts.map(c => (
              <div key={c.id} style={{ background: "#1e293b", borderRadius: 8, padding: 16, borderLeft: "4px solid #a78bfa" }}>
                <div style={{ fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>
                  🌍 {c.regulation_1_jurisdiction} vs {c.regulation_2_jurisdiction}
                </div>
                <div style={{ fontSize: 13, color: "#e2e8f0", marginBottom: 4 }}>{c.plain_english_explanation}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{c.regulation_1_title} · {c.regulation_2_title}</div>
              </div>
            ))
          }
        </div>
      )}

      {/* Tab: Policies */}
      {activeTab === "policies" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {policies.map(p => (
            <div key={p.id} style={{ background: "#1e293b", borderRadius: 8, padding: 16, borderLeft: `4px solid ${p.updated_by === "ComplianceBot Agent" ? "#10b981" : "#334155"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{p.title} <span style={{ color: "#64748b", fontSize: 12 }}>({p.section})</span></div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>v{p.version}</span>
                  <span style={{ background: "#0f172a", color: "#64748b", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{p.jurisdiction}</span>
                  {p.updated_by === "ComplianceBot Agent" && <span style={{ background: "#064e3b", color: "#10b981", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>🤖 Auto-updated</span>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", maxHeight: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{p.content?.slice(0, 300)}...</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>Last updated: {p.last_updated?.slice(0, 10)} by {p.updated_by}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
