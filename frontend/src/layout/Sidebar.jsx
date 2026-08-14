import { useNavigate, NavLink } from "react-router-dom";
import { logoutEverywhere } from "../utils/auth";

const NAV_SECTIONS = [
  {
    items: [
      { label: "Overview", path: "/dashboard", icon: "grid" },
      { label: "Problems", path: "/dashboard/problems", icon: "code" },
      { label: "DSA Sheets", path: "/dashboard/sheets", icon: "list" },
      { label: "Aptitude", path: "/dashboard/aptitude", icon: "brain" },
      { label: "Mock Interviews", path: "/dashboard/mock", icon: "video" },
      { label: "Contests", path: "/dashboard/contests", icon: "flag" },
      { label: "Leaderboard", path: "/dashboard/leaderboard", icon: "trophy" },
      { label: "Network", path: "/dashboard/network", icon: "share2" },
      { label: "Messages", path: "/dashboard/messages", icon: "mail" },
    ],
  },
];

const ICONS = {
  grid: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>,
  code: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
  list: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
  brain: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 7v5l3 3" /></svg>,
  video: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>,
  flag: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22V3a1 1 0 011-1h13.5a1 1 0 01.8 1.6L16 8l3.3 4.4a1 1 0 01-.8 1.6H5" /></svg>,
  users2: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
  trophy: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17a2 2 0 01-1 1.73C7.85 19.5 7 20.74 7 22" /><path d="M14 14.66V17a2 2 0 001 1.73c1.15.77 2 2 2 3.27" /><path d="M18 2H6v7a6 6 0 0012 0V2z" /></svg>,
  share2: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></svg>,
  mail: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" /><polyline points="22 6 12 13 2 6" /></svg>,
  bookmark: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>,
  user: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  settings: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
};

export default function Sidebar({ user, collapsed, setCollapsed, mobile, onClose }) {
  const navigate = useNavigate();
  const handleLogout = () => logoutEverywhere();

  return (
    <>
      {mobile && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49 }} />}
      <div className="cv-sidebar" style={{
        width: collapsed ? 76 : 248, minHeight: "100vh",
        background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        transition: "width 0.25s var(--ease-out)",
        position: mobile ? "fixed" : "relative", top: 0, left: 0, zIndex: 50,
        overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{ padding: collapsed ? "22px 0" : "22px 22px", display: "flex", alignItems: "center", gap: 10, minHeight: 70, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, margin: collapsed ? "0 auto" : 0, boxShadow: "var(--shadow-glow-accent)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          {!collapsed && <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>CodeVerse</span>}
          {!mobile && !collapsed && (
            <button onClick={() => setCollapsed(true)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
        </div>

        <nav style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
          {NAV_SECTIONS[0].items.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === "/dashboard"}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 11,
                padding: collapsed ? "10px 0" : "9px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 10, marginBottom: 2, textDecoration: "none",
                color: isActive ? "var(--accent-strong)" : "var(--text-secondary)",
                background: isActive ? "var(--accent-soft)" : "transparent",
                fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                whiteSpace: "nowrap", transition: "all 0.15s",
              })}>
              {ICONS[item.icon]}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
          <div style={{ height: 1, background: "var(--border-subtle)", margin: "10px 4px" }} />
          <NavLink to="/dashboard/bookmarks" style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 11, padding: collapsed ? "10px 0" : "9px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: 10, marginBottom: 2, textDecoration: "none", color: isActive ? "var(--accent-strong)" : "var(--text-secondary)", background: isActive ? "var(--accent-soft)" : "transparent", fontSize: 13.5, fontWeight: 500 })}>
            {ICONS.bookmark}{!collapsed && <span>Bookmarks</span>}
          </NavLink>
          <NavLink to="/dashboard/profile" style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 11, padding: collapsed ? "10px 0" : "9px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: 10, marginBottom: 2, textDecoration: "none", color: isActive ? "var(--accent-strong)" : "var(--text-secondary)", background: isActive ? "var(--accent-soft)" : "transparent", fontSize: 13.5, fontWeight: 500 })}>
            {ICONS.user}{!collapsed && <span>Profile</span>}
          </NavLink>
          <NavLink to="/dashboard/settings" style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 11, padding: collapsed ? "10px 0" : "9px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: 10, marginBottom: 2, textDecoration: "none", color: isActive ? "var(--accent-strong)" : "var(--text-secondary)", background: isActive ? "var(--accent-soft)" : "transparent", fontSize: 13.5, fontWeight: 500 })}>
            {ICONS.settings}{!collapsed && <span>Settings</span>}
          </NavLink>
        </nav>

        <div style={{ padding: 12, borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "8px 0" : "8px 10px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "Student"}</p>
                <button onClick={() => navigate("/dashboard/profile")} style={{ fontSize: 10.5, color: "var(--text-tertiary)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>View Profile</button>
              </div>
            )}
            {!collapsed && (
              <button onClick={handleLogout} title="Logout" style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", padding: 3 }}>
                {ICONS.logout}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
