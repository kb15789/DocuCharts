import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  fetchMonitoringActivityLogs,
  fetchMonitoringUsage,
  fetchMonitoringUsers,
  updateMonitoringUserFlags,
} from "../api/monitoring";

const periods = ["day", "week", "month", "year"];

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState("usage");
  const [period, setPeriod] = useState("week");
  const [usage, setUsage] = useState({
    points: [],
    total_unique_users: 0,
    total_logins: 0,
  });

  const [users, setUsers] = useState([]);
  const [updatingUserId, setUpdatingUserId] = useState("");

  const [activityLogs, setActivityLogs] = useState({ total: 0, items: [] });
  const [activityUserId, setActivityUserId] = useState("");
  const [activityLimit, setActivityLimit] = useState(100);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      const data = await fetchMonitoringUsers();
      setUsers(data);
    }
    loadUsers().catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    async function loadUsage() {
      setLoadingUsage(true);
      try {
        const data = await fetchMonitoringUsage(period);
        setUsage(data);
      } finally {
        setLoadingUsage(false);
      }
    }

    if (activeTab === "usage") {
      loadUsage().catch(() => {
        setUsage({ points: [], total_unique_users: 0, total_logins: 0 });
        setLoadingUsage(false);
      });
    }
  }, [period, activeTab]);

  async function loadActivityLogs() {
    setLoadingLogs(true);
    try {
      const data = await fetchMonitoringActivityLogs({
        userId: activityUserId,
        limit: activityLimit,
      });
      setActivityLogs(data);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    if (activeTab === "activity") {
      loadActivityLogs().catch(() => {
        setActivityLogs({ total: 0, items: [] });
        setLoadingLogs(false);
      });
    }
  }, [activeTab]);

  async function toggleUserFlag(user, key) {
    setUpdatingUserId(user.id);
    try {
      const updated = await updateMonitoringUserFlags(user.id, {
        [key]: !user[key],
      });
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } finally {
      setUpdatingUserId("");
    }
  }

  const userOptions = useMemo(() => users.map((u) => ({ id: u.id, label: `${u.full_name} (${u.email})` })), [users]);

  return (
    <div className="grid-layout">
      <section className="card monitoring-header">
        <div>
          <h3>Monitoring Dashboard</h3>
          <p className="table-note">Track logins and inspect user activity logs.</p>
        </div>

        <div className="period-switcher">
          <button
            type="button"
            className={activeTab === "usage" ? "period-btn period-btn-active" : "period-btn"}
            onClick={() => setActiveTab("usage")}
          >
            Usage
          </button>
          <button
            type="button"
            className={activeTab === "activity" ? "period-btn period-btn-active" : "period-btn"}
            onClick={() => setActiveTab("activity")}
          >
            Activity Logs
          </button>
          <button
            type="button"
            className={activeTab === "users" ? "period-btn period-btn-active" : "period-btn"}
            onClick={() => setActiveTab("users")}
          >
            User Controls
          </button>
        </div>
      </section>

      {activeTab === "usage" && (
        <>
          <section className="kpi-grid">
            <article className="card kpi-card">
              <p>Unique Users Logged In</p>
              <h3>{usage.total_unique_users}</h3>
            </article>
            <article className="card kpi-card">
              <p>Total Logins</p>
              <h3>{usage.total_logins}</h3>
            </article>
          </section>

          <section className="card">
            <div className="monitoring-toolbar">
              <h3>Login Timeline ({period})</h3>
              <div className="period-switcher">
                {periods.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={period === value ? "period-btn period-btn-active" : "period-btn"}
                    onClick={() => setPeriod(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="monitoring-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usage.points}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="unique_users" stroke="#4b9cff" strokeWidth={2} />
                  <Line type="monotone" dataKey="logins" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {loadingUsage && <p className="table-note">Loading usage metrics...</p>}
          </section>
        </>
      )}

      {activeTab === "activity" && (
        <section className="card">
          <div className="monitoring-toolbar">
            <h3>User Activity Logs</h3>
            <div className="activity-filters">
              <select value={activityUserId} onChange={(e) => setActivityUserId(e.target.value)}>
                <option value="">All Users</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
              </select>
              <select value={activityLimit} onChange={(e) => setActivityLimit(Number(e.target.value))}>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
              <button type="button" className="ghost-btn" onClick={loadActivityLogs}>
                Refresh
              </button>
            </div>
          </div>

          <p className="table-note">Showing {activityLogs.items.length} of {activityLogs.total} logs.</p>

          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Email</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.items.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.full_name}</td>
                  <td>{log.email}</td>
                  <td>{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loadingLogs && <p className="table-note">Loading activity logs...</p>}
        </section>
      )}

      {activeTab === "users" && (
        <section className="card">
          <h3>User Controls</h3>
          <p className="table-note">Activate/deactivate users and manage feature flags.</p>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Account</th>
                <th>Chat</th>
                <th>Monitoring</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => toggleUserFlag(user, "is_active")}
                      disabled={updatingUserId === user.id}
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => toggleUserFlag(user, "chat_assistant_enabled")}
                      disabled={updatingUserId === user.id}
                    >
                      {user.chat_assistant_enabled ? "Disable" : "Enable"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => toggleUserFlag(user, "monitoring_dashboard_enabled")}
                      disabled={updatingUserId === user.id}
                    >
                      {user.monitoring_dashboard_enabled ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
