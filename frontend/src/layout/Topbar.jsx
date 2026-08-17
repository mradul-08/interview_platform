import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../hooks/useTheme";
import api from "../api/api";
import StudyGroupNotificationBell from "../components/StudyGroupNotificationBell";
import { connectRealtimeSocket } from "../realtime/socket";

const normalizeSearch = (value) => String(value || "").toLowerCase().trim();

function refineSearchResults(items, value) {
  const query = normalizeSearch(value);
  const tokens = query.split(/\s+/).filter((token) => token.length >= 2);
  const seen = new Set();

  return (Array.isArray(items) ? items : [])
    .filter((item) => {
      const key = item._id || item.slug;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => {
      const title = normalizeSearch(item.title);
      const slug = normalizeSearch(item.slug).replaceAll("-", " ");
      const difficulty = normalizeSearch(item.difficulty);
      const topics = (item.topic || []).map(normalizeSearch);
      const tags = (item.tags || []).map(normalizeSearch);
      const companies = (item.companies || []).map(normalizeSearch);
      const searchable = [title, slug, difficulty, ...topics, ...tags, ...companies];
      let score = 0;

      if (title === query) score += 10000;
      if (slug === query) score += 9000;
      if (title.startsWith(query)) score += 7000;
      if (slug.startsWith(query)) score += 6000;
      if (title.includes(query)) score += 5000;

      tokens.forEach((token) => {
        const titleMatch = title.includes(token);
        const difficultyMatch = difficulty === token || difficulty.startsWith(token);
        const topicMatch = topics.some((field) => field.includes(token));
        const tagMatch = tags.some((field) => field.includes(token));
        const companyMatch = companies.some((field) => field.includes(token));
        if (titleMatch) score += 800;
        if (difficultyMatch) score += 650;
        if (topicMatch) score += 500;
        if (tagMatch) score += 350;
        if (companyMatch) score += 250;
      });

      const matchedTokens = tokens.filter((token) => searchable.some((field) => field.includes(token))).length;
      score += matchedTokens * 150;
      return { item, score, matchedTokens };
    })
    .filter(({ matchedTokens }) => !tokens.length || matchedTokens === tokens.length)
    .sort((a, b) => b.score - a.score || String(a.item.title).localeCompare(String(b.item.title)))
    .slice(0, 8)
    .map(({ item }) => item);
}

export default function Topbar({ user, stats, onMenuClick, pageTitle }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [pointsPanel, setPointsPanel] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || "");
    api.get("/api/profile/me").then((response) => {
      const nextAvatar = response.data?.profile?.avatar?.url || "";
      setAvatarUrl(nextAvatar);
      window.dispatchEvent(new CustomEvent("profile-avatar-updated", { detail: { avatarUrl: nextAvatar } }));
    }).catch(() => {});
    const socket = connectRealtimeSocket();
    const onProfileUpdated = (event) => {
      if (event?.avatarUrl !== undefined) setAvatarUrl(event.avatarUrl || "");
    };
    const onLocalAvatarUpdated = (event) => setAvatarUrl(event.detail?.avatarUrl || "");
    socket.on("profile:updated", onProfileUpdated);
    window.addEventListener("profile-avatar-updated", onLocalAvatarUpdated);
    return () => { socket.off("profile:updated", onProfileUpdated); window.removeEventListener("profile-avatar-updated", onLocalAvatarUpdated); };
  }, [user?.avatarUrl]);

  useEffect(() => {
    const closeSearch = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", closeSearch);
    return () => document.removeEventListener("mousedown", closeSearch);
  }, []);

  useEffect(() => {
    const focusProjectSearch = (event) => {
      if (event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setSearchOpen(true);
        setMobileSearchOpen(true);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    document.addEventListener("keydown", focusProjectSearch);
    return () => document.removeEventListener("keydown", focusProjectSearch);
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await api.get(`/api/problems/search?q=${encodeURIComponent(term)}&limit=8`);
        if (active) setSearchResults(refineSearchResults(response.data.items || response.data.problems || [], term));
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  const openProblem = (problem) => {
    setSearch("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
    navigate(`/dashboard/problems/${problem.slug}`);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") { setSearchOpen(false); setMobileSearchOpen(false); }
    if (event.key === "Enter" && searchResults[0]) openProblem(searchResults[0]);
  };

  const openPointsPanel = async () => {
    if (pointsPanel) { setPointsPanel(null); return; }
    try {
      const response = await api.get("/api/gamification/transactions");
      setPointsPanel({ transactions: response.data.items || [] });
    } catch {
      setPointsPanel({ transactions: [], error: "Unable to load point history." });
    }
  };

  return (
    <div className="cv-topbar" style={topbarStyle}>
      <button onClick={onMenuClick} aria-label="Toggle navigation" style={iconButton}><MenuIcon /></button>
      <h1 className="cv-topbar-title" style={pageTitleStyle}>{pageTitle}</h1>

      <div ref={searchRef} className="cv-topbar-search" style={searchWrapStyle}>
        <div style={{ ...searchBoxStyle, borderColor: searchOpen ? "var(--accent)" : "var(--border-subtle)", boxShadow: searchOpen ? "var(--shadow-glow)" : "none" }}>
          <SearchIcon />
          <input ref={searchInputRef} value={search} onChange={(event) => { const value = event.target.value; setSearch(value); setSearchResults([]); setSearchOpen(true); setSearchLoading(value.trim().length >= 2); }} onFocus={() => setSearchOpen(true)} onKeyDown={handleSearchKeyDown} placeholder="Search problems, topics, companies..." aria-label="Search problems" style={searchInputStyle} />
          {search ? <button onClick={() => setSearch("")} aria-label="Clear search" style={clearButton}>x</button> : <kbd style={keyboardHint}>Alt S</kbd>}
        </div>
        <AnimatePresence>
        {searchOpen && search.trim().length >= 2 && <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }} style={searchDropdownStyle}>
          {searchLoading && <div style={searchMessageStyle}>Searching the problem bank...</div>}
          {!searchLoading && searchResults.length === 0 && <div style={searchMessageStyle}>No matching problems found.</div>}
          {!searchLoading && searchResults.map((problem) => <button key={problem._id || problem.slug} onClick={() => openProblem(problem)} style={searchResultStyle}>
            <span style={searchIconStyle}>Q</span>
            <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}><strong style={resultTitleStyle}>{problem.title}</strong><span style={resultMetaStyle}>{Array.isArray(problem.topic) ? problem.topic.join(", ") : problem.topic || "Coding problem"} · {problem.difficulty || "Practice"}</span></span><span style={{ color: "var(--accent-strong)", fontSize: 15 }}>-&gt;</span>
          </button>)}
          {!searchLoading && searchResults.length > 0 && <button onClick={() => { setSearchOpen(false); setMobileSearchOpen(false); navigate(`/dashboard/problems?search=${encodeURIComponent(search.trim())}`); }} style={searchFooterStyle}>View all results for &quot;{search.trim()}&quot; →</button>}
        </motion.div>}
        </AnimatePresence>
      </div>

      <button className="cv-mobile-search-button" onClick={() => { setMobileSearchOpen((open) => !open); setSearchOpen(true); }} aria-label="Search problems"><SearchIcon /></button>
      <div className="cv-topbar-status" style={streakStyle}>Streak: {stats ? `${stats.currentStreak} day` : "unavailable"}</div>
      <button className="cv-topbar-points" onClick={openPointsPanel} aria-label="Open point history" style={pointsButtonStyle}>{stats ? `${stats.points} Points` : "Points unavailable"}</button>
      <AnimatePresence>
      {pointsPanel && <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.15 }} style={pointsPanelStyle}>
        <div style={panelHeader}><strong style={{ color: "var(--text-primary)", fontSize: 14 }}>Points activity</strong><button onClick={() => setPointsPanel(null)} style={closeButton}>x</button></div>
        <div style={ruleBox}><div style={panelLabel}>Point rules</div><div>Accepted Easy problem <b>+10</b></div><div>Accepted Medium problem <b>+20</b></div><div>Accepted Hard problem <b>+30</b></div><div>Verified streak, mission, and perfect-day bonuses are awarded once.</div><div>DSA sheet reward redemption <b>-500</b></div></div>
        <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 700, margin: "14px 0 7px" }}>Recent ledger entries</div>
        {pointsPanel.error && <div style={{ color: "var(--red)", fontSize: 11 }}>{pointsPanel.error}</div>}
        {!pointsPanel.error && !pointsPanel.transactions.length && <div style={muted}>No point transactions yet.</div>}
        {!pointsPanel.error && pointsPanel.transactions.slice(0, 6).map((transaction) => <div key={transaction._id} style={transactionRow}><span style={{ color: transaction.amount >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)", fontWeight: 800 }}>{transaction.amount >= 0 ? "+" : ""}{transaction.amount}</span><span style={{ color: "var(--text-secondary)", flex: 1 }}>{transaction.reason}</span></div>)}
      </motion.div>}
      </AnimatePresence>
      <button className="cv-theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} aria-pressed={theme === "dark"} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} style={{ width: 40, height: 40, borderRadius: 10, boxShadow: "none" }}>
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
      <StudyGroupNotificationBell />
      <button onClick={() => navigate("/dashboard/profile")} aria-label="Open profile" style={avatarStyle}>{avatarUrl ? <img src={avatarUrl} alt="" style={avatarImageStyle} /> : (user?.name?.[0]?.toUpperCase() || "U")}</button>

      <AnimatePresence>
      {mobileSearchOpen && <motion.div className="cv-mobile-search-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
        <div ref={searchRef} style={searchBoxStyle}>
          <SearchIcon />
          <input autoFocus value={search} onChange={(event) => { const value = event.target.value; setSearch(value); setSearchResults([]); setSearchOpen(true); setSearchLoading(value.trim().length >= 2); }} onKeyDown={handleSearchKeyDown} placeholder="Search problems, topics, companies..." aria-label="Search problems" style={searchInputStyle} />
          {search && <button onClick={() => setSearch("")} aria-label="Clear search" style={clearButton}>×</button>}
        </div>
      </motion.div>}
      </AnimatePresence>
    </div>
  );
}

const MenuIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const SunIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>;
const MoonIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>;
const topbarStyle = { height: 68, background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", padding: "0 24px 0 20px", gap: 16, position: "sticky", top: 0, zIndex: 30, flexShrink: 0 };
const iconButton = { background: "none", border: 0, color: "var(--text-secondary)", cursor: "pointer", display: "flex", padding: 6, borderRadius: 8 };
const pageTitleStyle = { fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" };
const searchWrapStyle = { flex: 1, display: "flex", justifyContent: "center", maxWidth: 520, margin: "0 auto", position: "relative" };
const searchBoxStyle = { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: "var(--bg-elevated-2)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)", fontSize: 13, transition: "all .2s" };
const searchInputStyle = { width: "100%", background: "transparent", border: 0, outline: 0, color: "var(--text-primary)", fontSize: 13, fontFamily: "var(--font-sans)" };
const keyboardHint = { marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-disabled)", border: "1px solid var(--border-default)", borderRadius: 5, padding: "2px 5px", whiteSpace: "nowrap" };
const clearButton = { border: 0, background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 16 };
const searchDropdownStyle = { position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 70, overflow: "hidden", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: 6 };
const searchResultStyle = { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", border: 0, borderRadius: 9, background: "transparent", cursor: "pointer", color: "var(--text-primary)" };
const searchIconStyle = { display: "grid", placeItems: "center", width: 28, height: 28, flexShrink: 0, borderRadius: 8, color: "var(--accent-strong)", background: "var(--accent-soft)", fontSize: 12, fontWeight: 800 };
const resultTitleStyle = { display: "block", color: "var(--text-primary)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const resultMetaStyle = { display: "block", marginTop: 3, color: "var(--text-tertiary)", fontSize: 11 };
const searchMessageStyle = { padding: "16px 12px", color: "var(--text-tertiary)", fontSize: 12 };
const searchFooterStyle = { width: "100%", border: 0, borderTop: "1px solid var(--border-subtle)", background: "transparent", color: "var(--accent-strong)", padding: "11px 8px 6px", textAlign: "left", cursor: "pointer", fontSize: 12, fontWeight: 700 };
const streakStyle = { display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8, background: "var(--amber-soft)", color: "var(--amber)", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" };
const pointsButtonStyle = { display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent-strong)", fontSize: 12.5, fontWeight: 700, border: 0, cursor: "pointer", whiteSpace: "nowrap" };
const pointsPanelStyle = { position: "fixed", top: 60, right: 82, zIndex: 60, width: "min(360px, calc(100vw - 24px))", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow-lg)", color: "var(--text-tertiary)", fontSize: 11, lineHeight: 1.7 };
const panelHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }; const closeButton = { border: 0, background: "none", color: "var(--text-tertiary)", fontSize: 18, cursor: "pointer" }; const panelLabel = { color: "var(--text-primary)", fontWeight: 800, marginBottom: 5 }; const ruleBox = { background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 9, padding: "9px 10px" }; const muted = { color: "var(--text-tertiary)", fontSize: 11 }; const transactionRow = { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" };
const avatarStyle = { width: 40, height: 40, padding: 0, overflow: "hidden", border: "2px solid color-mix(in srgb,var(--accent) 72%,white 12%)", borderRadius: 10, background: "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0, cursor: "pointer", boxShadow: "0 4px 14px color-mix(in srgb,var(--accent) 18%,transparent)" };
const avatarImageStyle = { width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", borderRadius: 8, display: "block" };
