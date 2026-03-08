import { X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function AboutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  function onClose() {
    const fromPath = typeof location.state?.from === "string" ? location.state.from : "";
    const fallback = isAuthenticated ? "/upload" : "/login";
    const nextPath = isAuthenticated && fromPath && fromPath !== "/about" ? fromPath : fallback;
    navigate(nextPath);
  }

  return (
    <div className="about-page">
      <section className="card about-card">
        <button type="button" className="about-close-btn" onClick={onClose} aria-label="Close about page">
          <X size={18} />
        </button>

        <div className="about-hero">
          <span className="about-badge">Learn More</span>
          <h1>Use DocuCharts End-to-End</h1>
          <p>
            Upload your files, explore rows, generate visuals, and ask grounded questions from the same selected
            documents.
          </p>
        </div>

        <div className="about-grid">
          <article className="about-feature">
            <h3>Upload Documents</h3>
            <p>Upload CSV/XLSX/PDF files. Parsed data is saved and reused across explorer, visuals, and chat.</p>
          </article>
          <article className="about-feature">
            <h3>Data Explorer</h3>
            <p>Choose documents, filter/sort values, reorder columns, and export table results as CSV.</p>
          </article>
          <article className="about-feature">
            <h3>Visualizations</h3>
            <p>Generate AI-based charts and insights using selected documents and an optional custom prompt.</p>
          </article>
          <article className="about-feature">
            <h3>Chat Assistant</h3>
            <p>Ask questions against selected docs. Answers are generated from the chosen document context.</p>
          </article>
        </div>

        <section className="about-quickstart">
          <h3>Quick Start</h3>
          <ol className="about-steps">
            <li>Upload one or more documents.</li>
            <li>Open Data Explorer to validate rows and columns.</li>
            <li>Use Visualizations to generate insights from the same selected documents.</li>
            <li>Use Chat Assistant for follow-up questions on those files.</li>
          </ol>
        </section>
      </section>
    </div>
  );
}
