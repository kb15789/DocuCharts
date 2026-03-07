import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchDocuments, generateAIInsights } from "../api/documents";
import { DOCUMENTS_UPDATED_EVENT } from "../utils/documentsEvents";

function renderChart(chart) {
  if (chart.chart_type === "line") {
    return (
      <LineChart data={chart.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#1570ef" strokeWidth={3} />
      </LineChart>
    );
  }

  if (chart.chart_type === "pie") {
    return (
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie data={chart.data} dataKey="value" nameKey="x" fill="#1570ef" />
      </PieChart>
    );
  }

  return (
    <BarChart data={chart.data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="x" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="value" fill="#1570ef" radius={[6, 6, 0, 0]} />
    </BarChart>
  );
}

export default function VisualizationsPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [insightsResult, setInsightsResult] = useState(null);

  useEffect(() => {
    async function loadDocuments() {
      const docs = await fetchDocuments();
      setDocuments(docs);
      setSelectedDocumentIds((prev) => {
        const valid = prev.filter((id) => docs.some((doc) => doc.id === id));
        if (valid.length) return valid;
        return docs.length ? [docs[0].id] : [];
      });
    }

    function handleDocumentsUpdated() {
      loadDocuments().catch(() => setDocuments([]));
    }

    loadDocuments().catch(() => setDocuments([]));
    window.addEventListener(DOCUMENTS_UPDATED_EVENT, handleDocumentsUpdated);
    return () => window.removeEventListener(DOCUMENTS_UPDATED_EVENT, handleDocumentsUpdated);
  }, []);

  async function onGenerateInsights() {
    if (!selectedDocumentIds.length) return;
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const result = await generateAIInsights(selectedDocumentIds, customPrompt);
      setInsightsResult(result);
    } catch (error) {
      setInsightsResult(null);
      setInsightsError(error?.response?.data?.detail || "Failed to generate insights.");
    } finally {
      setInsightsLoading(false);
    }
  }

  return (
    <div className="grid-layout">
      <section className="card">
        <h3>Select Documents</h3>
        <p className="table-note">Choose uploaded documents, add optional prompt, then click Generate Insights.</p>
        <select
          className="input"
          multiple
          value={selectedDocumentIds}
          onChange={(event) => {
            const ids = Array.from(event.target.selectedOptions).map((option) => option.value);
            setSelectedDocumentIds(ids);
          }}
        >
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name} ({doc.parse_status || "unknown"})
            </option>
          ))}
        </select>

        <label style={{ display: "block", marginTop: 12 }}>
          Custom Chart Prompt (Optional)
          <textarea
            className="input"
            rows={4}
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            placeholder="Example: Focus on revenue growth trends, show region split, and highlight anomalies."
          />
        </label>

        <div style={{ marginTop: 12 }}>
          <button
            className="primary-btn"
            type="button"
            onClick={onGenerateInsights}
            disabled={insightsLoading || !selectedDocumentIds.length}
          >
            {insightsLoading ? "Generating..." : "Generate Insights"}
          </button>
        </div>
      </section>

      {insightsError && (
        <section className="card">
          <p className="error-text">{insightsError}</p>
        </section>
      )}

      {insightsResult ? (
        <>
          <section className="card">
            <h3>Top Insight</h3>
            <p>{insightsResult.top_insight}</p>
            {insightsResult.key_insights?.length > 0 && (
              <>
                <h4>Key Insights</h4>
                <ul className="clean-list">
                  {insightsResult.key_insights.map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="card">
            <h3>Charts Generated</h3>
            <ul className="clean-list">
              {(insightsResult.charts || []).map((chart) => (
                <li key={`${chart.chart_type}-${chart.title}`}>
                  {chart.title} ({chart.chart_type.toUpperCase()})
                </li>
              ))}
            </ul>
          </section>

          <section className="insights-charts-grid">
            {(insightsResult.charts || []).map((chart) => (
              <article className="card" key={`${chart.title}-${chart.chart_type}`}>
                <h3>{chart.title}</h3>
                <p className="table-note">
                  {chart.chart_type.toUpperCase()} | X: {chart.x_axis}
                  {chart.y_axis ? ` | Y: ${chart.y_axis}` : ""}
                </p>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart(chart)}
                  </ResponsiveContainer>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="card">
          <p className="table-note">
            Generate Insights to let DocuCharts automatically detect columns, create charts, and summarize findings.
          </p>
        </section>
      )}
    </div>
  );
}
