import { useState, useEffect, useRef } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const AGENTS = ["Monitor", "Interpreter", "Comparator", "ConflictDetector", "Drafter", "Orchestrator"];

const AGENT_META = {
  Monitor:         { icon: "👁",  color: "#6366f1", desc: "Watches regulations" },
  Interpreter:     { icon: "📖", color: "#8b5cf6", desc: "Parses obligations" },
  Comparator:      { icon: "🔍", color: "#0ea5e9", desc: "Gaps analysis" },
  ConflictDetector:{ icon: "⚖️",  color: "#f59e0b", desc: "Cross-jurisdiction" },
  Drafter:         { icon: "✍️",  color: "#10b981", desc: "SOP generation" },
  Orchestrator:    { icon: "🎯", color: "#ef4444", desc: "Coordination" },
};

const NAV = [
  { id: "dashboard",  label: "Dashboard",    icon: "⚡" },
  { id: "gaps",       label: "Gap Reports",  icon: "🔍" },
  { id: "reviews",    label: "Reviews",      icon: "👁" },
  { id: "conflicts",  label: "Conflicts",    icon: "⚖️" },
  { id: "policies",   label: "Policies",     icon: "📁" },
  { id: "audit",      label: "Audit Trail",  icon: "📋" },
  { id: "scheduler",  label: "Scheduler",    icon: "⏰" },
];

