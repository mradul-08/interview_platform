import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { fetchList } from "../../api/listFetch";
import "./problemsPageFixes.css";

const PAGE_SIZE = 100;

const DiffBadge = ({ d }) => {
  const cfg = {
    Easy: { color: "var(--green)", bg: "var(--green-soft)" },
    Medium: { color: "var(--medium-color)", bg: "var(--medium-soft)" },
    Hard: { color: "var(--red)", bg: "var(--red-soft)" },
  }[d] || { color: "var(--text-tertiary)", bg: "var(--bg-elevated-2)" };
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: "var(--font-mono)", padding: "3px 9px", borderRadius: 6, color: cfg.color, background: cfg.bg, whiteSpace: "nowrap" }}>
      {d}
    </span>
  );
};

const FilterPill = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: value ? "var(--accent-soft)" : "var(--bg-elevated)", color: value ? "var(--accent-strong)" : "var(--text-secondary)", fontSize: 13, fontWeight: value ? 600 : 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}>
        {label}{value ? `: ${value}` : ""}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div role="listbox" aria-label={`${label} options`} style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 180, maxHeight: 280, overflowY: "auto", background: "var(--bg-elevated-2)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", zIndex: 200, boxShadow: "var(--shadow-md)", padding: "6px 0" }}>
          <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(""); setOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, color: !value ? "var(--accent-strong)" : "var(--text-secondary)", cursor: "pointer", fontWeight: !value ? 600 : 400, border: 0, background: "transparent", fontFamily: "var(--font-sans)" }}>
            All {label}s
          </button>
          {options.map((o) => (
            <button type="button" role="option" aria-selected={value === o} key={o} onClick={() => { onChange(o); setOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, color: value === o ? "var(--accent-strong)" : "var(--text-secondary)", cursor: "pointer", background: value === o ? "var(--accent-soft)" : "transparent", fontWeight: value === o ? 600 : 400, border: 0, fontFamily: "var(--font-sans)" }}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ProblemsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialSearch = new URLSearchParams(location.search).get("search") || "";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
  const [topics, setTopics] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [filterDiff, setFilterDiff] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState("All");
  const [bookmarked, setBookmarked] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("cv_bookmarks") || "[]")); }
    catch { return new Set(); }
  });

  const query = useMemo(() => ({
    page,
    limit: PAGE_SIZE,
    published: true,
    ...(search ? { search } : {}),
    ...(filterDiff ? { difficulty: filterDiff } : {}),
    ...(filterTopic ? { topic: filterTopic } : {}),
    ...(filterCompany ? { company: filterCompany } : {}),
  }), [page, search, filterDiff, filterTopic, filterCompany]);

  const loadProblems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchList("/api/problems", query);
      setItems(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setItems([]);
      setTotalPages(1);
      setError(err.response?.data?.message || "Problems could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { loadProblems(); }, [loadProblems]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [statsRes, topicsRes, companiesRes] = await Promise.all([
          api.get("/api/problems/stats"),
          api.get("/api/problems/topics"),
          api.get("/api/problems/companies"),
        ]);
        if (!mounted) return;
        setStats(statsRes.data || {});
        setTopics(Array.isArray(topicsRes.data) ? topicsRes.data : []);
        setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
      } catch {
        if (!mounted) return;
      }
    })();
    return () => { mounted = false; };
  }, []);

  const visible = tab === "Bookmarked" ? items.filter((p) => bookmarked.has(p._id)) : items;

  const toggleBookmark = useCallback((id, e) => {
    e.stopPropagation();
    setBookmarked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("cv_bookmarks", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const clearFilters = () => {
    setSearch("");
    setFilterDiff("");
    setFilterTopic("");
    setFilterCompany("");
    setPage(1);
  };

  const total = stats.total || 0;

  return (
    <div className="problems-page" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Problems</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>{total} problems · Practice. Improve. Conquer.</p>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--bg-elevated)", padding: 4, borderRadius: 10, width: "fit-content" }}>
          {["All", "Bookmarked"].map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "white" : "var(--text-secondary)", fontSize: 13, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              {t}
            </button>
          ))}
        </div>

        <div className="problems-toolbar" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search problems or topics..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: 13, fontFamily: "var(--font-sans)" }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 16, padding: 0 }}>×</button>}
          </div>
          <FilterPill label="Topic" options={topics} value={filterTopic} onChange={(v) => { setFilterTopic(v); setPage(1); }} />
          <FilterPill label="Difficulty" options={["Easy", "Medium", "Hard"]} value={filterDiff} onChange={(v) => { setFilterDiff(v); setPage(1); }} />
          <FilterPill label="Company" options={companies} value={filterCompany} onChange={(v) => { setFilterCompany(v); setPage(1); }} />
          {(filterDiff || filterTopic || filterCompany || search) && (
            <button onClick={clearFilters} style={{ padding: "7px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-tertiary)", fontSize: 12.5, cursor: "pointer" }}>
              Clear All
            </button>
          )}
        </div>

        <div className="problems-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Total", val: stats.total || 0, color: "var(--accent)" },
            { label: "Easy", val: stats.easy || 0, color: "var(--green)" },
            { label: "Medium", val: stats.medium || 0, color: "var(--medium-color)" },
            { label: "Hard", val: stats.hard || 0, color: "var(--red)" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="problems-table" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div className="problems-table-head" style={{ display: "grid", gridTemplateColumns: "40px 1fr 110px 190px 130px 100px 40px", gap: 0, padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
            {["#", "Title", "Difficulty", "Topics", "Companies", "Acceptance", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTop: "2px solid var(--accent)", animation: "cv-spin 0.7s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-tertiary)", fontSize: 13, margin: 0 }}>Loading problems...</p>
              <style>{`@keyframes cv-spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : error ? (
            <div role="alert" style={{ padding: 40, textAlign: "center" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>
              <button type="button" onClick={loadProblems} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>Try again</button>
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>No problems match your filters.</div>
          ) : visible.map((p, idx) => {
            const n = (page - 1) * PAGE_SIZE + idx + 1;
            const isMarked = bookmarked.has(p._id);
            return (
              <div className="problems-table-row" key={p._id} role="button" tabIndex={0} aria-label={`Open problem: ${p.title}`} onClick={() => navigate(`/dashboard/problems/${p.slug}`)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/dashboard/problems/${p.slug}`); } }} style={{ display: "grid", gridTemplateColumns: "40px 1fr 110px 190px 130px 100px 40px", gap: 0, padding: "13px 20px", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{n}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>{p.title}</span>
                <DiffBadge d={p.difficulty} />
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(p.topic || []).slice(0, 2).map((t) => <span key={t} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "var(--bg-elevated-2)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{t}</span>)}
                  {(p.topic || []).length > 2 && <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>+{p.topic.length - 2}</span>}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(p.companies || []).slice(0, 3).map((c) => <span key={c} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: "var(--bg-elevated-2)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{c.slice(0, 2).toUpperCase()}</span>)}
                  {(p.companies || []).length > 3 && <span style={{ fontSize: 10, color: "var(--text-tertiary)", alignSelf: "center" }}>+{p.companies.length - 3}</span>}
                </div>
                <span style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", color: p.acceptanceRate >= 50 ? "var(--green)" : p.acceptanceRate >= 35 ? "var(--medium-color)" : "var(--red)" }}>{p.acceptanceRate ? `${p.acceptanceRate}%` : "—"}</span>
                <button type="button" aria-label={isMarked ? `Remove ${p.title} bookmark` : `Bookmark ${p.title}`} onClick={(e) => toggleBookmark(p._id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: isMarked ? "var(--amber)" : "var(--text-disabled)", display: "flex", padding: 4, borderRadius: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isMarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 20 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-secondary)", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 13, opacity: page === 1 ? 0.4 : 1 }}>
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-secondary)", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 13, opacity: page === totalPages ? 0.4 : 1 }}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
