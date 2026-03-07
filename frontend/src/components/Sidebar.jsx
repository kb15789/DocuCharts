import { LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/upload", label: "Upload Documents" },
  { to: "/explorer", label: "Data Explorer" },
  { to: "/visualizations", label: "Visualizations" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  let items = [...navItems];

  if (user?.chat_assistant_enabled) {
    items = [...items, { to: "/chatbot", label: "Chat Assistant" }];
  }

  if (user?.monitoring_dashboard_enabled) {
    items = [...items, { to: "/monitoring", label: "Monitoring" }];
  }

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
        <button type="button" className="ghost-btn" onClick={logout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
