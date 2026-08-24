// frontend/src/pages/dashboard/SheetsPage.jsx
//
// Real data only — same rule as the rest of your dashboard. No fake "85% complete"
// placeholders. The backend now returns a canonical sheet catalog, so tabs stay
// stable even when a sheet currently has no problems.
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchOne, fetchList } from "../../api/listFetch";

const DiffBadge = ({ d }) => {
    const cfg = {
        Easy:   { color: "var(--green)",        bg: "var(--green-soft)" },
        Medium: { color: "var(--medium-color)", bg: "var(--medium-soft)" },
        Hard:   { color: "var(--red)",          bg: "var(--red-soft)" },
    }[d] || { color: "var(--text-tertiary)", bg: "var(--bg-elevated-2)" };
    return (
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 6, color: cfg.color, background: cfg.bg }}>
            {d}
        </span>
    );
};

const SHEET_COLORS = {
    Blind75: "var(--accent)",
    "TOP 150": "var(--cyan)",
    "PLACEMENT 100": "var(--green)",
    Striver: "var(--medium-color)",
};

// ── Sheet picker tabs (top) ─────────────────────────────────────────
function SheetTabs({ sheets, active, onSelect }) {
    return (
        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
            {sheets.map((s) => {
                const isActive = s.name === active;
                const color = SHEET_COLORS[s.name] || "var(--accent)";
                return (
                    <button key={s.name} onClick={() => onSelect(s.name)}
                        style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                            borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)",
                            border: `1px solid ${isActive ? color : "var(--border-default)"}`,
                            background: isActive ? "var(--accent-soft)" : "var(--bg-elevated)",
                        }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: isActive ? "var(--accent-strong)" : "var(--text-primary)" }}>{s.label || s.name}</span>
                        <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>{s.solved}/{s.total}</span>
                        <div style={{ width: 40, height: 4, background: "var(--bg-elevated-2)", borderRadius: 100, overflow: "hidden" }}>
                            <div style={{ width: `${s.pct}%`, height: "100%", background: color, borderRadius: 100 }} />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// ── Hero stats row ────────────────────────────────────────────────
function HeroStats({ stats, sheetName, onContinue, onRandom }) {
    const safeStats = stats || { total: 0, solved: 0, easy: 0, medium: 0, hard: 0, pct: 0 };
    const items = [
        { label: "Total", val: safeStats.total, color: "var(--text-primary)" },
        { label: "Solved", val: safeStats.solved, color: "var(--green)" },
        { label: "Easy", val: safeStats.easy, color: "var(--green)" },
        { label: "Medium", val: safeStats.medium, color: "var(--medium-color)" },
        { label: "Hard", val: safeStats.hard, color: "var(--red)" },
    ];
    const remaining = Math.max(0, safeStats.total - safeStats.solved);
    const progress = Math.min(100, Math.max(0, Number(safeStats.pct) || 0));
    return (
        <div className="cv-sheet-hero" style={{ background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "22px 24px 18px", marginBottom: 20, position: "relative", overflow: "hidden", boxShadow: "0 18px 45px rgba(0,0,0,0.18)" }}>
            <div style={{ position: "absolute", width: 260, height: 260, right: -100, top: -140, borderRadius: "50%", background: "var(--accent)", opacity: 0.09, filter: "blur(4px)" }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--accent-grad)" }} />
            <div className="cv-sheet-hero-main" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 18, position: "relative" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 0 5px var(--accent-soft)" }} /><span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent-strong)" }}>Your practice roadmap</span></div>
                    <h1 style={{ fontSize: 30, fontWeight: 900, color: "var(--text-primary)", margin: "0 0 5px", letterSpacing: "-0.045em" }}>{sheetName}</h1>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px" }}>{sheetName === "Blind75" ? "The essential interview patterns" : "A focused path to stronger problem solving"} · {remaining} problem{remaining === 1 ? "" : "s"} left</p>
                    <div style={{ width: "min(360px, 100%)", height: 6, borderRadius: 99, background: "var(--bg-elevated-2)", overflow: "hidden", marginBottom: 16 }}><div style={{ width: `${progress}%`, height: "100%", borderRadius: 99, background: "var(--accent-grad)", transition: "width 300ms ease" }} /></div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={onContinue} style={{ padding: "9px 17px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "white", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 18px rgba(255,159,10,0.18)" }}>Continue practice <span aria-hidden="true">→</span></button>
                        <button type="button" onClick={onRandom} style={{ padding: "9px 15px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated-2)", color: "var(--text-primary)", border: "1px solid var(--border-default)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Surprise me</button>
                    </div>
                </div>
                <div className="cv-sheet-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(72px, 1fr))", gap: 8, width: "min(100%, 560px)" }}>
                    {items.map((it) => (
                        <div key={it.label} style={{ textAlign: "center", padding: "8px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: it.color, fontFamily: "var(--font-mono)" }}>{it.val}</div>
                            <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{it.label}</div>
                        </div>
                    ))}
                </div>
            </div>
            <style>{`@media (max-width: 640px) { .cv-sheet-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; width: 100% !important; } .cv-sheet-hero-main > div:first-child { width: 100%; } }`}</style>
        </div>
    );
}

// ── Expandable category ───────────────────────────────────────────
function CategoryCard({ cat, sheetName, isOpen, onToggle }) {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadPage = useCallback(async (p) => {
        setLoading(true);
        try {
            const data = await fetchOne(`/api/sheets/${encodeURIComponent(sheetName)}`, {
                expand: cat.name, page: p, limit: 10,
            });
            setExpanded(data.expanded);
            setPage(p);
        } catch {
            setExpanded(null);
        } finally {
            setLoading(false);
        }
    }, [sheetName, cat.name]);

    useEffect(() => {
        if (isOpen && !expanded) loadPage(1);
    }, [isOpen, expanded, loadPage]);

    return (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 10 }}>
            <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{cat.name}</span>
                <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>{cat.solved}/{cat.total}</span>
                <div style={{ width: 80, height: 5, background: "var(--bg-elevated-2)", borderRadius: 100, overflow: "hidden" }}>
                    <div style={{ width: `${cat.pct}%`, height: "100%", background: cat.pct === 100 ? "var(--green)" : "var(--accent)", borderRadius: 100 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", color: cat.pct === 100 ? "var(--green)" : "var(--text-secondary)", width: 36, textAlign: "right" }}>{cat.pct}%</span>
            </button>

            {isOpen && (
                <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    {loading ? (
                        <div style={{ padding: 20, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12.5 }}>Loading…</div>
                    ) : !expanded || expanded.items.length === 0 ? (
                        <div style={{ padding: 20, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12.5 }}>No problems in this category.</div>
                    ) : (
                        <>
                            {expanded.items.map((p) => (
                                <div key={p._id} onClick={() => navigate(`/dashboard/problems/${p.slug}`)}
                                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                    <div style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: p.solved ? "var(--green-soft)" : "var(--bg-elevated-2)", border: p.solved ? "1px solid var(--green)" : "1px solid var(--border-default)" }}>
                                        {p.solved && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                    </div>
                                    <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1, fontWeight: 500 }}>{p.title}</span>
                                    <DiffBadge d={p.difficulty} />
                                    <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", width: 40, textAlign: "right" }}>{p.acceptanceRate ? `${p.acceptanceRate}%` : "—"}</span>
                                </div>
                            ))}
                            {expanded.totalPages > 1 && (
                                <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "10px 0" }}>
                                    <button disabled={page === 1} onClick={() => loadPage(page - 1)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-secondary)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                                    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{page}/{expanded.totalPages}</span>
                                    <button disabled={page === expanded.totalPages} onClick={() => loadPage(page + 1)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-secondary)", cursor: page === expanded.totalPages ? "not-allowed" : "pointer", opacity: page === expanded.totalPages ? 0.4 : 1 }}>Next →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────
export default function SheetsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [sheets, setSheets] = useState([]);
    const [activeSheet, setActiveSheet] = useState(searchParams.get("sheet") || null);
    const [detail, setDetail] = useState(null);
    const [openCat, setOpenCat] = useState(null);
    const [loadingSheets, setLoadingSheets] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [error, setError] = useState(null);

    // Load sheet list once
    useEffect(() => {
        fetchList("/api/sheets")
            .then(({ items }) => {
                setSheets(items);
                if (!activeSheet && items.length > 0) setActiveSheet(items[0].name);
            })
            .catch(() => setError("Could not load sheets."))
            .finally(() => setLoadingSheets(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load detail whenever active sheet changes
    useEffect(() => {
        if (!activeSheet) return;
        setLoadingDetail(true);
        setOpenCat(null);
        fetchOne(`/api/sheets/${encodeURIComponent(activeSheet)}`)
            .then((data) => setDetail(data))
            .catch(() => setError(`Could not load "${activeSheet}".`))
            .finally(() => setLoadingDetail(false));
        setSearchParams({ sheet: activeSheet }, { replace: true });
    }, [activeSheet]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRandom = () => {
        if (!detail) return;
        const allCats = detail.categories;
        if (allCats.length === 0) return;
        // Pick a random category, then ask backend for page 1 of it and grab a random item.
        const cat = allCats[Math.floor(Math.random() * allCats.length)];
        fetchOne(`/api/sheets/${encodeURIComponent(activeSheet)}`, { expand: cat.name, page: 1, limit: 50 })
            .then((data) => {
                const items = data.expanded?.items || [];
                if (items.length === 0) return;
                const pick = items[Math.floor(Math.random() * items.length)];
                navigate(`/dashboard/problems/${pick.slug}`);
            });
    };

    if (loadingSheets) {
        return <div style={{ padding: 60, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>Loading sheets…</div>;
    }

    if (error) {
        return <div style={{ padding: 60, textAlign: "center", color: "var(--red)", fontSize: 13 }}>{error}</div>;
    }

    if (sheets.length === 0) {
        return (
            <div style={{ padding: 60, textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>No sheets yet</p>
                <p style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
                    Seed problems with a <code style={{ fontFamily: "var(--font-mono)" }}>sheet</code> field (e.g. run <code style={{ fontFamily: "var(--font-mono)" }}>node seed/seedProblems.js</code>) and they'll show up here automatically.
                </p>
            </div>
        );
    }

    return (
        <div>
            <SheetTabs sheets={sheets} active={activeSheet} onSelect={setActiveSheet} />

            {loadingDetail || !detail ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>Loading {activeSheet}…</div>
            ) : (
                <>
                    <HeroStats
                        stats={detail.stats}
                        sheetName={detail.sheet}
                        onContinue={() => navigate(`/dashboard/problems?sheet=${encodeURIComponent(detail.sheet)}`)}
                        onRandom={handleRandom}
                    />
                    {detail.categories.map((cat) => (
                        <CategoryCard
                            key={cat.name}
                            cat={cat}
                            sheetName={detail.sheet}
                            isOpen={openCat === cat.name}
                            onToggle={() => setOpenCat(openCat === cat.name ? null : cat.name)}
                        />
                    ))}
                </>
            )}
        </div>
    );
}
