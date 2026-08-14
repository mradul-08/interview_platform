import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Lightbulb, RotateCcw, XCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import aptitudeApi from "../lib/api";
import { Card, ErrorNote, PageLoading } from "../lib/ui";

export default function SessionReviewPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "" });
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    aptitudeApi.getSessionReview(sessionId, controller.signal)
      .then((res) => {
        setSession(res.data.session);
        setQuestions(res.data.questions || []);
        setState({ loading: false, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ loading: false, error: error.response?.data?.message || "Couldn't load mistakes from this session." });
      });
    return () => controller.abort();
  }, [sessionId]);

  if (state.loading) return <PageLoading />;
  if (state.error) return <ErrorNote message={state.error} onRetry={() => window.location.reload()} />;

  const question = questions[index];
  if (!question) {
    return <Card style={{ textAlign: "center", padding: 34 }}><CheckCircle2 size={28} color="var(--green)" /><h2 style={{ color: "var(--text-primary)", fontSize: 18, margin: "12px 0 6px" }}>No mistakes in this session</h2><p style={{ color: "var(--text-tertiary)", fontSize: 12.5 }}>You answered every question correctly. Great work.</p><button className="cv-button-primary" onClick={() => navigate(`/dashboard/aptitude/results/${sessionId}`)}>Back to report</button></Card>;
  }

  const isLast = index === questions.length - 1;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <button className="cv-button-secondary" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => navigate(`/dashboard/aptitude/results/${sessionId}`)}><ArrowLeft size={14} /> Back to report</button>
        <div style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Mistake review · {session?.mode?.replace(/_/g, " ")}</div>
      </div>

      <Card style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div><div style={{ color: "var(--red)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Review mistake {index + 1} of {questions.length}</div><h1 style={{ margin: "8px 0 0", color: "var(--text-primary)", fontSize: 20, lineHeight: 1.4 }}>{question.question}</h1></div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-tertiary)", fontSize: 11, whiteSpace: "nowrap" }}><Clock3 size={14} /> {question.timeSpent}s</div>
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}><span className="apt-review-tag">{question.category}</span><span className="apt-review-tag">{question.topic}</span><span className="apt-review-tag">{question.difficulty}</span></div>

        <div style={{ display: "grid", gap: 9 }}>
          {(question.options || []).map((option) => {
            const isCorrect = option.key === question.correctAnswer;
            const isSelected = option.key === question.selectedAnswer;
            const tone = isCorrect ? "correct" : isSelected ? "wrong" : "neutral";
            return <div key={option.key} className={`apt-review-option ${tone}`}><span className="apt-review-option-key">{option.key}</span><span style={{ flex: 1 }}>{option.text}</span>{isCorrect && <span className="apt-review-label"><CheckCircle2 size={14} /> Correct answer</span>}{isSelected && !isCorrect && <span className="apt-review-label"><XCircle size={14} /> Your answer</span>}</div>;
          })}
        </div>

        <div className="apt-review-explanation"><div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--accent-strong)", fontSize: 12.5, fontWeight: 800 }}><Lightbulb size={16} /> Explanation</div><p>{question.explanation || "Review the correct option and retry this topic in practice mode."}</p>{question.shortTrick && <><strong>Shortcut</strong><p>{question.shortTrick}</p></>}{question.conceptNote && <><strong>Concept note</strong><p>{question.conceptNote}</p></>}</div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}><button className="cv-button-secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}><ArrowLeft size={15} /> Previous</button>{isLast ? <button className="cv-button-primary" onClick={() => navigate(`/dashboard/aptitude/results/${sessionId}`)}><RotateCcw size={15} /> Back to session report</button> : <button className="cv-button-primary" onClick={() => setIndex((value) => value + 1)}>Next mistake <ArrowRight size={15} /></button>}</div>
      </Card>
    </div>
  );
}
