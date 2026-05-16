import { useState, useEffect, useRef } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const AGENTS = ["Monitor", "Interpreter", "Comparator", "ConflictDetector", "Drafter", "Orchestrator"];

const AGENT_META = {
  Monitor:          { icon: "eye",            color: "#185FA5", bg: "#E6F1FB", idleBg: "#EEF5FC", desc: "Regulation Watch",   step: "01" },
  Interpreter:      { icon: "code",           color: "#3B6D11", bg: "#EAF3DE", idleBg: "#F2F8EB", desc: "Obligation Parse",   step: "02" },
  Comparator:       { icon: "git-compare",    color: "#854F0B", bg: "#FAEEDA", idleBg: "#FDF5EA", desc: "Gap Analysis",       step: "03" },
  ConflictDetector: { icon: "alert-triangle", color: "#A32D2D", bg: "#FCEBEB", idleBg: "#FDF1F1", desc: "Cross-Jurisdiction", step: "04" },
  Drafter:          { icon: "file-text",      color: "#533AB7", bg: "#EEEDFE", idleBg: "#F3F2FD", desc: "SOP Generation",    step: "05" },
  Orchestrator:     { icon: "cpu",            color: "#0F6E56", bg: "#E1F5EE", idleBg: "#EDF8F4", desc: "Coordination",      step: "06" },
};

const NAV = [
  { id: "dashboard", label: "Dashboard",    icon: "layout-dashboard" },
  { id: "gaps",      label: "Gap Reports",  icon: "alert-circle" },
  { id: "reviews",   label: "HITL Reviews", icon: "users" },
  { id: "conflicts", label: "Conflicts",    icon: "git-merge" },
  { id: "policies",  label: "Policies",     icon: "shield" },
  { id: "audit",     label: "Audit Trail",  icon: "list" },
  { id: "scheduler", label: "Scheduler",    icon: "clock" },
];

