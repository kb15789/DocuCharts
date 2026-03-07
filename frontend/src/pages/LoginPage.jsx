import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { handleAuthSuccess } = useAuth();
  const [formData, setFormData] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await login(formData);
      handleAuthSuccess(data);
      navigate("/upload");
    } catch (err) {
      setError(err?.response?.data?.detail ?? "Unable to login.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-top">
        <strong>DocAnalytics</strong>
        <p>
          Don&apos;t have an account? <Link to="/signup">Create account</Link>
        </p>
      </header>

      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Welcome Back</h1>
        <p>Enter your username/email and password to access your dashboard.</p>

        <label>
          Username or Email
          <input
            className="input"
            type="text"
            value={formData.login}
            onChange={(e) => setFormData((prev) => ({ ...prev, login: e.target.value }))}
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
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-btn" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