export default function App() {
  const [activeTab, setActiveTab]     = useState("dashboard");
  const [running, setRunning]         = useState(false);
  const [logs, setLogs]               = useState([]);
  const [lastResult, setLastResult]   = useState(null);
  const [agentStatus, setAgentStatus] = useState({});
  const [auditTrail, setAuditTrail]   = useState([]);
  const [gapReports, setGapReports]   = useState([]);
  const [conflicts, setConflicts]     = useState([]);
  const [policies, setPolicies]       = useState([]);
  const [schedule, setSchedule]       = useState({ enabled: false, interval_minutes: 360 });
  const [pipelineRuns, setPipelineRuns] = useState([]);
  const [emailSending, setEmailSending] = useState(false);
  const [hitlReviews, setHitlReviews] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const logsEndRef = useRef(null);

  const addLog = (msg, type = "info") =>
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);

  const fetchData = async () => {
    try {
      const [at, gr, cf, po, sc, pr, hr] = await Promise.all([
        fetch(`${BACKEND}/audit-trail`).then(r => r.json()),
        fetch(`${BACKEND}/gap-reports`).then(r => r.json()),
        fetch(`${BACKEND}/conflicts`).then(r => r.json()),
        fetch(`${BACKEND}/policies`).then(r => r.json()),
        fetch(`${BACKEND}/schedule`).then(r => r.json()).catch(() => ({ enabled: false, interval_minutes: 360 })),
        fetch(`${BACKEND}/pipeline-runs`).then(r => r.json()).catch(() => []),
        fetch(`${BACKEND}/hitl-reviews`).then(r => r.json()).catch(() => []),
      ]);
      setAuditTrail(at); setGapReports(gr); setConflicts(cf);
      setPolicies(po); setSchedule(sc); setPipelineRuns(pr); setHitlReviews(hr);
    } catch (e) { console.error(e); }
  };

  const updateSchedule = async (updates) => {
    try {
      const res = await fetch(`${BACKEND}/schedule`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      setSchedule(await res.json());
    } catch (e) { console.error(e); }
  };

  const sendTestEmail = async () => {
    setEmailSending(true);
    try {
      const res = await fetch(`${BACKEND}/send-test-email`, { method: "POST" });
      const data = await res.json();
      alert(data.status === "success" ? "✅ Test email sent!" : `❌ ${data.message}`);
    } catch { alert("❌ Failed"); }
    setEmailSending(false);
  };

  const approveReview = async (id) => {
    setApprovingId(id);
    try {
      const res = await fetch(`${BACKEND}/hitl-reviews/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success")
        setHitlReviews(prev => prev.map(r => r.id === id ? { ...r, status: "rewritten", rewritten_content: data.rewritten_content } : r));
    } catch { alert("❌ Approve failed"); }
    setApprovingId(null);
  };

  const dismissReview = async (id) => {
    try {
      const res = await fetch(`${BACKEND}/hitl-reviews/${id}/dismiss`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success")
        setHitlReviews(prev => prev.map(r => r.id === id ? { ...r, status: "dismissed" } : r));
    } catch { alert("❌ Dismiss failed"); }
  };

  const pendingReviews = hitlReviews.filter(r => r.status === "pending").length;

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const runPipeline = async () => {
    setRunning(true); setLogs([]); setAgentStatus({});
    addLog("Initialising pipeline…", "info");
    const seq = [
      { name: "Monitor", delay: 400 },
      { name: "Interpreter", delay: 1200 },
      { name: "Comparator", delay: 2400 },
      { name: "ConflictDetector", delay: 3600 },
      { name: "Drafter", delay: 5000 },
      { name: "Orchestrator", delay: 6400 },
    ];
    seq.forEach(({ name, delay }) => setTimeout(() => {
      setAgentStatus(prev => ({ ...prev, [name]: "running" }));
      addLog(`${name} agent processing…`, "info");
    }, delay));
    try {
      const res = await fetch(`${BACKEND}/run-pipeline-test`, { method: "POST" });
      const data = await res.json();
      AGENTS.forEach(name => setAgentStatus(prev => ({ ...prev, [name]: "done" })));
      if (data.status === "success") {
        setLastResult(data);
        addLog("Pipeline completed successfully", "success");
        addLog(`Obligations extracted: ${data.obligations_found}`, "success");
        addLog(`Compliance gaps identified: ${data.gaps_found}`, "success");
        addLog(`Jurisdiction conflicts: ${data.conflicts_found ?? 0}`, data.conflicts_found ? "warning" : "success");
        addLog(`Jira ticket created: ${data.jira_key}`, "success");
        if (data.deadline) addLog(`Deadline: ${data.deadline} · ${data.days_remaining} days remaining`, "warning");
        if (data.requires_human_review) addLog("Human review required for low-confidence items", "warning");
        await fetchData();
      } else {
        addLog(`Pipeline error: ${data.message}`, "error");
        AGENTS.forEach(name => setAgentStatus(prev => ({ ...prev, [name]: "idle" })));
      }
    } catch { addLog("Connection failed — check backend is running", "error"); }
    setRunning(false);
  };

  const downloadPDF = () => window.open(`${BACKEND}/export-pdf`, "_blank");

  const confColor = (score) => {
    const p = Math.round((score ?? 0) * 100);
    return p >= 80 ? "#10b981" : p >= 60 ? "#f59e0b" : "#ef4444";
  };

  const ConfBadge = ({ score }) => {
    const p = Math.round((score ?? 0) * 100);
    const c = confColor(score);
    return (
      <span style={{
        background: c + "20", color: c,
        border: `1px solid ${c}40`,
        borderRadius: 20, padding: "2px 10px",
        fontSize: 11, fontWeight: 700, letterSpacing: "0.05em"
      }}>{p}%</span>
    );
  };

  const StatusDot = ({ status }) => {
    const c = { running: "#f59e0b", done: "#10b981", idle: "#334155" }[status] || "#334155";
    const pulse = status === "running";
    return (
      <span style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        background: c, marginRight: 6,
        boxShadow: pulse ? `0 0 0 3px ${c}30` : "none",
        animation: pulse ? "pulse 1s infinite" : "none",
      }} />
    );
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #070b14; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
    @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0px rgba(245,158,11,0.4); } 50% { box-shadow: 0 0 0 5px rgba(245,158,11,0); } }
    @keyframes slideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .log-entry { animation: slideIn 0.2s ease; }
    .card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .tab-btn { transition: all 0.15s ease; }
    .tab-btn:hover { background: rgba(255,255,255,0.05) !important; }
    .nav-item { transition: all 0.15s ease; cursor: pointer; }
    .nav-item:hover { background: rgba(255,255,255,0.05) !important; }
    .agent-card { transition: all 0.3s ease; }
    .btn-primary { transition: all 0.15s ease; }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
    .btn-primary:active:not(:disabled) { transform: translateY(0); }
    .progress-ring { transition: stroke-dashoffset 0.8s ease; }
  `;

  const sideW = sidebarOpen ? 220 : 64;

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", height: "100vh", background: "#070b14", fontFamily: "'Syne', sans-serif", color: "#e2e8f0", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: sideW, minWidth: sideW, background: "#0d1525",
          borderRight: "1px solid #1a2540",
          display: "flex", flexDirection: "column",
          transition: "width 0.25s ease, min-width 0.25s ease",
          overflow: "hidden", position: "relative", zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{ padding: "20px 16px", borderBottom: "1px solid #1a2540", display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div style={{
              width: 36, height: 36, minWidth: 36,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: 10, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 18
            }}>🤖</div>
            {sidebarOpen && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", whiteSpace: "nowrap" }}>ComplianceBot</div>
                <div style={{ fontSize: 10, color: "#475569", whiteSpace: "nowrap", marginTop: 1 }}>RegWatch AI</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto", overflowX: "hidden" }}>
            {NAV.map(item => {
              const isActive = activeTab === item.id;
              const badge = item.id === "reviews" && pendingReviews > 0 ? pendingReviews : null;
              return (
                <div key={item.id} className="nav-item" onClick={() => setActiveTab(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px", borderRadius: 8, marginBottom: 2,
                    background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                    borderLeft: isActive ? "2px solid #6366f1" : "2px solid transparent",
                  }}>
                  <span style={{ fontSize: 16, minWidth: 20, textAlign: "center" }}>{item.icon}</span>
                  {sidebarOpen && (
                    <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? "#a5b4fc" : "#64748b", whiteSpace: "nowrap", flex: 1 }}>
                      {item.label}
                    </span>
                  )}
                  {sidebarOpen && badge && (
                    <span style={{ background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                      {badge}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Toggle */}
          <div style={{ padding: "12px 8px", borderTop: "1px solid #1a2540" }}>
            <div className="nav-item" onClick={() => setSidebarOpen(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8 }}>
              <span style={{ fontSize: 16, minWidth: 20, textAlign: "center" }}>{sidebarOpen ? "◀" : "▶"}</span>
              {sidebarOpen && <span style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>Collapse</span>}
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Topbar */}
          <header style={{
            padding: "14px 28px", borderBottom: "1px solid #1a2540",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#0d1525", flexShrink: 0,
          }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                {NAV.find(n => n.id === activeTab)?.icon} {NAV.find(n => n.id === activeTab)?.label}
              </h1>
              <p style={{ fontSize: 12, color: "#475569", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                Autonomous Compliance Pipeline · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-primary" onClick={downloadPDF}
                style={{ background: "#0f2218", color: "#10b981", border: "1px solid #10b98130", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                📄 Export PDF
              </button>
              <button className="btn-primary" onClick={runPipeline} disabled={running}
                style={{
                  background: running ? "#1e293b" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: running ? "#64748b" : "#fff",
                  border: "none", borderRadius: 8, padding: "9px 22px",
                  cursor: running ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
                  boxShadow: running ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
                }}>
                {running ? "⏳ Running…" : "▶ Run Pipeline"}
              </button>
            </div>
          </header>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

            {/* ── DASHBOARD ── */}
            {activeTab === "dashboard" && (
              <div>
                {/* Agent Pipeline */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                    — Agent Pipeline
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12 }}>
                    {AGENTS.map((name, i) => {
                      const s = agentStatus[name] || "idle";
                      const meta = AGENT_META[name];
                      return (
                        <div key={name} className="agent-card" style={{
                          background: "#0d1525",
                          border: `1px solid ${s === "done" ? meta.color + "60" : s === "running" ? meta.color + "80" : "#1a2540"}`,
                          borderRadius: 12, padding: "16px 12px", textAlign: "center",
                          position: "relative", overflow: "hidden",
                        }}>
                          {s === "running" && (
                            <div style={{
                              position: "absolute", top: 0, left: 0, right: 0, height: 2,
                              background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
                              animation: "shimmer 1.5s infinite",
                              backgroundSize: "200% 100%",
                            }} />
                          )}
                          {/* Step number */}
                          <div style={{ fontSize: 9, color: "#334155", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>0{i+1}</div>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>{meta.icon}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: s === "done" ? meta.color : s === "running" ? "#fff" : "#475569" }}>{name}</div>
                          <div style={{ fontSize: 10, color: "#334155", marginTop: 2, lineHeight: 1.3 }}>{meta.desc}</div>
                          <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <StatusDot status={s} />
                            <span style={{ fontSize: 9, color: s === "done" ? "#10b981" : s === "running" ? "#f59e0b" : "#334155", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                              {s === "running" ? "ACTIVE" : s === "done" ? "DONE" : "IDLE"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                {lastResult && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
                    {[
                      { label: "Obligations", value: lastResult.obligations_found, accent: "#6366f1", icon: "📌" },
                      { label: "Gaps Found",  value: lastResult.gaps_found,        accent: "#f59e0b", icon: "🔍" },
                      { label: "Conflicts",   value: lastResult.conflicts_found ?? 0, accent: "#a78bfa", icon: "⚖️" },
                      { label: "Jira Ticket", value: lastResult.jira_key,          accent: "#10b981", icon: "🎫" },
                    ].map(({ label, value, accent, icon }) => (
                      <div key={label} className="card-hover" style={{
                        background: "#0d1525", border: `1px solid ${accent}30`,
                        borderRadius: 12, padding: "18px 20px",
                        borderTop: `3px solid ${accent}`,
                      }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: accent, letterSpacing: "-0.03em" }}>{value}</div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Logs */}
                <div style={{ background: "#0d1525", border: "1px solid #1a2540", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a2540", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: running ? "#10b981" : "#334155", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live Logs</span>
                    {running && <span style={{ fontSize: 10, color: "#10b981", fontFamily: "'JetBrains Mono',monospace" }}>● STREAMING</span>}
                  </div>
                  <div style={{ padding: 16, minHeight: 200, maxHeight: 320, overflowY: "auto", fontFamily: "'JetBrains Mono', monospace" }}>
                    {logs.length === 0 ? (
                      <div style={{ color: "#1e293b", textAlign: "center", paddingTop: 60, fontSize: 13 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>▶</div>
                        Run the pipeline to see live output
                      </div>
                    ) : logs.map((l, i) => (
                      <div key={i} className="log-entry" style={{ display: "flex", gap: 12, padding: "3px 0", fontSize: 12 }}>
                        <span style={{ color: "#334155", minWidth: 70 }}>{l.time}</span>
                        <span style={{ color: { success: "#10b981", error: "#ef4444", warning: "#f59e0b", info: "#64748b" }[l.type] }}>
                          {l.type === "success" ? "✓" : l.type === "error" ? "✗" : l.type === "warning" ? "⚠" : "›"}
                        </span>
                        <span style={{ color: { success: "#d1fae5", error: "#fecaca", warning: "#fef3c7", info: "#94a3b8" }[l.type], flex: 1 }}>{l.msg}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>
            )}

            {/* ── GAPS ── */}
            {activeTab === "gaps" && (
              <div>
                <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  — {gapReports.length} compliance gap{gapReports.length !== 1 ? "s" : ""} detected
                </div>
                {gapReports.length === 0 ? (
                  <EmptyState icon="🔍" title="No gaps detected" sub="Run the pipeline to analyse your policies" />
                ) : gapReports.map(g => (
                  <div key={g.id} className="card-hover" style={{
                    background: "#0d1525", border: "1px solid #1a2540",
                    borderLeft: "4px solid #f59e0b",
                    borderRadius: 12, padding: 20, marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", flex: 1, paddingRight: 16, lineHeight: 1.4 }}>{g.gap_description}</div>
                      <ConfBadge score={g.confidence_score} />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <Tag color="#6366f1">{g.policy_section}</Tag>
                      <Tag color="#475569">{g.jurisdiction}</Tag>
                      {g.jira_key && <Tag color="#1d4ed8">🎫 {g.jira_key}</Tag>}
                      {g.requires_human_review && <Tag color="#92400e">⚠ Human Review</Tag>}
                    </div>
                    {g.confidence_reason && (
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, lineHeight: 1.5 }}>💡 {g.confidence_reason}</div>
                    )}
                    {g.deadline && (
                      <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 6 }}>
                        📅 Deadline: {g.deadline} · {g.days_remaining >= 0 ? `${g.days_remaining} days remaining` : "Overdue"}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#334155", marginTop: 8, fontFamily: "'JetBrains Mono',monospace" }}>
                      {g.regulation_title?.slice(0, 80)}…
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── REVIEWS (HITL) ── */}
            {activeTab === "reviews" && (
              <div>
                <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  — Human-in-the-Loop · Policies with confidence &lt; 70%
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "Pending Review", value: hitlReviews.filter(r => r.status === "pending").length, color: "#ef4444" },
                    { label: "AI Rewritten",   value: hitlReviews.filter(r => r.status === "rewritten").length, color: "#10b981" },
                    { label: "Dismissed",      value: hitlReviews.filter(r => r.status === "dismissed").length, color: "#64748b" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "#0d1525", border: `1px solid ${color}25`, borderRadius: 12, padding: "16px 20px", borderTop: `3px solid ${color}` }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {hitlReviews.length === 0 ? (
                  <EmptyState icon="👁" title="No reviews pending" sub="Policies scoring below 70% confidence will appear here" />
                ) : hitlReviews.map(r => {
                  const statusCfg = {
                    pending:   { color: "#ef4444", bg: "#ef444415", label: "PENDING" },
                    rewritten: { color: "#10b981", bg: "#10b98115", label: "REWRITTEN" },
                    dismissed: { color: "#475569", bg: "#47556920", label: "DISMISSED" },
                  }[r.status] || {};
                  return (
                    <div key={r.id} className="card-hover" style={{
                      background: "#0d1525", border: `1px solid ${statusCfg.color}40`,
                      borderLeft: `4px solid ${statusCfg.color}`,
                      borderRadius: 12, padding: 20, marginBottom: 12,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", marginBottom: 4 }}>{r.policy_name}</div>
                          <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono',monospace" }}>{r.regulation_title} · {r.jurisdiction}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 16 }}>
                          <ConfBadge score={r.confidence_score} />
                          <span style={{
                            background: statusCfg.bg, color: statusCfg.color,
                            border: `1px solid ${statusCfg.color}40`,
                            borderRadius: 20, padding: "3px 12px",
                            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em"
                          }}>{statusCfg.label}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14, lineHeight: 1.6, background: "#07101f", borderRadius: 8, padding: "10px 14px" }}>
                        {r.gap_description}
                      </div>

                      {r.status === "pending" && (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button className="btn-primary" onClick={() => approveReview(r.id)} disabled={approvingId === r.id}
                            style={{
                              background: approvingId === r.id ? "#1e293b" : "#10b981",
                              color: approvingId === r.id ? "#64748b" : "#fff",
                              border: "none", borderRadius: 8, padding: "9px 20px",
                              cursor: approvingId === r.id ? "not-allowed" : "pointer",
                              fontSize: 12, fontWeight: 700,
                              boxShadow: approvingId === r.id ? "none" : "0 4px 16px rgba(16,185,129,0.3)",
                            }}>
                            {approvingId === r.id ? "⏳ AI is rewriting…" : "✓ Approve & Rewrite"}
                          </button>
                          <button className="btn-primary" onClick={() => dismissReview(r.id)}
                            style={{ background: "#1a0a0a", color: "#ef4444", border: "1px solid #ef444430", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                            ✗ Dismiss
                          </button>
                        </div>
                      )}

                      {r.status === "rewritten" && r.rewritten_content && (
                        <div style={{ background: "#041a0f", border: "1px solid #10b98130", borderRadius: 8, padding: 14, marginTop: 4 }}>
                          <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: 8 }}>✓ AI-REWRITTEN POLICY</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>{r.rewritten_content}</div>
                        </div>
                      )}

                      <div style={{ fontSize: 10, color: "#334155", marginTop: 12, fontFamily: "'JetBrains Mono',monospace" }}>
                        Created {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                        {r.resolved_at && ` · Resolved ${new Date(r.resolved_at).toLocaleString()}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── CONFLICTS ── */}
            {activeTab === "conflicts" && (
              <div>
                <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  — Cross-jurisdiction conflicts
                </div>
                {conflicts.length === 0 ? (
                  <EmptyState icon="⚖️" title="No conflicts detected" sub="Conflicts appear when regulations from different jurisdictions contradict each other" />
                ) : conflicts.map(c => (
                  <div key={c.id} className="card-hover" style={{
                    background: "#0d1525", border: "1px solid #a78bfa30",
                    borderLeft: "4px solid #a78bfa",
                    borderRadius: 12, padding: 20, marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                      <Tag color="#a78bfa">{c.regulation_1_jurisdiction}</Tag>
                      <span style={{ color: "#334155", fontSize: 18 }}>⟷</span>
                      <Tag color="#a78bfa">{c.regulation_2_jurisdiction}</Tag>
                    </div>
                    <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.6, marginBottom: 10 }}>{c.plain_english_explanation}</div>
                    <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono',monospace" }}>{c.regulation_1_title} · {c.regulation_2_title}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── POLICIES ── */}
            {activeTab === "policies" && (
              <div>
                <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  — {policies.length} policies indexed
                </div>
                {policies.map(p => (
                  <div key={p.id} className="card-hover" style={{
                    background: "#0d1525",
                    border: `1px solid ${p.updated_by === "ComplianceBot Agent" ? "#10b98130" : "#1a2540"}`,
                    borderLeft: `4px solid ${p.updated_by === "ComplianceBot Agent" ? "#10b981" : "#1a2540"}`,
                    borderRadius: 12, padding: 20, marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{p.title}</span>
                        <span style={{ color: "#475569", fontSize: 12, marginLeft: 8 }}>§ {p.section}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Tag color="#1d4ed8">v{p.version}</Tag>
                        <Tag color="#334155">{p.jurisdiction}</Tag>
                        {p.updated_by === "ComplianceBot Agent" && <Tag color="#064e3b">🤖 Auto-updated</Tag>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, marginBottom: 8 }}>{p.content?.slice(0, 280)}…</div>
                    <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono',monospace" }}>
                      Updated {p.last_updated?.slice(0, 10)} by {p.updated_by}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── AUDIT TRAIL ── */}
            {activeTab === "audit" && (
              <div>
                <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  — {auditTrail.length} audit events
                </div>
                <div style={{ background: "#0d1525", border: "1px solid #1a2540", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                      <thead>
                        <tr style={{ background: "#07101f" }}>
                          {["Time", "Run ID", "Agent", "Action", "Decision", "Confidence", "Branch"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", borderBottom: "1px solid #1a2540", color: "#334155", fontWeight: 700, textAlign: "left", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {auditTrail.map((e, i) => (
                          <tr key={e.id} style={{ borderBottom: "1px solid #0d1525", background: i % 2 === 0 ? "transparent" : "#07101f08" }}>
                            <td style={{ padding: "8px 14px", color: "#334155", whiteSpace: "nowrap" }}>{e.timestamp?.slice(11, 19)}</td>
                            <td style={{ padding: "8px 14px", color: "#6366f1" }}>{e.pipeline_run_id?.slice(0, 8)}</td>
                            <td style={{ padding: "8px 14px" }}>
                              <span style={{ color: AGENT_META[e.agent_name]?.color || "#94a3b8" }}>{e.agent_name}</span>
                            </td>
                            <td style={{ padding: "8px 14px", color: "#64748b" }}>{e.action}</td>
                            <td style={{ padding: "8px 14px", color: "#94a3b8", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.decision}</td>
                            <td style={{ padding: "8px 14px" }}>{e.confidence != null ? <ConfBadge score={e.confidence} /> : <span style={{ color: "#1e293b" }}>—</span>}</td>
                            <td style={{ padding: "8px 14px", color: e.branch_taken === "human_review" ? "#f59e0b" : "#334155" }}>{e.branch_taken || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SCHEDULER ── */}
            {activeTab === "scheduler" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Schedule Control */}
                <div style={{ background: "#0d1525", border: "1px solid #1a2540", borderRadius: 12, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>Auto-Run Schedule</div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Pipeline runs automatically at the chosen interval</div>
                    </div>
                    <button className="btn-primary" onClick={() => updateSchedule({ enabled: !schedule.enabled })}
                      style={{
                        background: schedule.enabled ? "#10b981" : "#1e293b",
                        color: schedule.enabled ? "#fff" : "#475569",
                        border: `1px solid ${schedule.enabled ? "#10b98150" : "#334155"}`,
                        borderRadius: 24, padding: "10px 28px",
                        cursor: "pointer", fontSize: 13, fontWeight: 700,
                        boxShadow: schedule.enabled ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
                        transition: "all 0.2s ease",
                      }}>
                      {schedule.enabled ? "● Enabled" : "○ Disabled"}
                    </button>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Interval</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[{ label: "1 Hour", val: 60 }, { label: "6 Hours", val: 360 }, { label: "12 Hours", val: 720 }, { label: "Daily", val: 1440 }, { label: "Weekly", val: 10080 }].map(opt => (
                        <button key={opt.val} className="tab-btn" onClick={() => updateSchedule({ interval_minutes: opt.val })}
                          style={{
                            background: schedule.interval_minutes === opt.val ? "#6366f1" : "#07101f",
                            color: schedule.interval_minutes === opt.val ? "#fff" : "#475569",
                            border: `1px solid ${schedule.interval_minutes === opt.val ? "#6366f1" : "#1a2540"}`,
                            borderRadius: 8, padding: "8px 18px",
                            cursor: "pointer", fontSize: 12, fontWeight: 700,
                            boxShadow: schedule.interval_minutes === opt.val ? "0 4px 16px rgba(99,102,241,0.3)" : "none",
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 24, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "#475569", borderTop: "1px solid #1a2540", paddingTop: 14 }}>
                    <span>Last run: <span style={{ color: "#94a3b8" }}>{schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : "Never"}</span></span>
                    <span>Next run: <span style={{ color: schedule.enabled ? "#10b981" : "#475569" }}>{schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : "Not scheduled"}</span></span>
                  </div>
                </div>

                {/* Email */}
                <div style={{ background: "#0d1525", border: "1px solid #1a2540", borderRadius: 12, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>📧 Email Alerts</div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Notifications sent when gaps or HITL reviews are detected</div>
                    </div>
                    <button className="btn-primary" onClick={sendTestEmail} disabled={emailSending}
                      style={{
                        background: emailSending ? "#1e293b" : "#4f46e5",
                        color: emailSending ? "#475569" : "#fff",
                        border: "none", borderRadius: 8, padding: "9px 20px",
                        cursor: emailSending ? "not-allowed" : "pointer",
                        fontSize: 12, fontWeight: 700,
                        boxShadow: emailSending ? "none" : "0 4px 16px rgba(79,70,229,0.4)",
                      }}>
                      {emailSending ? "Sending…" : "Send Test Email"}
                    </button>
                  </div>
                </div>

                {/* Run History */}
                <div style={{ background: "#0d1525", border: "1px solid #1a2540", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a2540" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>Pipeline Run History</div>
                  </div>
                  {pipelineRuns.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#334155", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>No runs recorded yet</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>
                      <thead>
                        <tr style={{ background: "#07101f" }}>
                          {["Time", "Trigger", "Status", "Docs", "Gaps", "Conflicts"].map(h => (
                            <th key={h} style={{ padding: "10px 16px", borderBottom: "1px solid #1a2540", color: "#334155", fontWeight: 700, textAlign: "left", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pipelineRuns.map((r, i) => (
                          <tr key={r.id} style={{ borderBottom: "1px solid #0d1525", background: i % 2 === 0 ? "transparent" : "#07101f08" }}>
                            <td style={{ padding: "10px 16px", color: "#64748b" }}>{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</td>
                            <td style={{ padding: "10px 16px" }}>
                              <span style={{ background: r.trigger === "scheduled" ? "#6366f120" : "#3b82f620", color: r.trigger === "scheduled" ? "#a5b4fc" : "#93c5fd", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700 }}>{r.trigger}</span>
                            </td>
                            <td style={{ padding: "10px 16px", fontWeight: 700, color: r.status === "complete" ? "#10b981" : r.status === "error" ? "#ef4444" : "#f59e0b" }}>
                              {r.status?.toUpperCase()}
                            </td>
                            <td style={{ padding: "10px 16px", color: "#6366f1" }}>{r.documents_processed}</td>
                            <td style={{ padding: "10px 16px", color: "#f59e0b" }}>{r.gaps_found}</td>
                            <td style={{ padding: "10px 16px", color: "#a78bfa" }}>{r.conflicts_found}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}

// Helpers
function Tag({ color, children }) {
  return (
    <span style={{
      background: color + "20", color,
      border: `1px solid ${color}40`,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 700,
    }}>{children}</span>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ background: "#0d1525", border: "1px solid #1a2540", borderRadius: 12, padding: "48px 32px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: "#475569", fontSize: 15, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#334155", maxWidth: 320, margin: "0 auto", lineHeight: 1.6 }}>{sub}</div>
    </div>
  );
}