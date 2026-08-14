export const CATEGORY_META = {
  "Quantitative Aptitude": { short: "Quant", color: "var(--cyan)", bg: "var(--cyan-soft)" },
  "Logical Reasoning": { short: "Logic", color: "var(--accent)", bg: "var(--accent-soft)" },
  "Verbal Ability": { short: "Verbal", color: "var(--green)", bg: "var(--green-soft)" },
  "Data Interpretation": { short: "Data", color: "var(--amber)", bg: "var(--amber-soft)" },
};
export const DIFFICULTY_META = { Easy: { color: "var(--green)", bg: "var(--green-soft)" }, Medium: { color: "var(--medium-color)", bg: "var(--medium-soft)" }, Hard: { color: "var(--red)", bg: "var(--red-soft)" } };
export const MISTAKE_LABELS = { GUESS: "Guess", MISREAD_QUESTION: "Misread the question", TIME_PRESSURE: "Time pressure", CALCULATION_ERROR: "Calculation slip", CONCEPTUAL_ERROR: "Conceptual gap", UNKNOWN: "Unclassified" };
const TOPIC_LABELS = {
  "time-speed-distance": "Time, Speed & Distance",
  "profit-loss": "Profit & Loss",
  "simple-interest": "Simple Interest",
  "compound-interest": "Compound Interest",
  "data-interpretation": "Data Interpretation",
  "number-series": "Number Series",
  "alphabet-series": "Alphabet Series",
  "coding-decoding": "Coding & Decoding",
  "blood-relations": "Blood Relations",
  "direction-sense": "Direction Sense",
  "seating-arrangement": "Seating Arrangement",
  "circular-arrangement": "Circular Arrangement",
  "odd-one-out": "Odd One Out",
  "statement-conclusion": "Statement & Conclusion",
  "statement-assumption": "Statement & Assumption",
  "data-sufficiency": "Data Sufficiency",
};
export function formatTopicName(value = "") {
  const key = String(value).trim().toLowerCase().replace(/\s+/g, "-");
  if (TOPIC_LABELS[key]) return TOPIC_LABELS[key];
  return String(value).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export function relativeDue(value) {
  const target = new Date(value);
  const now = new Date();
  const targetDay = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((targetDay - todayDay) / 86400000);
  return days <= 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days}d`;
}
export function readinessLabel(score) { if (score == null) return { label: "Not enough data", color: "var(--text-tertiary)" }; if (score >= 80) return { label: "Interview ready", color: "var(--green)" }; if (score >= 60) return { label: "Almost there", color: "var(--medium-color)" }; if (score >= 40) return { label: "Building up", color: "var(--amber)" }; return { label: "Just getting started", color: "var(--red)" }; }
