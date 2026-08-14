import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/api";

const emptyDraft = {
  title: "",
  difficulty: "Medium",
  topic: "Array",
  company: "",
  style: "interview-prep",
};

const emptyProblemForm = {
  title: "",
  slug: "",
  source: "original",
  sourceId: "",
  sourceUrl: "",
  difficulty: "Medium",
  topicText: "",
  tagsText: "",
  companiesText: "",
  acceptanceRate: 0,
  points: 10,
  statement: "",
  description: "",
  constraintsText: "",
  examplesText: "[]",
  hintsText: "[]",
  editorial: "",
  starterCodeText: "{\n  \"cpp\": \"\",\n  \"java\": \"\",\n  \"python\": \"\",\n  \"javascript\": \"\"\n}",
  testCasesText: "[]",
  timeLimit: 2000,
  memoryLimit: 256,
  testcaseValidator: "standard",
  sheetText: "",
  isPublished: true,
};

const MissingChip = ({ label }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 8px",
      borderRadius: 999,
      background: "rgba(245, 158, 11, 0.16)",
      border: "1px solid rgba(245, 158, 11, 0.34)",
      color: "#FBBF24",
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      textTransform: "capitalize",
    }}
  >
    {label}
  </span>
);

function toCsvList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeParseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function problemToForm(problem) {
  return {
    title: problem?.title || "",
    slug: problem?.slug || "",
    source: problem?.source || "original",
    sourceId: problem?.sourceId || "",
    sourceUrl: problem?.sourceUrl || "",
    difficulty: problem?.difficulty || "Medium",
    topicText: (problem?.topic || []).join(", "),
    tagsText: (problem?.tags || []).join(", "),
    companiesText: (problem?.companies || []).join(", "),
    acceptanceRate: problem?.acceptanceRate ?? 0,
    points: problem?.points ?? 10,
    statement: problem?.statement || "",
    description: problem?.description || "",
    constraintsText: (problem?.constraints || []).join("\n"),
    examplesText: JSON.stringify(problem?.examples || [], null, 2),
    hintsText: JSON.stringify(problem?.hints || [], null, 2),
    editorial: problem?.editorial || "",
    starterCodeText: JSON.stringify(problem?.starterCode || {
      cpp: "",
      java: "",
      python: "",
      javascript: "",
    }, null, 2),
    testCasesText: JSON.stringify(problem?.testCases || [], null, 2),
    timeLimit: problem?.timeLimit ?? 2000,
    memoryLimit: problem?.memoryLimit ?? 256,
    testcaseValidator: problem?.testcaseValidator || "standard",
    sheetText: (problem?.sheet || []).join(", "),
    isPublished: problem?.isPublished !== false,
  };
}

