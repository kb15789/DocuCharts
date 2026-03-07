import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signup } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const { handleAuthSuccess } = useAuth();
  const [formData, setFormData] = useState({ full_name: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await signup(formData);
      handleAuthSuccess(data);
      navigate("/upload");
    } catch (err) {
      setError(err?.response?.data?.detail ?? "Unable to signup.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-top">
        <strong>DocAnalytics</strong>
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </header>

      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create Account</h1>
        <p>Start your analytics workspace in a minute. Email is auto-generated.</p>

        <label>
          Full Name
          <input
            className="input"
            value={formData.full_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
            required
          />
        </label>

        <label>
          Password
          <input
            className="input"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            required
            minLength={8}
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-btn" type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
