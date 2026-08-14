import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Lightbulb, MinusCircle, XCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import aptitudeApi from "../lib/api";
import { Card, ErrorNote, PageLoading } from "../lib/ui";
import { formatTopicName } from "../lib/format";

export default function FullSessionReviewPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "" });
  const [questions, setQuestions] = useState([]);
  const [mode, setMode] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    aptitudeApi.getSessionReview(sessionId, controller.signal, true).then((res) => {
      setQuestions(res.data?.questions || []);
      setMode(res.data?.session?.mode || "");
      setState({ loading: false, error: "" });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ loading: false, error: error.response?.data?.message || "Couldn't load this session review." });
    });
    return () => controller.abort();
  }, [sessionId]);

  if (state.loading) return <PageLoading />;
  if (state.error) return <ErrorNote message={state.error} />;
  const correct = questions.filter((item) => item.isCorrect).length;
  return <div style={{ display: "grid", gap: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><button className="cv-button-secondary" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => navigate(`/dashboard/aptitude/results/${sessionId}`)}><ArrowLeft size={14} /> Back to report</button><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>{mode.replace(/_/g, " ")} · {correct}/{questions.length} correct</span><button className="cv-button-primary" style={{ padding: "8px 13px", fontSize: 12 }} onClick={() => navigate("/dashboard/aptitude/practice")}><ArrowRight size={14} /> End report</button></div></div>
    <Card><div style={{ color: "var(--accent-strong)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Complete session review</div><h1 style={{ margin: "8px 0 5px", color: "var(--text-primary)", fontSize: 23 }}>Every question from this session</h1><p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: 12.5 }}>Green is correct, red is incorrect, and grey is skipped. Scroll to review everything.</p></Card>
    <div style={{ display: "grid", gap: 14 }}>{questions.map((question, index) => <QuestionCard key={`${question._id}-${index}`} question={question} index={index} />)}</div>
  </div>;
}

function QuestionCard({ question, index }) {
  const status = question.isSkipped ? "skipped" : question.isCorrect ? "correct" : "wrong";
  const meta = { correct: [CheckCircle2, "Correct", "var(--green)"], wrong: [XCircle, "Incorrect", "var(--red)"], skipped: [MinusCircle, "Skipped", "var(--text-tertiary)"] }[status];
  const StatusIcon = meta[0];
  return <Card style={{ padding: "18px 20px", borderColor: status === "correct" ? "var(--green)" : status === "wrong" ? "var(--red)" : "var(--border-subtle)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}><strong style={{ color: "var(--text-tertiary)", fontSize: 11 }}>QUESTION {index + 1}</strong><span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: meta[2], fontSize: 11.5, fontWeight: 800 }}><StatusIcon size={15} /> {meta[1]} {question.timeSpent > 0 && <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}><Clock3 size={12} style={{ verticalAlign: "-2px" }} /> {question.timeSpent}s</span>}</span></div><h2 style={{ margin: "0 0 11px", color: "var(--text-primary)", fontSize: 16, lineHeight: 1.5 }}>{question.question}</h2><div style={{ display: "flex", gap: 7, marginBottom: 13, flexWrap: "wrap" }}><span className="apt-review-tag">{formatTopicName(question.topic)}</span><span className="apt-review-tag">{question.difficulty}</span></div><div style={{ display: "grid", gap: 8 }}>{(question.options || []).map((option) => { const isCorrect = option.key === question.correctAnswer; const isSelected = option.key === question.selectedAnswer; const tone = isCorrect ? "correct" : isSelected ? "wrong" : "neutral"; return <div key={option.key} className={`apt-review-option ${tone}`}><span className="apt-review-option-key">{option.key}</span><span style={{ flex: 1 }}>{option.text}</span>{isCorrect && <span className="apt-review-label"><CheckCircle2 size={14} /> Correct answer</span>}{isSelected && !isCorrect && <span className="apt-review-label"><XCircle size={14} /> Your answer</span>}</div>; })}</div><div className="apt-review-explanation"><div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--accent-strong)", fontSize: 12.5, fontWeight: 800 }}><Lightbulb size={16} /> Explanation</div><p>{question.explanation || "No explanation was saved for this question."}</p>{question.shortTrick && <><strong>Shortcut</strong><p>{question.shortTrick}</p></>}{question.conceptNote && <><strong>Concept note</strong><p>{question.conceptNote}</p></>}</div></Card>;
}
