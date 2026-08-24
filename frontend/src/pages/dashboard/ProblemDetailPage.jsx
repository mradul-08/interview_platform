// src/pages/dashboard/ProblemDetailPage.jsx
// Full LeetCode-style split panel: problem description + Monaco code editor
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Bookmark } from "lucide-react";
import api from "../../api/api";
import { getRealtimeSocket } from "../../realtime/socket";
import "./problemDetailFixes.css";

// ── Diff badge ────────────────────────────────────────────────────
const DiffBadge = ({ d }) => {
  const cfg = {
    Easy:   { color: "var(--green)",        bg: "var(--green-soft)" },
    Medium: { color: "var(--medium-color)", bg: "var(--medium-soft)" },
    Hard:   { color: "var(--red)",          bg: "var(--red-soft)" },
  }[d] || { color: "var(--text-tertiary)", bg: "var(--bg-elevated-2)" };
  return <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", padding: "3px 9px", borderRadius: 6, color: cfg.color, background: cfg.bg }}>{d}</span>;
};

// ── Language selector ─────────────────────────────────────────────
const LANGS = ["cpp", "java", "python", "javascript"];
const LANG_LABELS = { cpp: "C++", java: "Java", python: "Python", javascript: "JavaScript" };

const DEFAULT_CODE = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Read input from stdin and write the answer to stdout.
    return 0;
}`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        // Read input from stdin and write the answer to stdout.
    }
}`,
  python: `import sys

def main():
    # Read input from sys.stdin and write the answer to stdout.
    pass

if __name__ == "__main__":
    main()`,
  javascript: `"use strict";

const fs = require("fs");
const input = fs.readFileSync(0, "utf8");

// Parse input and print the answer with console.log(...).
void input;`,
};

// ── Simple syntax-highlighting textarea (no Monaco dependency) ────
// We use a <textarea> overlay pattern; Monaco can be swapped in later.
function CodeEditor({ value, onChange, language, fontSize, readOnly = false }) {
  const monacoLanguage = {
    cpp: "cpp",
    java: "java",
    python: "python",
    javascript: "javascript",
  }[language] || "javascript";

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 360, background: "var(--bg-canvas)" }}>
      <Editor
        height="100%"
        language={monacoLanguage}
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        theme="vs-dark"
        loading={<div style={{ padding: 16, color: "var(--text-tertiary)", fontSize: 13 }}>Loading editor...</div>}
        options={{
          fontSize,
          minimap: { enabled: false },
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          smoothScrolling: true,
          renderLineHighlight: "all",
          readOnly,
        }}
      />
    </div>
  );
}

