const ANSWERS = new Set(["A", "B", "C", "D"]);

function normalizeSubmissionId(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw Object.assign(new Error("submissionId must be a string"), { status: 400, code: "INVALID_SUBMISSION_ID" });
  const normalized = value.trim();
  if (!normalized || normalized.length > 100) throw Object.assign(new Error("submissionId must be non-empty and at most 100 characters"), { status: 400, code: "INVALID_SUBMISSION_ID" });
  return normalized;
}

function validateSelectedAnswer(value) {
  if (value !== null && value !== undefined && !ANSWERS.has(value)) throw Object.assign(new Error("selectedAnswer must be A, B, C, D, or null"), { status: 400, code: "INVALID_ANSWER" });
}

function validateSubmissionReuse(existing, { questionId, sessionId }) {
  if (!existing) return;
  if (String(existing.questionId) !== String(questionId) || String(existing.sessionId || "") !== String(sessionId || "")) {
    throw Object.assign(new Error("submissionId is already bound to another attempt"), { status: 409, code: "SUBMISSION_ID_REUSED" });
  }
}

function authoritativeTimeSeconds({ now = new Date(), startedAt, maxSeconds = 3600 }) {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.min(maxSeconds, Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000)));
}

module.exports = { normalizeSubmissionId, validateSelectedAnswer, validateSubmissionReuse, authoritativeTimeSeconds };