export default function App() {
  const [activeTab, setActiveTab]       = useState("dashboard");
  const [running, setRunning]           = useState(false);
  const [logs, setLogs]                 = useState([]);
  const [lastResult, setLastResult]     = useState(null);
  const [agentStatus, setAgentStatus]   = useState({});
  const [auditTrail, setAuditTrail]     = useState([]);
  const [gapReports, setGapReports]     = useState([]);
  const [conflicts, setConflicts]       = useState([]);
  const [policies, setPolicies]         = useState([]);
  const [schedule, setSchedule]         = useState({ enabled: false, interval_minutes: 360 });
  const [pipelineRuns, setPipelineRuns] = useState([]);
  const [emailSending, setEmailSending] = useState(false);
  const [hitlReviews, setHitlReviews]   = useState([]);
  const [approvingId, setApprovingId]   = useState(null);
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
      await fetch(`${BACKEND}/schedule`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      // Re-fetch to guarantee UI reflects DB state
      const fresh = await fetch(`${BACKEND}/schedule`).then(r => r.json());
      setSchedule(fresh);
    } catch (e) { console.error(e); }
  };

  const sendTestEmail = async () => {
    setEmailSending(true);
    try {
      const res  = await fetch(`${BACKEND}/send-test-email`, { method: "POST" });
      const data = await res.json();
      alert(data.status === "success" ? "✓ Test email sent!" : `✗ ${data.message}`);
    } catch { alert("✗ Failed"); }
    setEmailSending(false);
  };

  const approveReview = async (id) => {
    setApprovingId(id);
    try {
      const res  = await fetch(`${BACKEND}/hitl-reviews/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success")
        setHitlReviews(prev => prev.map(r => r.id === id ? { ...r, status: "rewritten", rewritten_content: data.rewritten_content } : r));
    } catch { alert("✗ Approve failed"); }
    setApprovingId(null);
  };

  const dismissReview = async (id) => {
    try {
      const res  = await fetch(`${BACKEND}/hitl-reviews/${id}/dismiss`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success")
        setHitlReviews(prev => prev.map(r => r.id === id ? { ...r, status: "dismissed" } : r));
    } catch { alert("✗ Dismiss failed"); }
  };

  const pendingReviews = hitlReviews.filter(r => r.status === "pending").length;

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const id = setInterval(async () => {
      const fresh = await fetch(`${BACKEND}/schedule`).then(r => r.json()).catch(() => null);
      if (fresh) setSchedule(fresh);
    }, 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const simulateWebhook = async () => {
    setRunning(true); setLogs([]); setAgentStatus({});
    addLog("Simulating webhook trigger…", "info");
    
    const seq = [
      { name: "Monitor",          delay: 400  },
      { name: "Interpreter",      delay: 1200 },
      { name: "Comparator",       delay: 2400 },
      { name: "ConflictDetector", delay: 3600 },
      { name: "Drafter",          delay: 5000 },
      { name: "Orchestrator",     delay: 6400 },
    ];
    
    seq.forEach(({ name, delay }) => setTimeout(() => {
      setAgentStatus(prev => ({ ...prev, [name]: "running" }));
      addLog(`${name} agent processing…`, "info");
    }, delay));

    try {
      const res = await fetch(`${BACKEND}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "policy_update",
          source: "Simulate Button",
          data: { note: "Simulated webhook event" }
        })
      });
      const data = await res.json();
      AGENTS.forEach(name => setAgentStatus(prev => ({ ...prev, [name]: "done" })));

      if (data.status === "success") {
        setLastResult(data);
        addLog("Webhook Pipeline completed successfully", "success");
        addLog(`Obligations extracted: ${data.obligations_found}`, "success");
        addLog(`Compliance gaps identified: ${data.gaps_found}`, "success");
        addLog(`Jurisdiction conflicts: ${data.conflicts_found ?? 0}`, data.conflicts_found ? "warning" : "success");
        addLog(`Jira ticket created: ${data.jira_key}`, "success");
        addLog("Summary email triggered successfully", "success");
        if (data.deadline) addLog(`Deadline: ${data.deadline} · ${data.days_remaining} days remaining`, "warning");
        if (data.requires_human_review) addLog("Human review required for low-confidence items", "warning");
        await fetchData();
      } else {
        addLog(`Webhook error: ${data.message}`, "error");
        AGENTS.forEach(name => setAgentStatus(prev => ({ ...prev, [name]: "idle" })));
      }
    } catch {
      addLog("Failed to trigger webhook", "error");
    }
    setRunning(false);
  };

  const runPipeline = async () => {
    setRunning(true); setLogs([]); setAgentStatus({});
    addLog("Initialising pipeline…", "info");
    const seq = [
      { name: "Monitor",          delay: 400  },
      { name: "Interpreter",      delay: 1200 },
      { name: "Comparator",       delay: 2400 },
      { name: "ConflictDetector", delay: 3600 },
      { name: "Drafter",          delay: 5000 },
      { name: "Orchestrator",     delay: 6400 },
    ];
    seq.forEach(({ name, delay }) => setTimeout(() => {
      setAgentStatus(prev => ({ ...prev, [name]: "running" }));
      addLog(`${name} agent processing…`, "info");
    }, delay));
    try {
      const res  = await fetch(`${BACKEND}/run-pipeline-test`, { method: "POST" });
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

  const confColor = (score) => {
    const p = Math.round((score ?? 0) * 100);
    return p >= 80 ? "#3B6D11" : p >= 60 ? "#854F0B" : "#A32D2D";
  };

  const confBg = (score) => {
    const p = Math.round((score ?? 0) * 100);
    return p >= 80 ? "#EAF3DE" : p >= 60 ? "#FAEEDA" : "#FCEBEB";
  };

  const ConfBadge = ({ score }) => {
    const p = Math.round((score ?? 0) * 100);
    return (
      <span style={{
        background: confBg(score),
        color: confColor(score),
        borderRadius: 6,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 600,
        display: "inline-block",
      }}>{p}%</span>
    );
  };

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body { background: #F7F8FA; }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #F7F8FA; }
    ::-webkit-scrollbar-thumb { background: #D3D1C7; border-radius: 4px; }

    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%,100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .log-line { animation: slideUp 0.15s ease forwards; }

    .nav-link {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 16px; cursor: pointer;
      border-radius: 8px; margin: 1px 8px;
      transition: background 0.12s;
      font-size: 13.5px; font-weight: 500;
      color: #5F5E5A; user-select: none;
    }
    .nav-link:hover { background: #F1EFE8; color: #2C2C2A; }
    .nav-link.active { background: #E6F1FB; color: #185FA5; }
    .nav-link i { font-size: 16px; }

    .nav-badge {
      margin-left: auto;
      background: #FCEBEB; color: #A32D2D;
      border-radius: 12px; padding: 1px 7px;
      font-size: 11px; font-weight: 600;
    }

    .run-btn {
      font-size: 14px; font-weight: 600;
      padding: 9px 22px; border: none;
      border-radius: 8px; cursor: pointer;
      display: flex; align-items: center; gap: 8px;
      transition: all 0.15s;
    }
    .run-btn:hover:not(:disabled) { filter: brightness(0.94); }
    .run-btn:active:not(:disabled) { transform: scale(0.98); }
    .run-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .card {
      background: #ffffff;
      border: 1px solid #E8E6DF;
      border-radius: 12px;
    }

    .section-label {
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.07em; text-transform: uppercase;
      color: #888780; margin-bottom: 14px;
    }

    .tag {
      display: inline-flex; align-items: center;
      font-size: 11.5px; font-weight: 500;
      padding: 3px 9px; border-radius: 6px;
    }

    table { border-collapse: collapse; width: 100%; }
    th {
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.06em; text-transform: uppercase;
      color: #888780; text-align: left;
      padding: 10px 16px;
      border-bottom: 1px solid #F1EFE8;
      background: #FAFAF8;
    }
    td {
      padding: 11px 16px;
      border-bottom: 1px solid #F1EFE8;
      font-size: 13.5px;
      color: #2C2C2A;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #FAFAF8; }

    .btn-secondary {
      font-size: 13px; font-weight: 500;
      padding: 7px 16px; cursor: pointer;
      border-radius: 8px; transition: all 0.12s;
      background: #ffffff;
      border: 1px solid #D3D1C7;
      color: #444441;
    }
    .btn-secondary:hover:not(:disabled) { background: #F1EFE8; }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

    .status-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    }

    input[type=range] { accent-color: #185FA5; width: 100%; }
  `;

  const iconStyle = { fontSize: 16, verticalAlign: "-2px", marginRight: 6 };

  return (
    <>
      <style>{css}</style>
      <div style={{
        display: "flex", height: "100vh",
        background: "#F7F8FA",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#2C2C2A",
        overflow: "hidden",
      }}>

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: 230, minWidth: 230,
          background: "#ffffff",
          borderRight: "1px solid #E8E6DF",
          display: "flex", flexDirection: "column",
        }}>
          {/* Logo */}
          <div style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid #F1EFE8",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#185FA5",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="ti ti-shield-check" style={{ color: "#fff", fontSize: 18 }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#2C2C2A", lineHeight: 1.2 }}>ComplianceBot</div>
                <div style={{ fontSize: 11, color: "#888780", fontWeight: 400 }}>6-Agent Pipeline</div>
              </div>
            </div>
          </div>

          {/* System status */}
          <div style={{
            padding: "10px 20px",
            borderBottom: "1px solid #F1EFE8",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div className="status-dot" style={{
              background: running ? "#3B6D11" : "#D3D1C7",
              animation: running ? "pulse 1.2s infinite" : "none",
            }} />
            <span style={{ fontSize: 12, color: running ? "#3B6D11" : "#888780", fontWeight: 500 }}>
              {running ? "Pipeline running" : "System idle"}
            </span>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
            {NAV.map(item => {
              const badge = item.id === "reviews" && pendingReviews > 0 ? pendingReviews : null;
              return (
                <div key={item.id}
                  className={`nav-link ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => setActiveTab(item.id)}>
                  <i className={`ti ti-${item.icon}`} />
                  {item.label}
                  {badge && <span className="nav-badge">{badge}</span>}
                </div>
              );
            })}
          </nav>

          {/* Stats footer */}
          <div style={{
            padding: "14px 20px",
            borderTop: "1px solid #F1EFE8",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {[
              { label: "Gaps",      value: gapReports.length,  color: "#854F0B", bg: "#FAEEDA" },
              { label: "Conflicts", value: conflicts.length,    color: "#A32D2D", bg: "#FCEBEB" },
              { label: "Reviews",   value: pendingReviews,      color: "#533AB7", bg: "#EEEDFE" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#888780" }}>{label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  background: value > 0 ? bg : "transparent",
                  color: value > 0 ? color : "#B4B2A9",
                  padding: value > 0 ? "2px 8px" : 0,
                  borderRadius: 6,
                }}>{value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Topbar */}
          <header style={{
            padding: "0 28px",
            height: 58,
            borderBottom: "1px solid #E8E6DF",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#ffffff",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#2C2C2A" }}>
                {NAV.find(n => n.id === activeTab)?.label}
              </h1>
              <span style={{ fontSize: 12, color: "#888780" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn-secondary" onClick={simulateWebhook}>
                <i className="ti ti-plug" style={iconStyle} />Simulate Webhook
              </button>
              <button className="btn-secondary" onClick={() => window.open(`${BACKEND}/export-pdf`, "_blank")}>
                <i className="ti ti-download" style={iconStyle} />Export PDF
              </button>
              <button className="run-btn" onClick={runPipeline} disabled={running}
                style={{
                  background: running ? "#F1EFE8" : "#185FA5",
                  color: running ? "#888780" : "#ffffff",
                }}>
                {running
                  ? <><i className="ti ti-loader" style={{ fontSize: 16, animation: "spin 1s linear infinite" }} />Processing…</>
                  : <><i className="ti ti-player-play" style={{ fontSize: 15 }} />Run Pipeline</>
                }
              </button>
            </div>
          </header>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "#F7F8FA" }}>

            {/* ══════════════ DASHBOARD */}
            {activeTab === "dashboard" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Always-visible stats from fetched data */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  {[
                    { label: "Gap Reports",    value: gapReports.length,    color: "#854F0B", bg: "#FAEEDA", icon: "alert-circle"   },
                    { label: "Conflicts",      value: conflicts.length,      color: "#A32D2D", bg: "#FCEBEB", icon: "git-merge"      },
                    { label: "Pending Reviews",value: pendingReviews,        color: "#533AB7", bg: "#EEEDFE", icon: "users"          },
                    { label: "Policies",       value: policies.length,       color: "#185FA5", bg: "#E6F1FB", icon: "shield"         },
                  ].map(({ label, value, color, bg, icon }) => (
                    <div key={label} className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <i className={`ti ti-${icon}`} style={{ color, fontSize: 22 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
                        <div style={{ fontSize: 12, color: "#888780", marginTop: 2 }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agent Pipeline */}
                <div className="card" style={{ padding: "20px 20px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div className="section-label" style={{ marginBottom: 0 }}>Agent Pipeline</div>
                    {lastResult && (
                      <span style={{ fontSize: 12, color: "#3B6D11", fontWeight: 500 }}>
                        Last run: {lastResult.jira_key} · {lastResult.obligations_found} obligations · {lastResult.gaps_found} gaps
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
                    {AGENTS.map((name, i) => {
                      const s    = agentStatus[name] || "idle";
                      const meta = AGENT_META[name];
                      const isDone    = s === "done";
                      const isRunning = s === "running";
                      return (
                        <div key={name} style={{
                          background: isDone ? meta.bg : isRunning ? meta.bg : meta.idleBg,
                          border: `1px solid ${isDone ? meta.color + "40" : isRunning ? meta.color + "60" : meta.color + "20"}`,
                          borderRadius: 10,
                          padding: "16px 12px",
                          transition: "all 0.3s",
                          position: "relative",
                        }}>
                          {/* connector line between cards */}
                          {i < AGENTS.length - 1 && (
                            <div style={{
                              position: "absolute", right: -5, top: "50%",
                              transform: "translateY(-50%)",
                              width: 10, height: 2,
                              background: isDone ? meta.color + "60" : "#E8E6DF",
                              zIndex: 2,
                            }} />
                          )}
                          <div style={{
                            width: 34, height: 34, borderRadius: 9,
                            background: isDone ? meta.color : isRunning ? meta.color : meta.color + "25",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            marginBottom: 10,
                            transition: "background 0.3s",
                          }}>
                            <i className={`ti ti-${meta.icon}`} style={{
                              color: isDone || isRunning ? "#fff" : meta.color,
                              fontSize: 17,
                              animation: isRunning ? "pulse 1s infinite" : "none",
                            }} />
                          </div>
                          <div style={{
                            fontSize: 12.5, fontWeight: 600,
                            color: meta.color,
                            marginBottom: 2,
                          }}>{name}</div>
                          <div style={{ fontSize: 11, color: "#888780", lineHeight: 1.4 }}>{meta.desc}</div>
                          <div style={{
                            marginTop: 10, fontSize: 11, fontWeight: 600,
                            color: isDone ? meta.color : isRunning ? meta.color : meta.color + "70",
                            display: "flex", alignItems: "center", gap: 4,
                          }}>
                            {isDone
                              ? <><i className="ti ti-check" style={{ fontSize: 12 }} />Done</>
                              : isRunning
                              ? <><i className="ti ti-loader" style={{ fontSize: 12, animation: "spin 1s linear infinite" }} />Active</>
                              : <span style={{ opacity: 0.6 }}>Step {meta.step}</span>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Last run result banner */}
                {lastResult && (
                  <div style={{
                    background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 10,
                    padding: "14px 20px", display: "flex", gap: 28, alignItems: "center",
                  }}>
                    <i className="ti ti-circle-check" style={{ color: "#3B6D11", fontSize: 20, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#27500A", fontWeight: 600 }}>Last pipeline run completed</span>
                    {[
                      { label: "Obligations", value: lastResult.obligations_found },
                      { label: "Gaps", value: lastResult.gaps_found },
                      { label: "Conflicts", value: lastResult.conflicts_found ?? 0 },
                      { label: "Jira", value: lastResult.jira_key },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#3B6D11" }}>{value ?? "—"}</span>
                        <span style={{ fontSize: 12, color: "#639922" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Log */}
                <div className="card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div className="section-label" style={{ marginBottom: 0 }}>Live output</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div className="status-dot" style={{
                        background: running ? "#3B6D11" : "#D3D1C7",
                        animation: running ? "pulse 1s infinite" : "none",
                      }} />
                      <span style={{ fontSize: 11, color: running ? "#3B6D11" : "#888780" }}>
                        {running ? "Streaming" : "Idle"}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    background: "#FAFAF8",
                    border: "1px solid #F1EFE8",
                    borderRadius: 8,
                    padding: "14px 16px",
                    minHeight: 180, maxHeight: 260,
                    overflowY: "auto",
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    fontSize: 12.5,
                  }}>
                    {logs.length === 0 ? (
                      <div style={{ color: "#D3D1C7", textAlign: "center", paddingTop: 50 }}>
                        Run the pipeline to see output
                      </div>
                    ) : logs.map((l, i) => (
                      <div key={i} className="log-line" style={{
                        display: "flex", gap: 14,
                        padding: "2px 0", lineHeight: 1.7,
                      }}>
                        <span style={{ color: "#B4B2A9", minWidth: 70 }}>{l.time}</span>
                        <span style={{
                          color: {
                            success: "#3B6D11", error: "#A32D2D",
                            warning: "#854F0B", info: "#888780",
                          }[l.type],
                        }}>
                          {l.type === "success" ? "✓" : l.type === "error" ? "✗" : l.type === "warning" ? "△" : "›"}
                        </span>
                        <span style={{
                          color: {
                            success: "#3B6D11", error: "#A32D2D",
                            warning: "#854F0B", info: "#444441",
                          }[l.type],
                        }}>{l.msg}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════ GAPS */}
            {activeTab === "gaps" && (
              <div>
                <div className="section-label">{gapReports.length} compliance gaps detected</div>
                {gapReports.length === 0
                  ? <EmptyState icon="check-circle" label="No gaps detected" sub="Run the pipeline to analyse your policies" />
                  : gapReports.map(g => (
                  <div key={g.id} className="card" style={{
                    padding: "18px 20px", marginBottom: 10,
                    borderLeft: "3px solid #854F0B",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#2C2C2A", flex: 1, paddingRight: 20, lineHeight: 1.55 }}>
                        {g.gap_description}
                      </div>
                      <ConfBadge score={g.confidence_score} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      <CTag color="#533AB7" bg="#EEEDFE">{g.policy_section}</CTag>
                      <CTag color="#5F5E5A" bg="#F1EFE8">{g.jurisdiction}</CTag>
                      {g.jira_key && <CTag color="#185FA5" bg="#E6F1FB">{g.jira_key}</CTag>}
                      {g.requires_human_review && <CTag color="#854F0B" bg="#FAEEDA">Human review</CTag>}
                    </div>
                    {g.confidence_reason && (
                      <div style={{ fontSize: 12.5, color: "#888780", lineHeight: 1.6 }}>{g.confidence_reason}</div>
                    )}
                    {g.deadline && (
                      <div style={{ fontSize: 12, color: "#854F0B", marginTop: 8, fontWeight: 500 }}>
                        Deadline {g.deadline} · {g.days_remaining >= 0 ? `${g.days_remaining} days remaining` : "Overdue"}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "#B4B2A9", marginTop: 8 }}>
                      {g.regulation_title?.slice(0, 100)}…
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══════════════ HITL REVIEWS */}
            {activeTab === "reviews" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Pending review", value: hitlReviews.filter(r => r.status === "pending").length,   color: "#A32D2D", bg: "#FCEBEB" },
                    { label: "AI rewritten",   value: hitlReviews.filter(r => r.status === "rewritten").length, color: "#3B6D11", bg: "#EAF3DE" },
                    { label: "Dismissed",      value: hitlReviews.filter(r => r.status === "dismissed").length, color: "#888780", bg: "#F1EFE8" },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className="card" style={{ padding: "18px 20px" }}>
                      <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
                      <div style={{ fontSize: 12, color: "#888780" }}>{label}</div>
                    </div>
                  ))}
                </div>

                {hitlReviews.length === 0
                  ? <EmptyState icon="users" label="No reviews pending" sub="Items scoring below 70% confidence appear here" />
                  : hitlReviews.map(r => {
                  const sc = {
                    pending:   { color: "#A32D2D", bg: "#FCEBEB", label: "Pending"   },
                    rewritten: { color: "#3B6D11", bg: "#EAF3DE", label: "Rewritten" },
                    dismissed: { color: "#888780", bg: "#F1EFE8", label: "Dismissed" },
                  }[r.status] || {};
                  return (
                    <div key={r.id} className="card" style={{
                      padding: "18px 20px", marginBottom: 10,
                      borderLeft: `3px solid ${sc.color}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#2C2C2A", marginBottom: 3 }}>{r.policy_name}</div>
                          <div style={{ fontSize: 12, color: "#888780" }}>{r.regulation_title} · {r.jurisdiction}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 16 }}>
                          <ConfBadge score={r.confidence_score} />
                          <CTag color={sc.color} bg={sc.bg}>{sc.label}</CTag>
                        </div>
                      </div>

                      <div style={{
                        fontSize: 13, color: "#5F5E5A",
                        background: "#FAFAF8", border: "1px solid #F1EFE8",
                        borderRadius: 8, padding: "12px 14px",
                        lineHeight: 1.65, marginBottom: 14,
                      }}>
                        {r.gap_description}
                      </div>

                      {r.status === "pending" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-secondary" onClick={() => approveReview(r.id)} disabled={approvingId === r.id}
                            style={{ color: "#3B6D11", borderColor: "#C0DD97" }}>
                            {approvingId === r.id ? "Rewriting…" : "✓ Approve & rewrite"}
                          </button>
                          <button className="btn-secondary" onClick={() => dismissReview(r.id)}
                            style={{ color: "#A32D2D", borderColor: "#F7C1C1" }}>
                            Dismiss
                          </button>
                        </div>
                      )}

                      {r.status === "rewritten" && r.rewritten_content && (
                        <div style={{
                          background: "#EAF3DE", border: "1px solid #C0DD97",
                          borderRadius: 8, padding: "14px 16px", marginTop: 4,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#3B6D11", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            AI-rewritten policy
                          </div>
                          <div style={{ fontSize: 13, color: "#27500A", lineHeight: 1.65, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
                            {r.rewritten_content}
                          </div>
                        </div>
                      )}

                      <div style={{ fontSize: 11.5, color: "#B4B2A9", marginTop: 12 }}>
                        Created {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                        {r.resolved_at && ` · Resolved ${new Date(r.resolved_at).toLocaleString()}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ══════════════ CONFLICTS */}
            {activeTab === "conflicts" && (
              <div>
                <div className="section-label">Cross-jurisdiction conflicts</div>
                {conflicts.length === 0
                  ? <EmptyState icon="git-merge" label="No conflicts detected" sub="Conflicts appear when regulations from different jurisdictions contradict each other" />
                  : conflicts.map(c => (
                  <div key={c.id} className="card" style={{
                    padding: "18px 20px", marginBottom: 10,
                    borderLeft: "3px solid #533AB7",
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                      <CTag color="#533AB7" bg="#EEEDFE">{c.regulation_1_jurisdiction}</CTag>
                      <span style={{ color: "#D3D1C7", fontWeight: 500 }}>⟷</span>
                      <CTag color="#533AB7" bg="#EEEDFE">{c.regulation_2_jurisdiction}</CTag>
                    </div>
                    <div style={{ fontSize: 14, color: "#444441", lineHeight: 1.6, marginBottom: 10 }}>{c.plain_english_explanation}</div>
                    <div style={{ fontSize: 12, color: "#888780" }}>
                      {c.regulation_1_title} · {c.regulation_2_title}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══════════════ POLICIES */}
            {activeTab === "policies" && (
              <div>
                <div className="section-label">{policies.length} policies indexed</div>
                {policies.map(p => (
                  <div key={p.id} className="card" style={{
                    padding: "16px 20px", marginBottom: 10,
                    borderLeft: `3px solid ${p.updated_by === "ComplianceBot Agent" ? "#3B6D11" : "#E8E6DF"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#2C2C2A" }}>{p.title}</span>
                        <span style={{ fontSize: 12, color: "#888780" }}>§ {p.section}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <CTag color="#185FA5" bg="#E6F1FB">v{p.version}</CTag>
                        <CTag color="#5F5E5A" bg="#F1EFE8">{p.jurisdiction}</CTag>
                        {p.updated_by === "ComplianceBot Agent" && <CTag color="#3B6D11" bg="#EAF3DE">Auto-updated</CTag>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#888780", lineHeight: 1.6, marginBottom: 8 }}>{p.content?.slice(0, 280)}…</div>
                    <div style={{ fontSize: 11.5, color: "#B4B2A9" }}>
                      Updated {p.last_updated?.slice(0, 10)} · {p.updated_by}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══════════════ AUDIT */}
            {activeTab === "audit" && (
              <div>
                <div className="section-label">{auditTrail.length} audit events</div>
                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          {["Time", "Run ID", "Agent", "Action", "Decision", "Confidence", "Branch"].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {auditTrail.map(e => (
                          <tr key={e.id}>
                            <td style={{ color: "#888780", fontFamily: "monospace", fontSize: 12 }}>{e.timestamp?.slice(11, 19)}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 12, color: "#185FA5" }}>{e.pipeline_run_id?.slice(0, 8)}</td>
                            <td>
                              <span style={{
                                color: AGENT_META[e.agent_name]?.color || "#888780",
                                fontWeight: 500, fontSize: 13,
                              }}>{e.agent_name}</span>
                            </td>
                            <td style={{ color: "#444441" }}>{e.action}</td>
                            <td style={{ color: "#888780", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.decision}</td>
                            <td>{e.confidence != null ? <ConfBadge score={e.confidence} /> : <span style={{ color: "#D3D1C7" }}>—</span>}</td>
                            <td>
                              {e.branch_taken
                                ? <CTag color={e.branch_taken === "human_review" ? "#854F0B" : "#5F5E5A"} bg={e.branch_taken === "human_review" ? "#FAEEDA" : "#F1EFE8"}>{e.branch_taken}</CTag>
                                : <span style={{ color: "#D3D1C7" }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════ SCHEDULER */}
            {activeTab === "scheduler" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                <div className="card" style={{ padding: "22px 24px" }}>
                  <div className="section-label">Auto-run schedule</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#2C2C2A", marginBottom: 4 }}>Pipeline auto-execution</div>
                      <div style={{ fontSize: 13, color: "#888780" }}>Runs autonomously at the configured interval</div>
                    </div>
                    <button className="btn-secondary" onClick={() => updateSchedule({ enabled: !schedule.enabled })}
                      style={{
                        color: schedule.enabled ? "#3B6D11" : "#888780",
                        borderColor: schedule.enabled ? "#C0DD97" : "#D3D1C7",
                        background: schedule.enabled ? "#EAF3DE" : "#ffffff",
                        fontWeight: 600,
                      }}>
                      {schedule.enabled ? "● Enabled" : "○ Disabled"}
                    </button>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: "#888780", fontWeight: 500, marginBottom: 10 }}>Interval</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[{ label: "1h", val: 60 }, { label: "6h", val: 360 }, { label: "12h", val: 720 }, { label: "24h", val: 1440 }, { label: "7d", val: 10080 }].map(opt => (
                        <button key={opt.val} onClick={() => updateSchedule({ interval_minutes: opt.val })}
                          className="btn-secondary"
                          style={{
                            color: schedule.interval_minutes === opt.val ? "#185FA5" : "#5F5E5A",
                            borderColor: schedule.interval_minutes === opt.val ? "#85B7EB" : "#D3D1C7",
                            background: schedule.interval_minutes === opt.val ? "#E6F1FB" : "#ffffff",
                            fontWeight: schedule.interval_minutes === opt.val ? 600 : 400,
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    display: "flex", gap: 32, fontSize: 13,
                    color: "#888780", borderTop: "1px solid #F1EFE8", paddingTop: 16,
                  }}>
                    <span>Last run: <strong style={{ color: "#444441", fontWeight: 500 }}>{schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : "Never"}</strong></span>
                    <span>Next run: <strong style={{ color: schedule.enabled ? "#3B6D11" : "#888780", fontWeight: 500 }}>{schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : "Not scheduled"}</strong></span>
                  </div>
                </div>

                <div className="card" style={{ padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#2C2C2A", marginBottom: 3 }}>Email alerts</div>
                    <div style={{ fontSize: 13, color: "#888780" }}>Notifications on gap or HITL detection</div>
                  </div>
                  <button className="btn-secondary" onClick={sendTestEmail} disabled={emailSending}>
                    {emailSending ? "Sending…" : "Send test email"}
                  </button>
                </div>

                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1EFE8" }}>
                    <div className="section-label" style={{ marginBottom: 0 }}>Pipeline run history</div>
                  </div>
                  {pipelineRuns.length === 0
                    ? <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#B4B2A9" }}>No runs recorded yet</div>
                    : (
                    <table>
                      <thead>
                        <tr>{["Time", "Trigger", "Status", "Docs", "Gaps", "Conflicts"].map(h => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {pipelineRuns.map(r => (
                          <tr key={r.id}>
                            <td style={{ color: "#888780", fontSize: 12.5 }}>{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</td>
                            <td><CTag color="#533AB7" bg="#EEEDFE">{r.trigger}</CTag></td>
                            <td>
                              <CTag
                                color={r.status === "complete" ? "#3B6D11" : r.status === "error" ? "#A32D2D" : "#854F0B"}
                                bg={r.status === "complete" ? "#EAF3DE" : r.status === "error" ? "#FCEBEB" : "#FAEEDA"}
                              >
                                {r.status}
                              </CTag>
                            </td>
                            <td style={{ color: "#185FA5", fontWeight: 500 }}>{r.documents_processed}</td>
                            <td style={{ color: "#854F0B", fontWeight: 500 }}>{r.gaps_found}</td>
                            <td style={{ color: "#A32D2D", fontWeight: 500 }}>{r.conflicts_found}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function CTag({ color, bg, children }) {
  return (
    <span style={{
      background: bg,
      color,
      borderRadius: 6,
      padding: "3px 9px",
      fontSize: 12,
      fontWeight: 500,
      display: "inline-flex",
      alignItems: "center",
    }}>{children}</span>
  );
}

function EmptyState({ icon, label, sub }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #E8E6DF",
      borderRadius: 12,
      padding: "52px 32px",
      textAlign: "center",
    }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 32, color: "#D3D1C7", display: "block", marginBottom: 12 }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: "#888780", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#B4B2A9", lineHeight: 1.7 }}>{sub}</div>
    </div>
  );
}