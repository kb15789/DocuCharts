import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <div className="about-page">
      <section className="card about-card">
        <div className="about-hero">
          <span className="about-badge">About</span>
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
          <article className="about-feature">
            <h3>Monitoring</h3>
            <p>Track login timeline, activity logs, query logs, and user-level status/feature toggles.</p>
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

        <div className="about-actions">
          <Link className="primary-btn" to="/upload">
            Open App
          </Link>
          <Link className="ghost-btn" to="/login">
            Back to Login
          </Link>
        </div>
      </section>
    </div>
  );
}
