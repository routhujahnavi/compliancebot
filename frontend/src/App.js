
import { useState } from "react";

function App() {
  const [topic, setTopic] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const checkCompliance = async () => {
    if (!topic) return;
    setLoading(true);
    setAnalysis("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/check-compliance?topic=${encodeURIComponent(topic)}`,
        { method: "POST" }
      );
      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (error) {
      setAnalysis("Error connecting to backend. Make sure it is running.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "50px auto", padding: "20px", fontFamily: "Arial" }}>
      <h1 style={{ color: "#2c3e50" }}>🤖 ComplianceBot</h1>
      <p style={{ color: "#7f8c8d" }}>AI-powered compliance analysis tool</p>

      <div style={{ marginTop: "30px" }}>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter compliance topic (e.g. GDPR data privacy)"
          style={{
            width: "70%", padding: "12px", fontSize: "16px",
            border: "2px solid #3498db", borderRadius: "8px"
          }}
        />
        <button
          onClick={checkCompliance}
          disabled={loading}
          style={{
            marginLeft: "10px", padding: "12px 24px", fontSize: "16px",
            backgroundColor: "#3498db", color: "white",
            border: "none", borderRadius: "8px", cursor: "pointer"
          }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {analysis && (
        <div style={{
          marginTop: "30px", padding: "20px",
          backgroundColor: "#f8f9fa", borderRadius: "8px",
          border: "1px solid #dee2e6", whiteSpace: "pre-wrap"
        }}>
          <h3 style={{ color: "#2c3e50" }}>📋 Analysis Result:</h3>
          <p style={{ lineHeight: "1.6", color: "#34495e" }}>{analysis}</p>
        </div>
      )}
    </div>
  );
}

export default App;