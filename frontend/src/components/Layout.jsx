import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { pingPresence } from "../api/auth";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const pageMeta = {
  "/upload": { title: "Upload Documents", subtitle: "Upload and manage your document set" },
  "/explorer": { title: "Data Explorer", subtitle: "Sort, filter, and reorder columns" },
  "/visualizations": { title: "Visualizations", subtitle: "Build charts from your dataset" },
  "/chatbot": { title: "AI Assistant", subtitle: "Ask questions about your uploaded docs" },
  "/monitoring": { title: "Monitoring Dashboard", subtitle: "Track user login trends and usage" },
};

export default function Layout() {
  const location = useLocation();
  const meta = pageMeta[location.pathname] ?? pageMeta["/upload"];
  const [theme, setTheme] = useState(() => localStorage.getItem("docucharts_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("docucharts_theme", theme);
  }, [theme]);

  useEffect(() => {
    function detectCountryCode() {
      const language = navigator.language || "";
      const region = language.split("-")[1];
      return region && region.length === 2 ? region.toUpperCase() : "US";
    }

    const payload = {
      country_code: detectCountryCode(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    };

    async function sendPresence() {
      const token = localStorage.getItem("docucharts_token");
      if (!token) return;
      try {
        await pingPresence(payload);
      } catch {
        // Ignore heartbeat failures.
      }
    }

    sendPresence();
    const intervalId = window.setInterval(sendPresence, 60 * 1000);

    function onVisible() {
      if (document.visibilityState === "visible") {
        sendPresence();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <section className="page-container">
          <Outlet />
        </section>
        <footer className="app-footer">
          <Link to="/about">About</Link>
        </footer>
      </main>
    </div>
  );
}
