import { useState, useEffect } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
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
  const [schedule, setSchedule] = useState({ enabled: false, interval_minutes: 60 });
  const [pipelineRuns, setPipelineRuns] = useState([]);
  const [emailSending, setEmailSending] = useState(false);
  const [hitlReviews, setHitlReviews] = useState([]);
  const [approvingId, setApprovingId] = useState(null);

  const addLog = (msg, type = "info") => {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const fetchData = async () => {
    try {
      const [at, gr, cf, po, sc, pr, hr] = await Promise.all([
        fetch(`${BACKEND}/audit-trail`).then(r => r.json()),
        fetch(`${BACKEND}/gap-reports`).then(r => r.json()),
        fetch(`${BACKEND}/conflicts`).then(r => r.json()),
        fetch(`${BACKEND}/policies`).then(r => r.json()),
        fetch(`${BACKEND}/schedule`).then(r => r.json()).catch(() => ({ enabled: false, interval_minutes: 60 })),
        fetch(`${BACKEND}/pipeline-runs`).then(r => r.json()).catch(() => []),
        fetch(`${BACKEND}/hitl-reviews`).then(r => r.json()).catch(() => []),
      ]);
      setAuditTrail(at);
      setGapReports(gr);
      setConflicts(cf);
      setPolicies(po);
      setSchedule(sc);
      setPipelineRuns(pr);
      setHitlReviews(hr);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  const updateSchedule = async (updates) => {
    try {
      const res = await fetch(`${BACKEND}/schedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const data = await res.json();
      setSchedule(data);
    } catch (e) { console.error("Schedule update error:", e); }
  };

  const sendTestEmail = async () => {
    setEmailSending(true);
    try {
      const res = await fetch(`${BACKEND}/send-test-email`, { method: "POST" });
      const data = await res.json();
      alert(data.status === "success" ? "✅ Test email sent!" : `❌ ${data.message}`);
    } catch (e) { alert("❌ Failed to send test email"); }
    setEmailSending(false);
  };

  const approveReview = async (id) => {
    setApprovingId(id);
    try {
      const res = await fetch(`${BACKEND}/hitl-reviews/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        setHitlReviews(prev => prev.map(r => r.id === id ? { ...r, status: "rewritten", rewritten_content: data.rewritten_content } : r));
      } else { alert(`❌ ${data.message}`); }
    } catch (e) { alert("❌ Approve failed"); }
    setApprovingId(null);
  };

  const dismissReview = async (id) => {
    try {
      const res = await fetch(`${BACKEND}/hitl-reviews/${id}/dismiss`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        setHitlReviews(prev => prev.map(r => r.id === id ? { ...r, status: "dismissed" } : r));
      }
    } catch (e) { alert("❌ Dismiss failed"); }
  };

  const pendingReviews = hitlReviews.filter(r => r.status === "pending").length;

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

  const tabs = ["dashboard", "gaps", "audit", "conflicts", "policies", "reviews", "scheduler"];
  const downloadPDF = () => window.open(`${BACKEND}/export-pdf`, "_blank");

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "monospace", padding: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#38bdf8" }}>🤖 ComplianceBot</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>RegWatch — Autonomous Compliance Pipeline</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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
          <button
            onClick={downloadPDF}
            style={{
              background: "#10b981", color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 24px", cursor: "pointer",
              fontSize: 14, fontWeight: 700
            }}
          >
            📄 Export PDF
          </button>
        </div>
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
            {tab === "reviews" ? <span>👁️ Reviews {pendingReviews > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700, marginLeft: 4 }}>{pendingReviews}</span>}</span> : { dashboard: "📊 Dashboard", gaps: `🔍 Gaps (${gapReports.length})`, audit: `📋 Audit Trail (${auditTrail.length})`, conflicts: `⚖️ Conflicts (${conflicts.length})`, policies: `📁 Policies (${policies.length})`, scheduler: "⏰ Scheduler" }[tab]}
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

      {/* Tab: Reviews */}
      {activeTab === "reviews" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {hitlReviews.length === 0 ? (
            <div style={{ background: "#1e293b", borderRadius: 8, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👁️</div>
              <div style={{ color: "#64748b" }}>No reviews pending.</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Low-confidence policies (below 70%) will appear here for human review.</div>
            </div>
          ) : hitlReviews.map(r => (
            <div key={r.id} style={{ background: "#1e293b", borderRadius: 8, padding: 16, borderLeft: `4px solid ${r.status === "pending" ? "#ef4444" : r.status === "rewritten" ? "#10b981" : "#64748b"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{r.policy_name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{r.regulation_title} · {r.jurisdiction}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {confidenceBadge(r.confidence_score)}
                  <span style={{ background: r.status === "pending" ? "#92400e" : r.status === "rewritten" ? "#064e3b" : "#334155", color: r.status === "pending" ? "#fcd34d" : r.status === "rewritten" ? "#10b981" : "#94a3b8", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{r.status}</span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>{r.gap_description}</div>
              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => approveReview(r.id)} disabled={approvingId === r.id} style={{ background: approvingId === r.id ? "#334155" : "#10b981", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", cursor: approvingId === r.id ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700 }}>
                    {approvingId === r.id ? "⏳ Rewriting..." : "✅ Approve Rewrite"}
                  </button>
                  <button onClick={() => dismissReview(r.id)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>❌ Dismiss</button>
                </div>
              )}
              {r.status === "rewritten" && r.rewritten_content && (
                <div style={{ background: "#0f172a", borderRadius: 6, padding: 12, marginTop: 8, border: "1px solid #334155" }}>
                  <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginBottom: 6 }}>✅ AI-REWRITTEN POLICY</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>{r.rewritten_content}</div>
                </div>
              )}
              <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
                Created: {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                {r.resolved_at && ` · Resolved: ${new Date(r.resolved_at).toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Scheduler */}
      {activeTab === "scheduler" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Toggle + Interval */}
          <div style={{ background: "#1e293b", borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#e2e8f0" }}>Auto-Run Pipeline</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Automatically run the compliance pipeline on a schedule</div>
              </div>
              <button onClick={() => updateSchedule({ enabled: !schedule.enabled })} style={{ background: schedule.enabled ? "#10b981" : "#334155", color: "#fff", border: "none", borderRadius: 20, padding: "8px 24px", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "background 0.3s" }}>
                {schedule.enabled ? "● Enabled" : "○ Disabled"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Run every:</span>
              {[{ label: "1 Hour", val: 60 }, { label: "6 Hours", val: 360 }, { label: "12 Hours", val: 720 }, { label: "Daily", val: 1440 }, { label: "Weekly", val: 10080 }].map(opt => (
                <button key={opt.val} onClick={() => updateSchedule({ interval_minutes: opt.val })} style={{ background: schedule.interval_minutes === opt.val ? "#3b82f6" : "#0f172a", color: schedule.interval_minutes === opt.val ? "#fff" : "#64748b", border: "1px solid #334155", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 12, color: "#64748b" }}>
              <span>📅 Last run: {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : "Never"}</span>
              <span>⏭️ Next run: {schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : "Not scheduled"}</span>
            </div>
          </div>

          {/* Email Config */}
          <div style={{ background: "#1e293b", borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>📧 Email Alerts</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Email notifications are sent when compliance gaps are detected</div>
              </div>
              <button onClick={sendTestEmail} disabled={emailSending} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: emailSending ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700 }}>
                {emailSending ? "Sending..." : "Send Test Email"}
              </button>
            </div>
          </div>

          {/* Run History */}
          <div style={{ background: "#1e293b", borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", marginBottom: 12 }}>📋 Pipeline Run History</div>
            {pipelineRuns.length === 0 ? (
              <div style={{ color: "#475569", textAlign: "center", padding: 24 }}>No pipeline runs yet</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: "#64748b", textAlign: "left" }}>
                    {["Time", "Trigger", "Status", "Docs", "Gaps", "Conflicts"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #334155" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pipelineRuns.map(r => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</td>
                      <td style={{ padding: "8px 10px" }}><span style={{ background: r.trigger === "scheduled" ? "#6366f1" : "#3b82f6", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{r.trigger}</span></td>
                      <td style={{ padding: "8px 10px", color: r.status === "complete" ? "#10b981" : r.status === "error" ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>{r.status?.toUpperCase()}</td>
                      <td style={{ padding: "8px 10px", color: "#38bdf8" }}>{r.documents_processed}</td>
                      <td style={{ padding: "8px 10px", color: "#f59e0b" }}>{r.gaps_found}</td>
                      <td style={{ padding: "8px 10px", color: "#a78bfa" }}>{r.conflicts_found}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}