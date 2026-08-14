import { Check, X } from "lucide-react";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export default function AptitudeActivityDetails({ day, onClose }) {
  if (!day) return null;
  const accuracy = day.attempts ? Math.round((day.correct / day.attempts) * 100) : 0;
  return (
    <div className="apt-activity-overlay" role="dialog" aria-modal="true" aria-label="Daily aptitude activity" onClick={onClose}>
      <div className="apt-activity-drawer" onClick={(event) => event.stopPropagation()}>
        <button className="apt-activity-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="apt-activity-eyebrow">Daily aptitude activity</div>
        <h2>{day.date}</h2>

        <div className="apt-activity-stats">
          <div><strong>{day.attempts}</strong><span>Questions answered</span></div>
          <div><strong>{day.correct}</strong><span>Correct answers</span></div>
          <div><strong>{accuracy}%</strong><span>Accuracy</span></div>
        </div>

        <div className="apt-activity-section-title">Difficulty breakdown</div>
        <div className="apt-activity-pills">{DIFFICULTIES.map((difficulty) => <span className={`apt-activity-pill ${difficulty.toLowerCase()}`} key={difficulty}>{difficulty} {day.difficulty?.[difficulty] || 0}</span>)}</div>

        <div className="apt-activity-section-title">Questions practiced</div>
        {(day.questions || []).length ? <div className="apt-activity-questions">{day.questions.map((item, index) => <div className="apt-activity-question" key={`${item.id || item.topic}-${index}`}><span className={item.correct ? "correct" : "incorrect"}>{item.correct ? <Check size={13} /> : <X size={13} />}</span><div><strong>{item.question}</strong><small>{item.category} · {item.topic} · {item.difficulty}</small></div></div>)}</div> : <p className="apt-activity-empty">No question details were recorded for this day.</p>}
      </div>
    </div>
  );
}
