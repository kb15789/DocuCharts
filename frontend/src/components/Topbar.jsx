import { Search } from "lucide-react";

export default function Topbar({ title, subtitle }) {
  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <label className="search-box">
        <Search size={16} />
        <input type="text" placeholder="Search insights..." />
      </label>
    </header>
  );
}