// ── Testcase panel ────────────────────────────────────────────────
function TestcasePanel({ testcases, runResult, running }) {
  const [activeTC, setActiveTC] = useState(0);
  const [activeTab, setActiveTab] = useState("testcase"); // testcase | result
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div style={{ height: 220, background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-subtle)", paddingLeft: 16 }}>
        {[{ id: "testcase", label: "Testcase" }, { id: "result", label: "Run Code Result" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent", color: activeTab === t.id ? "var(--accent-strong)" : "var(--text-secondary)", fontSize: 12.5, fontWeight: activeTab === t.id ? 600 : 500, cursor: "pointer", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {activeTab === "testcase" && (
          <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {(testcases || []).slice(0, 5).map((_, i) => (
                <button key={i} onClick={() => setActiveTC(i)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid", borderColor: activeTC === i ? "var(--accent)" : "var(--border-default)", background: activeTC === i ? "var(--accent-soft)" : "transparent", color: activeTC === i ? "var(--accent-strong)" : "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>
                  Case {i + 1}
                </button>
              ))}
            </div>
            {testcases?.[activeTC] && (
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Input</div>
                  <pre style={{ margin: 0, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{testcases[activeTC].input}</pre>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected</div>
                  <pre style={{ margin: 0, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{testcases[activeTC].expectedOutput}</pre>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "result" && (
          <div>
            {running ? (
              <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Running your code…</div>
            ) : runResult ? (
              <div role={runResult.verdict === "Accepted" ? "status" : "alert"} aria-live="polite">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: runResult.verdict === "Accepted" ? "var(--green)" : "var(--red)" }}>
                    {runResult.verdict === "Accepted" ? "✓ Accepted" : `✗ ${runResult.verdict}`}
                  </span>
                  {runResult.executionId && <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Execution ID: {runResult.executionId}</span>}
                  {runResult.runtime && <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Runtime: {runResult.runtime}</span>}
                  {runResult.memory && <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Memory: {runResult.memory}</span>}
                </div>
                {runResult.actualOutput && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actual Output</div>
                    <pre style={{ margin: 0, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{runResult.actualOutput}</pre>
                  </div>
                )}
                {(runResult.status || runResult.compileOutput || runResult.stderr) && !showDetails && (
                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", fontSize: 12.25, color: "var(--text-secondary)" }}>
                    {runResult.verdict === "Compilation Error" && "Compiler rejected the code. Open details for the exact message."}
                    {runResult.verdict === "Runtime Error" && "The program crashed or exited unexpectedly. Open details to inspect the error."}
                    {runResult.verdict === "Time Limit Exceeded" && "The code exceeded the configured time limit. Open details for execution status."}
                    {runResult.verdict === "System Error" && "The execution service is temporarily unavailable. Your code was not evaluated."}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowDetails((current) => !current)}
                  style={{ marginTop: 10, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {showDetails ? "Hide details" : "Show details"}
                </button>
                {showDetails && (runResult.status || runResult.compileOutput || runResult.stderr) && (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {runResult.status && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Judge0 Status</div>
                        <pre style={{ margin: 0, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{JSON.stringify(runResult.status, null, 2)}</pre>
                      </div>
                    )}
                    {runResult.compileOutput && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Compile Output</div>
                        <pre style={{ margin: 0, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{runResult.compileOutput}</pre>
                      </div>
                    )}
                    {runResult.stderr && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stderr</div>
                        <pre style={{ margin: 0, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{runResult.stderr}</pre>
                      </div>
                    )}
                    {runResult.input && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Failed Input</div>
                        <pre style={{ margin: 0, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{runResult.input}</pre>
                      </div>
                    )}
                    {runResult.expectedOutput && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected Output</div>
                        <pre style={{ margin: 0, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{runResult.expectedOutput}</pre>
                      </div>
                    )}
                    {Array.isArray(runResult.trace) && runResult.trace.length > 0 && (
                      <div style={{ fontSize: 12.25, color: "var(--text-secondary)" }}>
                        Captured {runResult.trace.length} testcase step(s) for debugging.
                      </div>
                    )}
                  </div>
                )}
                {Array.isArray(runResult.testcaseResults) && runResult.testcaseResults.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Testcase Results</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {runResult.testcaseResults.map((tc, i) => (
                        <div key={i} style={{ padding: 10, borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: tc.verdict === "Accepted" ? "var(--green)" : "var(--red)" }}>
                              Case {i + 1}: {tc.verdict}
                            </span>
                            <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                              {tc.runtime || ""}{tc.memory ? ` · ${tc.memory}` : ""}
                            </span>
                          </div>
                          <div style={{ display: "grid", gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>Input</div>
                              <pre style={{ margin: 0, padding: "6px 10px", background: "var(--bg-surface)", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>{tc.input}</pre>
                            </div>
                            <div>
                              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>Expected</div>
                              <pre style={{ margin: 0, padding: "6px 10px", background: "var(--bg-surface)", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>{tc.expectedOutput}</pre>
                            </div>
                            <div>
                              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>Output</div>
                              <pre style={{ margin: 0, padding: "6px 10px", background: "var(--bg-surface)", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>{tc.output}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Run your code to see results.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Left panel tabs ───────────────────────────────────────────────
function ProblemPanel({ problem, userSubmissions }) {
  const [activeTab, setActiveTab] = useState("problem");
  const [discussions, setDiscussions] = useState([]);
  const [discussionBody, setDiscussionBody] = useState("");
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionSubmitting, setDiscussionSubmitting] = useState(false);
  const [discussionError, setDiscussionError] = useState("");
  const [solutions, setSolutions] = useState(null);
  const [solutionsLoading, setSolutionsLoading] = useState(false);
  const [solutionsError, setSolutionsError] = useState("");
  const tabs = ["Problem", "Submissions", "Discuss", "Solutions"];
  const isAdmin = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}")?.role === "admin";
    } catch {
      return false;
    }
  })();

  const statementText = String(problem?.statement || problem?.description || "").trim();
  const inputFormatText = String(problem?.inputFormat || "").trim();
  const outputFormatText = String(problem?.outputFormat || "").trim();
  const examples = Array.isArray(problem?.examples) ? problem.examples : [];
  const constraints = Array.isArray(problem?.constraints) ? problem.constraints : [];

  const Section = ({ title, children, compact = false }) => (
    <section style={{ marginBottom: compact ? 14 : 18 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, letterSpacing: "-0.01em" }}>{title}</div>
      {children}
    </section>
  );

  useEffect(() => {
    if (activeTab !== "discuss" || !problem?._id) return;
    let mounted = true;
    setDiscussionLoading(true);
    setDiscussionError("");
    api.get(`/api/problems/${problem._id}/discussions`)
      .then((res) => {
        if (!mounted) return;
        setDiscussions(Array.isArray(res.data?.items) ? res.data.items : []);
      })
      .catch((error) => {
        if (!mounted) return;
        setDiscussionError(error.response?.data?.message || "Failed to load discussions");
      })
      .finally(() => {
        if (!mounted) return;
        setDiscussionLoading(false);
      });
    return () => { mounted = false; };
  }, [activeTab, problem?._id]);

  useEffect(() => {
    if (activeTab !== "solutions" || !problem?._id) return;
    let mounted = true;
    setSolutionsLoading(true);
    setSolutionsError("");
    api.get(`/api/problems/${problem._id}/solutions`)
      .then((res) => {
        if (!mounted) return;
        setSolutions(res.data || null);
      })
      .catch((error) => {
        if (!mounted) return;
        setSolutionsError(error.response?.data?.message || "Failed to load solutions");
      })
      .finally(() => {
        if (!mounted) return;
        setSolutionsLoading(false);
      });
    return () => { mounted = false; };
  }, [activeTab, problem?._id]);

  const handleCreateDiscussion = async (e, parentId = null, bodyValue = null) => {
    e.preventDefault();
    const body = String(bodyValue ?? discussionBody).trim();
    if (!body || !problem?._id) return;
    setDiscussionSubmitting(true);
    setDiscussionError("");
    try {
      const res = await api.post(`/api/problems/${problem._id}/discussions`, { body, parentId });
      if (parentId) {
        const addReply = (items) => items.map((item) => {
          if (item._id === parentId) {
            return { ...item, replies: [...(item.replies || []), res.data] };
          }
          return { ...item, replies: Array.isArray(item.replies) ? addReply(item.replies) : [] };
        });
        setDiscussions((prev) => addReply(prev));
        setReplyTargetId(null);
        setReplyBody("");
      } else {
        setDiscussions((prev) => [res.data, ...prev]);
        setDiscussionBody("");
      }
    } catch (error) {
      setDiscussionError(error.response?.data?.message || "Failed to post discussion");
    } finally {
      setDiscussionSubmitting(false);
    }
  };

  const renderDiscussionNode = (item, depth = 0) => (
    <div key={item._id} style={{ padding: 12, borderRadius: 10, background: depth ? "var(--bg-surface)" : "var(--bg-elevated)", border: "1px solid var(--border-subtle)", marginLeft: depth ? 18 : 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>
          {item.author?.name || item.author?.username || "Anonymous"}
        </span>
        <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{new Date(item.createdAt).toLocaleString()}</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{item.body}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button
          type="button"
          onClick={() => { setReplyTargetId((current) => current === item._id ? null : item._id); setReplyBody(""); }}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
        >
          Reply
        </button>
      </div>
      {replyTargetId === item._id && (
        <form onSubmit={(e) => handleCreateDiscussion(e, item._id, replyBody)} style={{ marginTop: 10 }}>
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={`Reply to ${item.author?.name || item.author?.username || "this discussion"}...`}
            rows={3}
            style={{ width: "100%", resize: "vertical", padding: 12, borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: 13, outline: "none" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <button type="button" onClick={() => { setReplyTargetId(null); setReplyBody(""); }} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={discussionSubmitting || !replyBody.trim()} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "white", fontWeight: 700, cursor: discussionSubmitting || !replyBody.trim() ? "not-allowed" : "pointer", opacity: discussionSubmitting || !replyBody.trim() ? 0.6 : 1 }}>
              {discussionSubmitting ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </form>
      )}
      {Array.isArray(item.replies) && item.replies.length > 0 && (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {item.replies.map((reply) => renderDiscussionNode(reply, depth + 1))}
        </div>
      )}
    </div>
  );

  const handleMarkSolution = async (discussionId) => {
    if (!problem?._id || !discussionId) return;
    try {
      await api.post(`/api/problems/${problem._id}/solutions/${discussionId}/mark`);
      setSolutions((prev) => {
        if (!prev) return prev;
        const communitySolutions = (prev.communitySolutions || []).map((item) =>
          item._id === discussionId ? { ...item, isSolution: true } : item
        );
        return { ...prev, communitySolutions };
      });
      setDiscussions((prev) => prev.map((item) => item._id === discussionId ? { ...item, isSolution: true } : item));
    } catch (error) {
      setSolutionsError(error.response?.data?.message || "Failed to mark solution");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tab bar */}
      <div role="tablist" aria-label="Problem information" style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", paddingLeft: 20, flexShrink: 0 }}>
        {tabs.map(t => (
          <button type="button" role="tab" aria-selected={activeTab === t.toLowerCase()} key={t} onClick={() => setActiveTab(t.toLowerCase())}
            style={{ padding: "12px 16px", background: "none", border: "none", borderBottom: activeTab === t.toLowerCase() ? "2px solid var(--accent)" : "2px solid transparent", color: activeTab === t.toLowerCase() ? "var(--accent-strong)" : "var(--text-secondary)", fontSize: 13, fontWeight: activeTab === t.toLowerCase() ? 600 : 500, cursor: "pointer", marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {activeTab === "problem" && (
          <div>
            {/* Title + badges */}
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                #{problem.order || "—"} {problem.title}
              </h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <DiffBadge d={problem.difficulty} />
                {(problem.topic || []).map(t => (
                  <span key={t} style={{ fontSize: 11.5, padding: "3px 8px", borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-strong)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>{t}</span>
                ))}
                {(problem.companies || []).length > 0 && (
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Companies: {problem.companies.slice(0, 3).join(", ")}{problem.companies.length > 3 ? ` +${problem.companies.length - 3}` : ""}</span>
                )}
              </div>
            </div>

            {/* Problem statement */}
            {statementText && (
              <Section title="Problem Statement">
                <div style={{ fontSize: 13.5, lineHeight: 1.8, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                  {statementText}
                </div>
              </Section>
            )}

            {/* Input / Output */}
            {(inputFormatText || outputFormatText) && (
              <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                {inputFormatText && (
                  <Section title="Input Format" compact>
                    <div style={{ fontSize: 13.25, lineHeight: 1.7, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                      {inputFormatText}
                    </div>
                  </Section>
                )}
                {outputFormatText && (
                  <Section title="Output Format" compact>
                    <div style={{ fontSize: 13.25, lineHeight: 1.7, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                      {outputFormatText}
                    </div>
                  </Section>
                )}
              </div>
            )}

            {/* Examples */}
            {examples.length > 0 && (
              <Section title="Examples">
                <div style={{ display: "grid", gap: 12 }}>
                  {examples.map((ex, i) => (
                    <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13, fontFamily: "var(--font-mono)", borderLeft: "3px solid var(--border-strong)" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>Example {i + 1}</div>
                      {ex.input && <div style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}><span style={{ color: "var(--text-tertiary)" }}>Input: </span><span style={{ color: "var(--text-primary)" }}>{ex.input}</span></div>}
                      {ex.output && <div style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}><span style={{ color: "var(--text-tertiary)" }}>Output: </span><span style={{ color: "var(--text-primary)" }}>{ex.output}</span></div>}
                      {ex.explanation && <div style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 12.5, fontFamily: "var(--font-sans)", whiteSpace: "pre-wrap" }}><span style={{ fontWeight: 600 }}>Explanation: </span>{ex.explanation}</div>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Constraints */}
            {constraints.length > 0 && (
              <Section title="Constraints">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {constraints.map((c, i) => (
                    <li key={i} style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 4 }}>{c}</li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Stats footer */}
            <div style={{ display: "flex", gap: 20, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", marginTop: 20 }}>
              {[{ label: "Acceptance", val: problem.acceptanceRate ? `${problem.acceptanceRate}%` : "—" },
                { label: "Difficulty", val: problem.difficulty || "—" },
              ].map(it => (
                <div key={it.label}>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{it.label}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{it.val}</div>
                </div>
              ))}
              {problem.sourceUrl && (
                <a href={problem.sourceUrl} target="_blank" rel="noopener noreferrer"
                  style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--accent-strong)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, background: "var(--accent-soft)" }}>
                  Open on LeetCode →
                </a>
              )}
            </div>
          </div>
        )}
        {activeTab === "submissions" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Your Submissions</div>
            {Array.isArray(userSubmissions) && userSubmissions.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {userSubmissions.map((sub) => (
                  <div key={sub._id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sub.verdict === "Accepted" ? "var(--green)" : "var(--red)" }}>{sub.verdict}</span>
                      <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{new Date(sub.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
                      <span>Language: <strong style={{ color: "var(--text-primary)" }}>{sub.language}</strong></span>
                      {sub.runtime && <span>Runtime: <strong style={{ color: "var(--text-primary)" }}>{sub.runtime}</strong></span>}
                      {sub.memory && <span>Memory: <strong style={{ color: "var(--text-primary)" }}>{sub.memory}</strong></span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No submissions yet for this problem.</div>
            )}
          </div>
        )}
        {activeTab === "discuss" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Discussion</div>
            <form onSubmit={handleCreateDiscussion} style={{ marginBottom: 16 }}>
              <textarea
                value={discussionBody}
                onChange={(e) => setDiscussionBody(e.target.value)}
                placeholder="Ask a question or add your thought..."
                rows={4}
                style={{ width: "100%", resize: "vertical", padding: 12, borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: 13, outline: "none" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{discussionError || ""}</span>
                <button type="submit" disabled={discussionSubmitting || !discussionBody.trim()} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "white", fontWeight: 700, cursor: discussionSubmitting || !discussionBody.trim() ? "not-allowed" : "pointer", opacity: discussionSubmitting || !discussionBody.trim() ? 0.6 : 1 }}>
                  {discussionSubmitting ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
            {discussionLoading ? (
              <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading discussions…</div>
            ) : discussions.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {discussions.map((item) => renderDiscussionNode(item))}
              </div>
            ) : (
              <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No discussions yet. Start the thread.</div>
            )}
          </div>
        )}
        {activeTab === "solutions" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Solutions</div>
              {solutionsLoading ? (
                <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading solutions…</div>
              ) : solutionsError ? (
                <div style={{ color: "var(--red)", fontSize: 13 }}>{solutionsError}</div>
              ) : solutions ? (
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>Editorial</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                      {solutions.editorial?.trim() || "No editorial has been added yet."}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>Community Solutions</div>
                    {Array.isArray(solutions.communitySolutions) && solutions.communitySolutions.length > 0 ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {solutions.communitySolutions.map((solution) => (
                          <div key={solution._id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>
                                {solution.author?.name || solution.author?.username || "Anonymous"}
                              </span>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {solution.isSolution && <span style={{ fontSize: 11.5, color: "var(--green)", fontWeight: 700 }}>Marked Solution</span>}
                                <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{new Date(solution.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{solution.body}</div>
                            {isAdmin && !solution.isSolution && (
                              <div style={{ marginTop: 10 }}>
                                <button onClick={() => handleMarkSolution(solution._id)} style={{ padding: "7px 11px", borderRadius: 8, border: "none", background: "var(--accent)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                  Mark as solution
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No community solutions yet.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No solutions data available.</div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

// Kept as a reusable panel for the problem workspace variants.
export { TestcasePanel };

// ── Main page ─────────────────────────────────────────────────────
export default function ProblemDetailPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const competitiveTestId = searchParams.get("competitiveTestId");
  const competitiveTestAttemptId = searchParams.get("competitiveTestAttemptId");
  const competitiveGroupId = searchParams.get("groupId");
  const [problem, setProblem]   = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [bookmarkError, setBookmarkError] = useState("");
  const [userSubmissions, setUserSubmissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lang, setLang]         = useState("cpp");
  const [code, setCode]         = useState(DEFAULT_CODE.cpp);
  const [fontSize, setFontSize] = useState(14);
  const [running, setRunning]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [competitiveContext, setCompetitiveContext] = useState(null);
  const [competitiveContextError, setCompetitiveContextError] = useState("");
  const [competitiveNow, setCompetitiveNow] = useState(Date.now());
  const [competitiveClockOffset, setCompetitiveClockOffset] = useState(0);
  const [competitiveExpired, setCompetitiveExpired] = useState(false);
  const [splitPct, setSplitPct] = useState(50); // left panel %
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        setFontSize((size) => Math.min(24, size + 1));
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setFontSize((size) => Math.max(10, size - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    setProblem(null);
    api.get(`/api/problems/slug/${slug}`).then(res => {
      setProblem(res.data);
      setBookmarked(Boolean(res.data?.bookmarked));
      setUserSubmissions(res.data.userSubmissions || []);
      setLoading(false);
    }).catch((error) => {
      setLoadError(error.response?.data?.message || "Problem could not be loaded. Please try again.");
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!problem?._id) return undefined;
    const socket = getRealtimeSocket();
    const onBookmark = (event) => {
      if (String(event?.problem?._id) !== String(problem._id)) return;
      setBookmarked(Boolean(event.bookmarked));
      setBookmarkError("");
    };
    socket.on("problem:bookmark-updated", onBookmark);
    return () => socket.off("problem:bookmark-updated", onBookmark);
  }, [problem?._id]);

  useEffect(() => {
    if (!competitiveTestId || !competitiveTestAttemptId || !competitiveGroupId) return undefined;
    if (![competitiveTestId, competitiveTestAttemptId, competitiveGroupId].every((value) => /^[a-f\d]{24}$/i.test(value))) return undefined;
    let active = true;
    setCompetitiveContextError("");
    const loadCompetitiveContext = () => api.get(`/api/study-groups/${competitiveGroupId}/competitive-tests/${competitiveTestId}`).then((res) => {
      if (!active) return;
      if (!res.data?.attempt || String(res.data.attempt._id) !== String(competitiveTestAttemptId)) {
        setCompetitiveContext(null);
        setCompetitiveContextError("This competitive-test attempt is unavailable for your account.");
        return;
      }
      const serverTime = Date.parse(res.data.serverNow || "");
      if (Number.isFinite(serverTime)) setCompetitiveClockOffset(serverTime - Date.now());
      setCompetitiveContext(res.data);
      if (res.data.attempt.status !== "STARTED" && res.data.attempt.status !== "COMPLETED" && res.data.attempt.status !== "PARTIAL") {
        setCompetitiveContextError("Start this participant attempt from the Live Tests board before submitting.");
      }
    }).catch((error) => { if (active) { setCompetitiveContext(null); setCompetitiveContextError(error.response?.data?.message || "The live-test timer could not be verified."); } });
    loadCompetitiveContext();
    const timer = window.setInterval(() => setCompetitiveNow(Date.now()), 1000);
    const refresh = (event) => { if (String(event?.testId) === String(competitiveTestId)) loadCompetitiveContext(); };
    const socket = getRealtimeSocket();
    socket.on("group:test", refresh);
    socket.on("group:test-participant", refresh);
    socket.on("group:test-progress", refresh);
    const contextPoll = window.setInterval(loadCompetitiveContext, 5000);
    return () => { active = false; window.clearInterval(timer); window.clearInterval(contextPoll); socket.off("group:test", refresh); socket.off("group:test-participant", refresh); socket.off("group:test-progress", refresh); };
  }, [competitiveGroupId, competitiveTestAttemptId, competitiveTestId]);

  const isCompetitive = Boolean(competitiveTestId && competitiveTestAttemptId && competitiveGroupId && [competitiveTestId, competitiveTestAttemptId, competitiveGroupId].every((value) => /^[a-f\d]{24}$/i.test(value)));

  useEffect(() => {
    if (!problem?._id) return undefined;
    let active = true;
    const loadSubmissions = () => api.get(`/api/submissions/problem/${problem._id}`).then((res) => active && setUserSubmissions(res.data || [])).catch(() => {});
    loadSubmissions();
    const timer = window.setInterval(loadSubmissions, isCompetitive ? 3000 : 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [problem?._id, isCompetitive]);

  const competitiveEndsAt = competitiveContext?.attempt?.endsAt || competitiveContext?.test?.endsAt;
  const competitiveRemaining = competitiveEndsAt ? Math.max(0, Math.ceil((new Date(competitiveEndsAt).getTime() - (competitiveNow + competitiveClockOffset)) / 1000)) : null;
  const competitiveDanger = competitiveRemaining !== null && competitiveRemaining <= 60;
  const formatCompetitiveClock = (seconds) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (!isCompetitive || competitiveRemaining !== 0 || competitiveExpired) return;
    setCompetitiveExpired(true);
    const timer = window.setTimeout(() => navigate(`/dashboard/groups/${competitiveGroupId}?tab=${encodeURIComponent("Live Tests")}`), 2500);
    return () => window.clearTimeout(timer);
  }, [competitiveGroupId, competitiveExpired, competitiveRemaining, isCompetitive, navigate]);

  // Update code when language changes
  useEffect(() => {
    setCode(DEFAULT_CODE[lang] || "// Write a complete stdin/stdout program");
  }, [lang]);

  const resetStarterTemplate = () => {
    setCode(DEFAULT_CODE[lang] || "// Write a complete stdin/stdout program");
  };

  const toggleProblemBookmark = async () => {
    if (!problem?._id || bookmarkBusy) return;
    const nextBookmarked = !bookmarked;
    setBookmarkBusy(true);
    setBookmarkError("");
    setBookmarked(nextBookmarked);
    try {
      await api.request({ method: nextBookmarked ? "post" : "delete", url: `/api/problems/${problem._id}/bookmark` });
    } catch (error) {
      setBookmarked(!nextBookmarked);
      setBookmarkError(error.response?.data?.message || "Bookmark could not be updated.");
    } finally {
      setBookmarkBusy(false);
    }
  };

  const normalizeExecutionResult = (data) => ({
    success: Boolean(data?.success ?? true),
    executionId: data?.executionId || "",
    verdict: data?.verdict || "System Error",
    output: data?.output || "",
    stdout: data?.stdout || data?.output || "",
    actualOutput: data?.actualOutput || data?.output || "",
    runtime: data?.runtime || "",
    memory: data?.memory || "",
    stderr: data?.stderr || "",
    compileOutput: data?.compileOutput || "",
    status: data?.status || null,
    testcaseResults: Array.isArray(data?.testcaseResults) ? data.testcaseResults : [],
    trace: Array.isArray(data?.trace) ? data.trace : [],
    input: data?.input || "",
    expectedOutput: data?.expectedOutput || "",
    failedTestcase: data?.failedTestcase || null,
    generatedSource: data?.generatedSource || "",
    judge0Request: data?.judge0Request || {},
    judge0Response: data?.judge0Response || {},
  });

  // Drag to resize
  const startDrag = (e) => {
    setDragging(true);
    e.preventDefault();
  };
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const { left, width } = container.getBoundingClientRect();
      const pct = Math.min(70, Math.max(30, ((e.clientX - left) / width) * 100));
      setSplitPct(pct);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const handleRun = async () => {
    if (running || submitting || !problem || competitiveExpired) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await api.post("/api/execution/run", {
        problemId: problem?._id,
        code,
        language: lang,
      });
      setRunResult(normalizeExecutionResult(res.data));
    } catch (error) {
      setRunResult({
        success: false,
        executionId: "",
        verdict: error.response?.data?.message || "Run failed",
        output: "",
        stdout: "",
        actualOutput: "",
        runtime: "",
        memory: "",
        stderr: error.response?.data?.stderr || "",
        compileOutput: error.response?.data?.compileOutput || "",
        status: error.response?.data?.status || null,
        testcaseResults: [],
        trace: [],
        input: "",
        expectedOutput: "",
        failedTestcase: null,
        generatedSource: error.response?.data?.generatedSource || "",
        judge0Request: error.response?.data?.judge0Request || {},
        judge0Response: error.response?.data?.judge0Response || {},
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem || running || submitting || competitiveExpired || (isCompetitive && competitiveContext?.attempt?.status !== "STARTED")) return;
    setSubmitting(true);
    setRunResult(null);
    try {
      const res = await api.post("/api/execution/submit", {
        problemId: problem._id,
        code,
        language: lang,
        ...(isCompetitive ? { competitiveTestId, competitiveTestAttemptId } : {}),
      });
      setRunResult(normalizeExecutionResult(res.data));
      setUserSubmissions((current) => [res.data.submission, ...current.filter((item) => item._id !== res.data.submission?._id)]);
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.message === "Competitive test deadline has passed") {
        setCompetitiveExpired(true);
      }
      setRunResult({
        success: false,
        executionId: "",
        verdict: error.response?.data?.message || "Submit failed",
        output: "",
        stdout: "",
        actualOutput: "",
        runtime: "",
        memory: "",
        stderr: error.response?.data?.stderr || "",
        compileOutput: error.response?.data?.compileOutput || "",
        status: error.response?.data?.status || null,
        testcaseResults: error.response?.data?.testcaseResults || [],
        trace: [],
        input: "",
        expectedOutput: "",
        failedTestcase: null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "var(--text-tertiary)", fontSize: 13 }}>Loading problem…</div>
  );
  if (loadError) return (
    <div role="alert" style={{ display: "grid", justifyItems: "center", gap: 10, padding: "80px 20px", textAlign: "center" }}>
      <strong style={{ color: "var(--text-primary)", fontSize: 18 }}>Problem unavailable</strong>
      <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{loadError}</span>
      <button type="button" onClick={() => window.location.reload()} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>Try again</button>
    </div>
  );
  if (!problem) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "var(--red)", fontSize: 13 }}>Problem not found.</div>
  );

  return (
    <div className="problem-detail-page" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 68px)", overflow: "hidden" }}>

      {isCompetitive && <div role="status" aria-live="assertive" style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "9px 16px", background: competitiveExpired || competitiveDanger ? "var(--red-soft)" : "var(--bg-elevated)", borderBottom: "1px solid var(--border-default)", color: "var(--text-primary)" }}><strong>LIVE TEST{competitiveContext?.test?.title ? ` · ${competitiveContext.test.title}` : ""}</strong><span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontWeight: 800, color: competitiveExpired || competitiveDanger ? "var(--red)" : "var(--accent-strong)", animation: competitiveDanger && !competitiveExpired ? "competitive-test-pulse 1s ease-in-out infinite" : undefined }}>{competitiveExpired ? "Time's up" : competitiveRemaining === null ? "Verifying timer..." : formatCompetitiveClock(competitiveRemaining)}</span><Link to={`/dashboard/groups/${competitiveGroupId}?tab=${encodeURIComponent("Live Tests")}`} style={{ color: "var(--accent-strong)", fontSize: 12 }}>Back to Live Tests</Link>{competitiveContextError && <span style={{ flexBasis: "100%", color: "var(--red)", fontSize: 12 }}>{competitiveContextError}</span>}{competitiveExpired && <span style={{ flexBasis: "100%", color: "var(--red)", fontSize: 12 }}>Time's up — this test has ended. Returning to the test board...</span>}</div>}

      {/* ── Top bar ── */}
      <div className="problem-detail-toolbar" style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 44, background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-tertiary)" }}>
          <Link to="/dashboard/problems" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Problems</Link>
          <span>/</span>
          {(problem.topic || [])[0] && <><span style={{ color: "var(--accent-strong)" }}>{problem.topic[0]}</span><span>/</span></>}
          <DiffBadge d={problem.difficulty} />
        </div>

        <div style={{ flex: 1 }} />

        {/* Lang selector */}
        <div style={{ display: "flex", gap: 2, background: "var(--bg-elevated)", borderRadius: 8, padding: 3 }}>
          {LANGS.map(l => (
            <button type="button" key={l} aria-pressed={lang === l} onClick={() => setLang(l)}
              style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: lang === l ? "var(--bg-elevated-3)" : "transparent", color: lang === l ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: 12, fontWeight: lang === l ? 600 : 400, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>

        <span title="Your submission is executed as-is inside Docker" style={{ fontSize: 10.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          stdin → stdout
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: 3, borderRadius: 8, background: "var(--bg-elevated)" }}>
          <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", padding: "0 6px" }}>A</span>
          {[12, 14, 16, 18].map((size) => (
            <button
              type="button"
              aria-pressed={fontSize === size}
              key={size}
              onClick={() => setFontSize(size)}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "none",
                background: fontSize === size ? "var(--bg-elevated-3)" : "transparent",
                color: fontSize === size ? "var(--text-primary)" : "var(--text-tertiary)",
                fontSize: 12,
                fontWeight: fontSize === size ? 600 : 400,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              {size}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={resetStarterTemplate}
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
        >
          Reset template
        </button>

        <button type="button" onClick={toggleProblemBookmark} disabled={bookmarkBusy} aria-label={bookmarked ? "Remove bookmark" : "Bookmark problem"} title={bookmarkError || undefined}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: bookmarked ? "var(--accent-soft)" : "var(--bg-elevated)", color: bookmarked ? "var(--accent-strong)" : "var(--text-secondary)", fontSize: 12.5, fontWeight: 600, cursor: bookmarkBusy ? "wait" : "pointer", opacity: bookmarkBusy ? 0.7 : 1 }}>
          <Bookmark size={14} fill={bookmarked ? "currentColor" : "none"} /> {bookmarked ? "Saved" : "Save"}
        </button>

        {/* Auto save hint */}
        <span style={{ fontSize: 11, color: "var(--text-disabled)", fontFamily: "var(--font-mono)" }}>Auto Save</span>

        {/* Run / Submit */}
        <button type="button" onClick={handleRun} disabled={running || submitting || competitiveExpired}
          aria-label={running ? "Running code" : "Run code"}
          style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: running || submitting ? "not-allowed" : "pointer", opacity: running || submitting ? 0.6 : 1, fontFamily: "var(--font-sans)" }}>
          {running ? "Running..." : "▶ Run"}
        </button>
        <button type="button" onClick={handleSubmit} disabled={submitting || running || competitiveExpired || (isCompetitive && competitiveContext?.attempt?.status !== "STARTED")}
          aria-label={submitting ? "Submitting solution" : "Submit solution"}
          style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "white", fontSize: 13, fontWeight: 700, cursor: submitting || running ? "not-allowed" : "pointer", opacity: submitting || running ? 0.6 : 1, fontFamily: "var(--font-sans)" }}>
          {submitting ? "Submitting..." : "+ Submit"}
        </button>
      </div>

      {/* ── Split panels ── */}
      {bookmarkError && <div role="alert" style={{ padding: "6px 16px", color: "var(--red)", background: "var(--red-soft)", borderBottom: "1px solid var(--border-default)", fontSize: 12 }}>{bookmarkError}</div>}
      <div ref={containerRef} className="problem-detail-workspace" style={{ display: "flex", flex: 1, overflow: "hidden", userSelect: dragging ? "none" : "auto" }}>

        {/* LEFT: Problem description */}
        <div className="problem-detail-description" style={{ width: `${splitPct}%`, background: "var(--bg-surface)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <ProblemPanel problem={problem} userSubmissions={userSubmissions} />
        </div>

        {/* Drag handle */}
        <div className="problem-detail-divider" onMouseDown={startDrag}
          style={{ width: 5, background: dragging ? "var(--accent)" : "var(--border-subtle)", cursor: "col-resize", flexShrink: 0, transition: "background 0.15s" }} />

        {/* RIGHT: Editor + testcase */}
        <div className="problem-detail-editor" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-canvas)" }}>
          <CodeEditor value={code} onChange={competitiveExpired ? () => {} : setCode} language={lang} fontSize={fontSize} readOnly={competitiveExpired} />
          <DebugTestcasePanel testcases={(problem.testCases || []).filter((testCase) => !(testCase.hidden || testCase.isHidden))} runResult={runResult} running={running} />
        </div>
      </div>
    </div>
  );
}

function DebugTestcasePanel({ testcases, runResult, running }) {
  const [activeTC, setActiveTC] = useState(0);
  const [activeTab, setActiveTab] = useState("testcase");
  const [showDetails, setShowDetails] = useState(false);
  const [detailTab, setDetailTab] = useState("overview");
  const isDeveloper = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}")?.role === "admin";
    } catch {
      return false;
    }
  })();

  const block = (label, value) => (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <pre style={{ margin: 0, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{String(value ?? "—")}</pre>
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "output", label: "Output" },
    { id: "error", label: "Error" },
    { id: "compiler", label: "Compiler Log" },
    { id: "input", label: "Input" },
    { id: "expected", label: "Expected Output" },
    { id: "actual", label: "Actual Output" },
    { id: "details", label: "Execution Details" },
    ...(isDeveloper ? [{ id: "developer", label: "Developer" }] : []),
  ];

  return (
    <div style={{ height: 220, background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column" }}>
      <div role="tablist" aria-label="Execution panel" style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-subtle)", paddingLeft: 16 }}>
        {[{ id: "testcase", label: "Testcase" }, { id: "result", label: "Run Code Result" }].map((t) => (
          <button type="button" role="tab" aria-selected={activeTab === t.id} key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent", color: activeTab === t.id ? "var(--accent-strong)" : "var(--text-secondary)", fontSize: 12.5, fontWeight: activeTab === t.id ? 600 : 500, cursor: "pointer", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {activeTab === "testcase" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {(testcases || []).slice(0, 5).map((_, i) => (
                <button key={i} onClick={() => setActiveTC(i)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid", borderColor: activeTC === i ? "var(--accent)" : "var(--border-default)", background: activeTC === i ? "var(--accent-soft)" : "transparent", color: activeTC === i ? "var(--accent-strong)" : "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>
                  Case {i + 1}
                </button>
              ))}
            </div>
            {testcases?.[activeTC] && (
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>{block("Input", testcases[activeTC].input)}</div>
                <div style={{ flex: 1 }}>{block("Expected", testcases[activeTC].expectedOutput)}</div>
              </div>
            )}
            {!testcases?.length && <div className="problem-detail-empty-result" role="status">No public testcases are available for this problem.</div>}
          </div>
        )}
        {activeTab === "result" && (
          <div>
            {running ? (
              <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Running your code…</div>
            ) : runResult ? (
              <div role={runResult.verdict === "Accepted" ? "status" : "alert"} aria-live="polite">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <span className={`problem-detail-verdict ${runResult.verdict === "Accepted" ? "is-success" : "is-failure"}`} style={{ fontSize: 16, fontWeight: 800, color: runResult.verdict === "Accepted" ? "var(--green)" : "var(--red)" }}>{runResult.verdict === "Accepted" ? "✓ Accepted" : `✗ ${runResult.verdict}`}</span>
                  {runResult.executionId && <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Execution ID: {runResult.executionId}</span>}
                  {runResult.runtime && <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Runtime: {runResult.runtime}</span>}
                  {runResult.memory && <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Memory: {runResult.memory}</span>}
                </div>
                <button type="button" onClick={() => setShowDetails((current) => !current)} style={{ marginBottom: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {showDetails ? "Hide details" : "Show details"}
                </button>
                {showDetails && (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {tabs.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDetailTab(item.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid",
                            borderColor: detailTab === item.id ? "var(--accent)" : "var(--border-default)",
                            background: detailTab === item.id ? "var(--accent-soft)" : "transparent",
                            color: detailTab === item.id ? "var(--accent-strong)" : "var(--text-secondary)",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {detailTab === "overview" && (
                      <div style={{ display: "grid", gap: 8 }}>
                        {block("Verdict", runResult.verdict)}
                        {block("Failed Testcase", runResult.failedTestcase ? JSON.stringify(runResult.failedTestcase, null, 2) : "—")}
                      </div>
                    )}
                    {detailTab === "output" && block("Output", runResult.stdout || runResult.actualOutput || "No output")}
                    {detailTab === "error" && block("Error", runResult.stderr || runResult.compileOutput || "No error output")}
                    {detailTab === "compiler" && block("Compiler Log", runResult.compileOutput || "No compiler log")}
                    {detailTab === "input" && block("Input", runResult.input || "No input")}
                    {detailTab === "expected" && block("Expected Output", runResult.expectedOutput || "No expected output")}
                    {detailTab === "actual" && block("Actual Output", runResult.actualOutput || runResult.stdout || "No output")}
                    {detailTab === "details" && (
                      <div style={{ display: "grid", gap: 8 }}>
                        {block("Runtime", runResult.runtime || "—")}
                        {block("Memory", runResult.memory || "—")}
                        {block("Status", runResult.status ? JSON.stringify(runResult.status, null, 2) : "—")}
                        {block("Execution ID", runResult.executionId || "—")}
                      </div>
                    )}
                    {detailTab === "developer" && isDeveloper && (
                      <div style={{ display: "grid", gap: 8 }}>
                        {block("Generated Source", runResult.generatedSource || "—")}
                        {block("Execution Request", JSON.stringify(runResult.judge0Request || {}, null, 2))}
                        {block("Execution Response", JSON.stringify(runResult.judge0Response || {}, null, 2))}
                      </div>
                    )}
                  </div>
                )}
                {Array.isArray(runResult.testcaseResults) && runResult.testcaseResults.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Testcase Results</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {runResult.testcaseResults.map((tc, i) => (
                        <div key={i} style={{ padding: 10, borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: tc.verdict === "Accepted" ? "var(--green)" : "var(--red)" }}>Case {i + 1}: {tc.verdict}</span>
                            <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{tc.runtime || ""}{tc.memory ? ` · ${tc.memory}` : ""}</span>
                          </div>
                          <div style={{ display: "grid", gap: 8 }}>
                            {block("Input", tc.input)}
                            {block("Expected", tc.expectedOutput)}
                            {block("Output", tc.output)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="problem-detail-empty-result" role="status">Run your code to see the execution result here.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