function StatCard({ label, value, tone = "var(--accent)" }) {
  return (
    <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: tone, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, imported: 0, original: 0, published: 0 });
  const [problems, setProblems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState("generate");
  const [draftSpec, setDraftSpec] = useState(emptyDraft);
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runLogs, setRunLogs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [auditItems, setAuditItems] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditMissingFilter, setAuditMissingFilter] = useState("");
  const [executionLogs, setExecutionLogs] = useState([]);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionQuery, setExecutionQuery] = useState("");
  const [executionTypeFilter, setExecutionTypeFilter] = useState("");
  const [executionVerdictFilter, setExecutionVerdictFilter] = useState("");
  const [executionLanguageFilter, setExecutionLanguageFilter] = useState("");
  const [datasetFile, setDatasetFile] = useState(null);
  const [datasetContent, setDatasetContent] = useState("");
  const [datasetImportResult, setDatasetImportResult] = useState(null);
  const [problemForm, setProblemForm] = useState(emptyProblemForm);
  const [problemEditingId, setProblemEditingId] = useState(null);
  const [problemFormBusy, setProblemFormBusy] = useState(false);
  const auditSummary = useMemo(() => {
    const items = auditItems || [];
    const incomplete = items.filter((item) => !item.contentStatus?.isComplete);
    const counts = incomplete.reduce((acc, item) => {
      for (const key of item.contentStatus?.missing || []) {
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {});
    return { total: items.length, incomplete: incomplete.length, counts };
  }, [auditItems]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!token) { navigate("/login"); return; }
    if (user.role !== "admin") navigate("/dashboard");
    (async () => {
      try {
        const res = await api.get("/api/auth/me");
        setProfile(res.data?.profile || null);
      } catch {
        setProfile(null);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [statsRes, listRes] = await Promise.all([
          api.get("/api/problems/stats"),
          api.get(`/api/problems?published=all&page=${page}&limit=12`),
        ]);
        if (!mounted) return;
        setStats(statsRes.data || {});
        setProblems(listRes.data?.problems || []);
        setTotalPages(listRes.data?.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setMessage(error.response?.data?.message || "Failed to load admin data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [page]);

  useEffect(() => {
    let mounted = true;
    if (tab !== "import") return;
    (async () => {
      try {
        const [runsRes, stateRes] = await Promise.all([
          api.get("/api/import/runs"),
          api.get("/api/import/state"),
        ]);
        if (!mounted) return;
        setRuns(runsRes.data?.items || []);
        setStates(stateRes.data?.items || []);
      } catch (error) {
        if (!mounted) return;
        setMessage(error.response?.data?.message || "Failed to load import monitoring data");
      }
    })();
    return () => { mounted = false; };
  }, [tab]);

  useEffect(() => {
    let mounted = true;
    if (tab !== "audit") return;
    (async () => {
      try {
        setAuditLoading(true);
        const res = await api.get("/api/problems/audit/content", {
          params: auditMissingFilter ? { missing: auditMissingFilter } : {},
        });
        if (!mounted) return;
        setAuditItems(res.data?.items || []);
      } catch (error) {
        if (!mounted) return;
        setMessage(error.response?.data?.message || "Failed to load content audit");
      } finally {
        if (mounted) setAuditLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [tab, auditMissingFilter]);

  useEffect(() => {
    let mounted = true;
    if (tab !== "executions") return;
    (async () => {
      try {
        setExecutionLoading(true);
        const res = await api.get("/api/execution/logs", {
          params: {
            q: executionQuery || undefined,
            type: executionTypeFilter || undefined,
            verdict: executionVerdictFilter || undefined,
            language: executionLanguageFilter || undefined,
            limit: 25,
            page: 1,
          },
        });
        if (!mounted) return;
        setExecutionLogs(res.data?.items || []);
      } catch (error) {
        if (!mounted) return;
        setMessage(error.response?.data?.message || "Failed to load execution logs");
      } finally {
        if (mounted) setExecutionLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [tab, executionQuery, executionTypeFilter, executionVerdictFilter, executionLanguageFilter]);

  const openRun = async (id) => {
    try {
      const res = await api.get(`/api/import/runs/${id}`);
      setSelectedRun(res.data?.run || null);
      setRunLogs(res.data?.logs || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load run details");
    }
  };

  const previewProblem = useMemo(() => draft || null, [draft]);

  const handleGenerate = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await api.post("/api/import/generate/problem", draftSpec);
      setDraft(res.data.draft);
      setTab("preview");
      setMessage("Draft generated from local free AI.");
    } catch (error) {
      setMessage(error.response?.data?.message || "AI generation failed. Make sure Ollama is running on localhost:11434.");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage("");
    try {
      await api.post("/api/import/generate/problem/save", draft);
      setMessage("Problem saved to MongoDB.");
      setDraft(null);
      setTab("manage");
      const res = await api.get(`/api/problems?published=all&page=${page}&limit=12`);
      setProblems(res.data?.problems || []);
      setTotalPages(res.data?.totalPages || 1);
    } catch (error) {
      setMessage(error.response?.data?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (problem) => {
    setBusy(true);
    try {
      await api.put(`/api/problems/${problem._id}`, { isPublished: !problem.isPublished });
      setProblems((prev) => prev.map((p) => p._id === problem._id ? { ...p, isPublished: !problem.isPublished } : p));
      setMessage(`Problem ${problem.isPublished ? "unpublished" : "published"}.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Publish toggle failed");
    } finally {
      setBusy(false);
    }
  };

  const startNewProblem = () => {
    setProblemEditingId(null);
    setProblemForm(emptyProblemForm);
  };

  const startEditProblem = (problem) => {
    setProblemEditingId(problem._id);
    setProblemForm(problemToForm(problem));
    setTab("manage");
  };

  const saveProblemForm = async () => {
    setProblemFormBusy(true);
    setMessage("");
    try {
      const payload = {
        title: problemForm.title.trim(),
        slug: problemForm.slug.trim(),
        source: problemForm.source.trim() || "original",
        sourceId: problemForm.sourceId.trim() || undefined,
        sourceUrl: problemForm.sourceUrl.trim(),
        difficulty: problemForm.difficulty,
        topic: toCsvList(problemForm.topicText),
        tags: toCsvList(problemForm.tagsText),
        companies: toCsvList(problemForm.companiesText),
        acceptanceRate: Number(problemForm.acceptanceRate || 0),
        points: Number(problemForm.points || 10),
        statement: problemForm.statement,
        description: problemForm.description,
        constraints: String(problemForm.constraintsText || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        examples: safeParseJson(problemForm.examplesText, []),
        hints: safeParseJson(problemForm.hintsText, []),
        editorial: problemForm.editorial,
        starterCode: safeParseJson(problemForm.starterCodeText, {}),
        testCases: safeParseJson(problemForm.testCasesText, []),
        timeLimit: Number(problemForm.timeLimit || 2000),
        memoryLimit: Number(problemForm.memoryLimit || 256),
        testcaseValidator: String(problemForm.testcaseValidator || "standard"),
        sheet: toCsvList(problemForm.sheetText),
        isPublished: Boolean(problemForm.isPublished),
      };

      if (problemEditingId) {
        await api.put(`/api/problems/${problemEditingId}`, payload);
        setMessage("Problem updated.");
      } else {
        await api.post("/api/problems", payload);
        setMessage("Problem created.");
      }

      const res = await api.get(`/api/problems?published=all&page=${page}&limit=12`);
      setProblems(res.data?.problems || []);
      setTotalPages(res.data?.totalPages || 1);
      setProblemEditingId(null);
      setProblemForm(emptyProblemForm);
    } catch (error) {
      setMessage(error.response?.data?.message || "Problem save failed");
    } finally {
      setProblemFormBusy(false);
    }
  };

  const runBootstrap = async () => {
    setBusy(true);
    try {
      const res = await api.post("/api/import/bootstrap/bundled");
      setMessage(`Bootstrap complete: saved ${res.data.saved} problems.`);
      const listRes = await api.get(`/api/problems?published=all&page=1&limit=12`);
      setProblems(listRes.data?.problems || []);
      setTotalPages(listRes.data?.totalPages || 1);
      setPage(1);
    } catch (error) {
      setMessage(error.response?.data?.message || "Bootstrap failed");
    } finally {
      setBusy(false);
    }
  };

  const runSync = async () => {
    setBusy(true);
    try {
      const res = await api.post("/api/import/sync");
      setMessage(`Sync done. Codeforces: ${res.data.codeforces?.fetched || 0}, LeetCode: ${res.data.leetcode?.fetched || 0}`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDatasetFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    setDatasetFile(file);
    setDatasetImportResult(null);
    if (!file) {
      setDatasetContent("");
      return;
    }
    const text = await file.text();
    setDatasetContent(text);
  };

  const runDatasetUpload = async () => {
    if (!datasetFile || !datasetContent.trim()) {
      setMessage("Please choose a CSV or JSONL file first.");
      return;
    }
    setBusy(true);
    setMessage("");
    setDatasetImportResult(null);
    try {
      const res = await api.post("/api/import/upload", {
        fileName: datasetFile.name,
        content: datasetContent,
      });
      setDatasetImportResult(res.data);
      setMessage(`Upload complete. Imported ${res.data?.imported || 0}, failed ${res.data?.failed || 0}.`);
      const listRes = await api.get(`/api/problems?published=all&page=${page}&limit=12`);
      setProblems(listRes.data?.problems || []);
      setTotalPages(listRes.data?.totalPages || 1);
    } catch (error) {
      setMessage(error.response?.data?.message || "Dataset upload failed");
    } finally {
      setBusy(false);
    }
  };

  const repairImportedProblems = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await api.post("/api/problems/audit/repair-imported");
      setAuditItems(res.data?.items || []);
      setMessage(`Repair complete. Updated ${res.data?.updated || 0} problems.`);
      const listRes = await api.get(`/api/problems?published=all&page=${page}&limit=12`);
      setProblems(listRes.data?.problems || []);
      setTotalPages(listRes.data?.totalPages || 1);
    } catch (error) {
      setMessage(error.response?.data?.message || "Repair failed");
    } finally {
      setBusy(false);
    }
  };

  const republishCompletedImportedProblems = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await api.post("/api/problems/audit/republish-complete");
      setMessage(`Republished ${res.data?.updated || 0} complete imported problems.`);
      const auditRes = await api.get("/api/problems/audit/content", {
        params: auditMissingFilter ? { missing: auditMissingFilter } : {},
      });
      setAuditItems(auditRes.data?.items || []);
      const listRes = await api.get(`/api/problems?published=all&page=${page}&limit=12`);
      setProblems(listRes.data?.problems || []);
      setTotalPages(listRes.data?.totalPages || 1);
    } catch (error) {
      setMessage(error.response?.data?.message || "Republish failed");
    } finally {
      setBusy(false);
    }
  };

  const repairAuditItem = async (item) => {
    if (!item?._id) return;
    setBusy(true);
    setMessage("");
    try {
      await api.post(`/api/problems/audit/repair-imported/${item._id}`);
      const auditRes = await api.get("/api/problems/audit/content", {
        params: auditMissingFilter ? { missing: auditMissingFilter } : {},
      });
      setAuditItems(auditRes.data?.items || []);
      setMessage(`Repaired ${item.title}.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to repair problem");
    } finally {
      setBusy(false);
    }
  };

  const republishAuditItem = async (item) => {
    if (!item?._id) return;
    setBusy(true);
    setMessage("");
    try {
      await api.post(`/api/problems/audit/republish-complete/${item._id}`);
      const auditRes = await api.get("/api/problems/audit/content", {
        params: auditMissingFilter ? { missing: auditMissingFilter } : {},
      });
      setAuditItems(auditRes.data?.items || []);
      setMessage(`Republished ${item.title}.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to republish problem");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(129, 140, 248, 0.12), transparent 35%), #020617", color: "#E2E8F0", padding: 28, fontFamily: "Inter, sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: "-0.04em" }}>Admin Dashboard</h1>
            <p style={{ margin: "8px 0 0", color: "#94A3B8" }}>Build, import, publish, and scale the CodeVerse problem bank.</p>
            {profile && <p style={{ margin: "8px 0 0", color: "#C7D2FE", fontSize: 13 }}>Mailbox: {profile.email}</p>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setTab("manage")} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: tab === "manage" ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.03)", color: "#E2E8F0", cursor: "pointer" }}>Manage</button>
            <button onClick={() => setTab("generate")} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: tab === "generate" ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.03)", color: "#E2E8F0", cursor: "pointer" }}>AI Generate</button>
            <button onClick={() => setTab("import")} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: tab === "import" ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.03)", color: "#E2E8F0", cursor: "pointer" }}>Import</button>
            <button onClick={() => setTab("audit")} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: tab === "audit" ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.03)", color: "#E2E8F0", cursor: "pointer" }}>Content Audit</button>
            <button onClick={() => setTab("executions")} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: tab === "executions" ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.03)", color: "#E2E8F0", cursor: "pointer" }}>Execution Logs</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
          <StatCard label="Total Problems" value={stats.total || 0} tone="#8B5CF6" />
          <StatCard label="Published" value={stats.published || 0} tone="#34D399" />
          <StatCard label="Imported" value={stats.imported || 0} tone="#60A5FA" />
          <StatCard label="Original" value={stats.original || 0} tone="#F59E0B" />
        </div>

        {message && (
          <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#C7D2FE" }}>
            {message}
          </div>
        )}

        {tab === "generate" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 style={{ marginTop: 0 }}>Free AI Problem Generator</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <input value={draftSpec.title} onChange={(e) => setDraftSpec((s) => ({ ...s, title: e.target.value }))} placeholder="Title idea" style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <select value={draftSpec.difficulty} onChange={(e) => setDraftSpec((s) => ({ ...s, difficulty: e.target.value }))} style={inputStyle}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                  <input value={draftSpec.topic} onChange={(e) => setDraftSpec((s) => ({ ...s, topic: e.target.value }))} placeholder="Topic" style={inputStyle} />
                </div>
                <input value={draftSpec.company} onChange={(e) => setDraftSpec((s) => ({ ...s, company: e.target.value }))} placeholder="Company inspiration" style={inputStyle} />
                <input value={draftSpec.style} onChange={(e) => setDraftSpec((s) => ({ ...s, style: e.target.value }))} placeholder="Style" style={inputStyle} />
                <button onClick={handleGenerate} disabled={busy} style={primaryBtnStyle}>
                  {busy ? "Generating..." : "Generate Draft"}
                </button>
              </div>
              <p style={{ color: "#94A3B8", fontSize: 13, marginTop: 12 }}>
                Uses local Ollama on `localhost:11434`. No paid API needed.
              </p>
            </div>

            <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 style={{ marginTop: 0 }}>Draft Preview</h2>
              {previewProblem ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div><strong>Title:</strong> {previewProblem.title}</div>
                  <div><strong>Slug:</strong> {previewProblem.slug}</div>
                  <div><strong>Difficulty:</strong> {previewProblem.difficulty}</div>
                  <div><strong>Tags:</strong> {(previewProblem.tags || []).join(", ")}</div>
                  <div><strong>Companies:</strong> {(previewProblem.companies || []).join(", ")}</div>
                  <div style={{ whiteSpace: "pre-wrap", color: "#CBD5E1" }}>{previewProblem.statement}</div>
                  <button onClick={handleSave} disabled={busy} style={primaryBtnStyle}>
                    {busy ? "Saving..." : "Save to MongoDB"}
                  </button>
                </div>
              ) : (
                <div style={{ color: "#94A3B8" }}>Generate a draft to preview it here.</div>
              )}
            </div>
          </div>
        )}

        {tab === "import" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={panelStyle}>
              <h2 style={{ marginTop: 0 }}>Upload Dataset</h2>
              <p style={{ color: "#94A3B8", fontSize: 13, marginTop: 0 }}>
                Upload a `.csv` or `.jsonl` file. The file is read in the browser and sent as text to the backend importer.
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  type="file"
                  accept=".csv,.jsonl,.json"
                  onChange={handleDatasetFileChange}
                  style={inputStyle}
                />
                {datasetFile && (
                  <div style={{ fontSize: 12, color: "#C7D2FE" }}>
                    Selected: {datasetFile.name} {datasetContent ? `(${Math.max(1, datasetContent.split(/\r?\n/).filter(Boolean).length)} line(s))` : ""}
                  </div>
                )}
                <button onClick={runDatasetUpload} disabled={busy || !datasetFile} style={primaryBtnStyle}>
                  {busy ? "Importing..." : "Import Dataset File"}
                </button>
              </div>
              {datasetImportResult && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Last Import Result</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>
                    Imported: {datasetImportResult.imported || 0} · Failed: {datasetImportResult.failed || 0}
                  </div>
                  <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 220, overflow: "auto" }}>
                    {(datasetImportResult.report || []).slice(0, 20).map((item, index) => (
                      <div key={`${item.filePath}-${item.lineNumber || index}`} style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                          {item.status === "imported" ? "✓" : "✕"} {item.slug || item.filePath}
                        </div>
                        <div style={{ fontSize: 12, color: "#94A3B8" }}>
                          {item.filePath}{item.lineNumber ? ` · line ${item.lineNumber}` : ""}{item.missing?.length ? ` · missing: ${item.missing.join(", ")}` : ""}
                        </div>
                        {item.error && <div style={{ marginTop: 4, fontSize: 12, color: "#FCA5A5" }}>{item.error}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={panelStyle}>
              <h2 style={{ marginTop: 0 }}>Bootstrap & Sync</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={runBootstrap} disabled={busy} style={secondaryBtnStyle}>Bootstrap bundled problems</button>
                <button onClick={runSync} disabled={busy} style={secondaryBtnStyle}>Sync external metadata</button>
              </div>
              <p style={{ color: "#94A3B8", fontSize: 13 }}>
                Bootstrap loads your bundled seed corpus. Sync updates metadata only.
              </p>
            </div>
            <div style={panelStyle}>
              <h2 style={{ marginTop: 0 }}>Debug Source Fetch</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={async () => setMessage((await api.get("/api/import/debug/codeforces")).data.message || "Codeforces debug completed")} style={secondaryBtnStyle}>Debug Codeforces</button>
                <button onClick={async () => setMessage((await api.get("/api/import/debug/leetcode")).data.message || "LeetCode debug completed")} style={secondaryBtnStyle}>Debug LeetCode</button>
              </div>
            </div>

            <div style={panelStyle}>
              <h2 style={{ marginTop: 0 }}>Import Monitoring</h2>
              <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                {states.map((state) => (
                  <div key={state._id} style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{state.source}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>{state.status} · {state.lastProgress || 0}% · {state.lastMessage || "idle"}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>Run: {state.currentRunId || state.lastRunId || "—"}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {runs.map((run) => (
                  <button key={run._id} onClick={() => openRun(run._id)} style={{ ...secondaryBtnStyle, textAlign: "left" }}>
                    {run.source} · {run.status} · {run.fetched}/{run.total} fetched/scheduled
                  </button>
                ))}
              </div>
              {selectedRun && (
                <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Run Details</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>Source: {selectedRun.source}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>Status: {selectedRun.status}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>Progress: {selectedRun.progress || 0}%</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>Error: {selectedRun.error || "None"}</div>
                  <div style={{ marginTop: 10, fontFamily: "monospace", fontSize: 12 }}>
                    {runLogs.map((log) => (
                      <div key={log._id} style={{ padding: "4px 0", color: log.level === "error" ? "#F87171" : "#CBD5E1" }}>
                        [{log.level}] {log.step}: {log.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>Problem Content Audit</h2>
                <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 13 }}>Shows imported problems that are missing real statement, examples, constraints, starter code, or test cases.</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
              <StatCard label="Total" value={auditSummary.total} tone="#60A5FA" />
              <StatCard label="Incomplete" value={auditSummary.incomplete} tone="#F59E0B" />
              <StatCard label="Missing statement" value={auditSummary.counts.statement || 0} tone="#F87171" />
              <StatCard label="Missing testcases" value={auditSummary.counts.testCases || 0} tone="#A78BFA" />
              <StatCard label="Missing examples" value={auditSummary.counts.examples || 0} tone="#34D399" />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {["", "statement", "examples", "constraints", "starterCode", "testCases"].map((key) => (
                <button
                  key={key || "all"}
                  onClick={() => setAuditMissingFilter(key)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: auditMissingFilter === key ? "rgba(99,102,241,0.22)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#E2E8F0",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {key ? `missing ${key}` : "all"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <button onClick={repairImportedProblems} disabled={busy} style={secondaryBtnStyle}>Repair imported content</button>
              <button onClick={republishCompletedImportedProblems} disabled={busy} style={secondaryBtnStyle}>Republish complete imported</button>
            </div>
            {auditLoading ? (
              <div>Loading audit...</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {auditItems.filter((item) => !item.contentStatus?.isComplete).slice(0, 100).map((item) => (
                  <div key={item._id} style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>{item.source} · {item.difficulty}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {(item.contentStatus?.missing || []).length > 0 ? (
                        item.contentStatus.missing.map((field) => (
                          <MissingChip key={field} label={field} />
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>No missing fields reported</span>
                      )}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: item.contentStatus?.isComplete ? "#34D399" : "#F59E0B" }}>
                      Status: {item.contentStatus?.isComplete ? "Complete" : "Needs repair"}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button onClick={() => repairAuditItem(item)} disabled={busy} style={secondaryBtnStyle}>Repair this</button>
                      <button onClick={() => republishAuditItem(item)} disabled={busy || !item.contentStatus?.isComplete} style={secondaryBtnStyle}>Republish this</button>
                    </div>
                  </div>
                ))}
                {auditItems.filter((item) => !item.contentStatus?.isComplete).length === 0 && (
                  <div style={{ color: "#94A3B8" }}>No incomplete imported problems found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "executions" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Execution Logs</h2>
                  <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 13 }}>Search run and submit executions by execution ID, verdict, language, or code snippet.</p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input value={executionQuery} onChange={(e) => setExecutionQuery(e.target.value)} placeholder="Search logs..." style={textInputStyle} />
                  <select value={executionTypeFilter} onChange={(e) => setExecutionTypeFilter(e.target.value)} style={selectStyle}>
                    <option value="">All types</option>
                    <option value="run">Run</option>
                    <option value="submit">Submit</option>
                  </select>
                  <select value={executionVerdictFilter} onChange={(e) => setExecutionVerdictFilter(e.target.value)} style={selectStyle}>
                    <option value="">All verdicts</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Wrong Answer">Wrong Answer</option>
                    <option value="Runtime Error">Runtime Error</option>
                    <option value="Compilation Error">Compilation Error</option>
                    <option value="Time Limit Exceeded">Time Limit Exceeded</option>
                  </select>
                  <select value={executionLanguageFilter} onChange={(e) => setExecutionLanguageFilter(e.target.value)} style={selectStyle}>
                    <option value="">All languages</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
              </div>
            </div>

            {executionLoading ? (
              <div style={{ color: "#CBD5E1" }}>Loading execution logs...</div>
            ) : executionLogs.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {executionLogs.map((log) => (
                  <div key={log._id} style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontWeight: 800, color: "#E2E8F0" }}>{log.executionId}</div>
                        <div style={{ color: "#94A3B8", fontSize: 12 }}>
                          {log.type} · {log.language} · {log.problem?.title || log.problem} · {log.user?.username || log.user?.email || "guest"}
                        </div>
                      </div>
                      <div style={{ color: log.verdict === "Accepted" ? "#34D399" : "#F87171", fontWeight: 800 }}>{log.verdict}</div>
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gap: 8, color: "#CBD5E1", fontSize: 12.5 }}>
                      <div><strong>Runtime:</strong> {log.runtime || "—"} · <strong>Memory:</strong> {log.memory || "—"}</div>
                      <div><strong>Input:</strong> <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{log.input || "—"}</pre></div>
                      <div><strong>Expected:</strong> <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{log.expectedOutput || "—"}</pre></div>
                      <div><strong>Actual:</strong> <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{log.actualOutput || "—"}</pre></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#94A3B8" }}>No execution logs found.</div>
            )}
          </div>
        )}

        {tab === "manage" && (
          <div style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Problem Manager</h2>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={startNewProblem} disabled={busy || problemFormBusy} style={secondaryBtnStyle}>New Problem</button>
                <div style={{ color: "#94A3B8" }}>Page {page} of {totalPages}</div>
              </div>
            </div>
            <div style={{ marginBottom: 16, padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{problemEditingId ? "Edit Problem" : "Create Problem"}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>Core fields only, but fully real and editable.</div>
                </div>
                <button onClick={saveProblemForm} disabled={problemFormBusy} style={primaryBtnStyle}>
                  {problemFormBusy ? "Saving..." : problemEditingId ? "Update Problem" : "Create Problem"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <input value={problemForm.title} onChange={(e) => setProblemForm((s) => ({ ...s, title: e.target.value }))} placeholder="Title" style={inputStyle} />
                <input value={problemForm.slug} onChange={(e) => setProblemForm((s) => ({ ...s, slug: e.target.value }))} placeholder="Slug" style={inputStyle} />
                <select value={problemForm.difficulty} onChange={(e) => setProblemForm((s) => ({ ...s, difficulty: e.target.value }))} style={inputStyle}>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
                <input value={problemForm.source} onChange={(e) => setProblemForm((s) => ({ ...s, source: e.target.value }))} placeholder="Source" style={inputStyle} />
                <input value={problemForm.sourceId} onChange={(e) => setProblemForm((s) => ({ ...s, sourceId: e.target.value }))} placeholder="Source ID" style={inputStyle} />
                <input value={problemForm.sourceUrl} onChange={(e) => setProblemForm((s) => ({ ...s, sourceUrl: e.target.value }))} placeholder="Source URL" style={inputStyle} />
                <input value={problemForm.topicText} onChange={(e) => setProblemForm((s) => ({ ...s, topicText: e.target.value }))} placeholder="Topics, comma separated" style={inputStyle} />
                <input value={problemForm.tagsText} onChange={(e) => setProblemForm((s) => ({ ...s, tagsText: e.target.value }))} placeholder="Tags, comma separated" style={inputStyle} />
                <input value={problemForm.companiesText} onChange={(e) => setProblemForm((s) => ({ ...s, companiesText: e.target.value }))} placeholder="Companies, comma separated" style={inputStyle} />
                <input type="number" value={problemForm.points} onChange={(e) => setProblemForm((s) => ({ ...s, points: e.target.value }))} placeholder="Points" style={inputStyle} />
                <input type="number" value={problemForm.acceptanceRate} onChange={(e) => setProblemForm((s) => ({ ...s, acceptanceRate: e.target.value }))} placeholder="Acceptance rate" style={inputStyle} />
                <input type="number" value={problemForm.timeLimit} onChange={(e) => setProblemForm((s) => ({ ...s, timeLimit: e.target.value }))} placeholder="Time limit (ms)" style={inputStyle} />
                <input type="number" value={problemForm.memoryLimit} onChange={(e) => setProblemForm((s) => ({ ...s, memoryLimit: e.target.value }))} placeholder="Memory limit (MB)" style={inputStyle} />
                <select value={problemForm.testcaseValidator} onChange={(e) => setProblemForm((s) => ({ ...s, testcaseValidator: e.target.value }))} style={inputStyle}>
                  <option value="standard">Standard</option>
                  <option value="strict">Strict</option>
                  <option value="ignoreWhitespace">Ignore Whitespace</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E2E8F0" }}>
                  <input type="checkbox" checked={problemForm.isPublished} onChange={(e) => setProblemForm((s) => ({ ...s, isPublished: e.target.checked }))} />
                  Published
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <textarea value={problemForm.statement} onChange={(e) => setProblemForm((s) => ({ ...s, statement: e.target.value }))} rows={5} placeholder="Statement" style={{ ...inputStyle, minHeight: 120 }} />
                <textarea value={problemForm.description} onChange={(e) => setProblemForm((s) => ({ ...s, description: e.target.value }))} rows={5} placeholder="Description" style={{ ...inputStyle, minHeight: 120 }} />
                <textarea value={problemForm.constraintsText} onChange={(e) => setProblemForm((s) => ({ ...s, constraintsText: e.target.value }))} rows={5} placeholder="Constraints, one per line" style={{ ...inputStyle, minHeight: 120 }} />
                <textarea value={problemForm.editorial} onChange={(e) => setProblemForm((s) => ({ ...s, editorial: e.target.value }))} rows={5} placeholder="Editorial" style={{ ...inputStyle, minHeight: 120 }} />
                <textarea value={problemForm.examplesText} onChange={(e) => setProblemForm((s) => ({ ...s, examplesText: e.target.value }))} rows={8} placeholder='Examples JSON' style={{ ...inputStyle, minHeight: 160, fontFamily: "var(--font-mono)" }} />
                <textarea value={problemForm.hintsText} onChange={(e) => setProblemForm((s) => ({ ...s, hintsText: e.target.value }))} rows={8} placeholder='Hints JSON' style={{ ...inputStyle, minHeight: 160, fontFamily: "var(--font-mono)" }} />
                <textarea value={problemForm.starterCodeText} onChange={(e) => setProblemForm((s) => ({ ...s, starterCodeText: e.target.value }))} rows={8} placeholder='Starter code JSON' style={{ ...inputStyle, minHeight: 160, fontFamily: "var(--font-mono)" }} />
                <textarea value={problemForm.testCasesText} onChange={(e) => setProblemForm((s) => ({ ...s, testCasesText: e.target.value }))} rows={8} placeholder='Testcases JSON' style={{ ...inputStyle, minHeight: 160, fontFamily: "var(--font-mono)" }} />
              </div>
            </div>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  {problems.map((p) => (
                    <div key={p._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.title}</div>
                          <div style={{ fontSize: 12, color: "#94A3B8" }}>{p.source} · {p.difficulty} · {(p.tags || []).slice(0, 4).join(", ")}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => startEditProblem(p)} disabled={busy || problemFormBusy} style={secondaryBtnStyle}>
                            Edit
                          </button>
                          <button onClick={() => togglePublish(p)} disabled={busy} style={secondaryBtnStyle}>
                            {p.isPublished ? "Unpublish" : "Publish"}
                          </button>
                        </div>
                      </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={secondaryBtnStyle}>Prev</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={secondaryBtnStyle}>Next</button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "#E2E8F0",
  outline: "none",
};

const textInputStyle = inputStyle;
const selectStyle = inputStyle;

const panelStyle = {
  padding: 18,
  borderRadius: 18,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const primaryBtnStyle = {
  padding: "11px 14px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #7C3AED, #6366F1)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtnStyle = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "#E2E8F0",
  cursor: "pointer",
};
