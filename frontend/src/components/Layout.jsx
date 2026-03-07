import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const pageMeta = {
  "/upload": { title: "Upload Documents", subtitle: "Upload and manage your document set" },
  "/explorer": { title: "Data Explorer", subtitle: "Sort, filter, and reorder columns" },
  "/visualizations": { title: "Visualizations", subtitle: "Build charts from your dataset" },
  "/chatbot": { title: "AI Assistant", subtitle: "Ask questions about your uploaded docs" },
};

export default function Layout() {
  const location = useLocation();
  const meta = pageMeta[location.pathname] ?? pageMeta["/upload"];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <section className="page-container">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
