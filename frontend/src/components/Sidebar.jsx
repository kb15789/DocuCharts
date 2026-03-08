import { useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";

import { changePassword } from "../api/auth";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/upload", label: "Upload Documents" },
  { to: "/explorer", label: "Data Explorer" },
  { to: "/visualizations", label: "Visualizations" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  let items = [...navItems];

  if (user?.chat_assistant_enabled) {
    items = [...items, { to: "/chatbot", label: "Chat Assistant" }];
  }

  if (user?.monitoring_dashboard_enabled) {
    items = [...items, { to: "/monitoring", label: "Monitoring" }];
  }

  const onPasswordChange = (field, value) => {
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const onPasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    try {
      setIsPasswordSaving(true);
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordSuccess("Password updated successfully.");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setShowPasswordForm(false);
    } catch (error) {
      setPasswordError(error?.response?.data?.detail ?? "Failed to update password.");
    } finally {
      setIsPasswordSaving(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">DC</div>
        <div>
          <h1>DocuCharts</h1>
          <p>SaaS Platform</p>
        </div>
      </div>

      <nav className="nav-links">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "nav-link nav-link-active" : "nav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>
          <strong>{user?.full_name ?? "User"}</strong>
          <p>{user?.email}</p>
        </div>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            setPasswordError("");
            setPasswordSuccess("");
            setShowPasswordForm((prev) => !prev);
          }}
        >
          <KeyRound size={16} />
          Change Password
        </button>
        {showPasswordForm && (
          <form className="sidebar-password-form" onSubmit={onPasswordSubmit}>
            <label>
              Current Password
              <input
                className="input"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => onPasswordChange("current_password", e.target.value)}
                required
              />
            </label>
            <label>
              New Password
              <input
                className="input"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => onPasswordChange("new_password", e.target.value)}
                required
              />
            </label>
            <label>
              Confirm New Password
              <input
                className="input"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => onPasswordChange("confirm_password", e.target.value)}
                required
              />
            </label>
            {passwordError ? <p className="error-text">{passwordError}</p> : null}
            <button type="submit" className="primary-btn" disabled={isPasswordSaving}>
              {isPasswordSaving ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
        {!showPasswordForm && passwordSuccess ? (
          <p className="sidebar-success-text">{passwordSuccess}</p>
        ) : null}
        <button type="button" className="ghost-btn" onClick={logout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
