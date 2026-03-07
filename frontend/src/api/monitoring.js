import apiClient from "./client";

export async function fetchMonitoringUsage(period = "week") {
  const { data } = await apiClient.get(`/monitoring/usage?period=${period}`);
  return data;
}

export async function fetchMonitoringActivityLogs({ userId = "", limit = 100 } = {}) {
  const query = new URLSearchParams();
  if (userId) query.set("user_id", userId);
  query.set("limit", String(limit));

  const { data } = await apiClient.get(`/monitoring/activity-logs?${query.toString()}`);
  return data;
}

export async function fetchMonitoringUsers() {
  const { data } = await apiClient.get("/monitoring/users");
  return data;
}

export async function updateMonitoringUserFlags(userId, payload) {
  const { data } = await apiClient.patch(`/monitoring/users/${userId}/flags`, payload);
  return data;
}
