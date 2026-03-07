import apiClient from "./client";

export async function signup(payload) {
  const { data } = await apiClient.post("/auth/signup", payload);
  return data;
}

export async function login(payload) {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export async function pingPresence(payload) {
  const { data } = await apiClient.post("/auth/presence", payload);
  return data;
}
