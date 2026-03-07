import { Moon, Sun } from "lucide-react";

export default function Topbar({ title, subtitle, theme, onToggleTheme }) {
  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <button type="button" className="theme-toggle" onClick={onToggleTheme}>
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </button>
    </header>
  );
}
