import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchCurrentUser } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  function normalizeUser(rawUser) {
    if (!rawUser) return null;
    return {
      ...rawUser,
      chat_assistant_enabled:
        rawUser.chat_assistant_enabled === undefined ? true : rawUser.chat_assistant_enabled,
    };
  }

  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("docucharts_user");
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  });

  const token = localStorage.getItem("docucharts_token");
  const isAuthenticated = Boolean(token && user);

  const logout = useCallback(() => {
    localStorage.removeItem("docucharts_token");
    localStorage.removeItem("docucharts_user");
    setUser(null);
  }, []);

  const syncUserFromServer = useCallback(async () => {
    const existingToken = localStorage.getItem("docucharts_token");
    if (!existingToken) return;

    try {
      const currentUser = await fetchCurrentUser();
      const normalized = normalizeUser(currentUser);
      localStorage.setItem("docucharts_user", JSON.stringify(normalized));
      setUser(normalized);
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    syncUserFromServer();
  }, [syncUserFromServer]);

  function handleAuthSuccess(response) {
    const normalizedUser = normalizeUser(response.user);
    localStorage.setItem("docucharts_token", response.access_token);
    localStorage.setItem("docucharts_user", JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  }

  const value = useMemo(
    () => ({ user, isAuthenticated, handleAuthSuccess, logout, syncUserFromServer }),
    [user, isAuthenticated, logout, syncUserFromServer]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
