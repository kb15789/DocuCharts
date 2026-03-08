import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import loginHero from "../assets/login-hero.svg";

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
    <div className="auth-page auth-page-login">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-hero-copy">
            <h1>DocuCharts</h1>
            <p>Turn Documents into Visual Insights</p>
          </div>
          <img src={loginHero} alt="DocuCharts dashboard illustration" />
        </section>

        <section className="login-form-side">
          <header className="auth-top auth-top-login">
            <span />
            <p>
              Don&apos;t have an account? <Link to="/signup">Create account</Link>
            </p>
          </header>

          <div className="auth-login-wrap">
            <form className="auth-card auth-card-login" onSubmit={onSubmit}>
              <h1>Welcome!</h1>
              <p>Enter your credentials to access your dashboard</p>

              <label>
                Username or Email
                <input
                  className="input"
                  type="text"
                  value={formData.login}
                  onChange={(e) => setFormData((prev) => ({ ...prev, login: e.target.value }))}
                  placeholder="name@docucharts.ai or username"
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
                  placeholder="Enter password"
                  required
                />
              </label>

              {error && <p className="error-text">{error}</p>}

              <button className="primary-btn auth-submit" type="submit" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>

          <footer className="auth-footer auth-footer-login-page">
            <Link to="/about" state={{ from: "/login" }}>
              Learn More
            </Link>
          </footer>
        </section>
      </div>
    </div>
  );
}
