import api from "../../../api/api";

const base = "/api/aptitude";
const pendingGets = new Map();
function getOnce(url, config = {}) {
  const paramsKey = JSON.stringify(config.params || {});
  const key = `${url}?${paramsKey}`;
  if (pendingGets.has(key)) return pendingGets.get(key);
  const request = api.get(url, { ...config, signal: undefined }).finally(() => pendingGets.delete(key));
  pendingGets.set(key, request);
  return request;
}
export const aptitudeApi = {
  dashboard: (signal) => getOnce(`${base}/dashboard`, { signal }),
  topics: (signal) => getOnce(`${base}/topics`, { signal }),
  analytics: (signal, topic) => getOnce(`${base}/analytics`, { params: topic ? { topic } : undefined, signal }),
  mistakes: (signal) => getOnce(`${base}/mistakes`, { signal }),
  skillDna: (signal) => getOnce(`${base}/skill-dna`, { signal }),
  speedAccuracy: (signal) => getOnce(`${base}/speed-accuracy`, { signal }),
  confidenceCalibration: (signal) => getOnce(`${base}/confidence-calibration`, { signal }),
  revision: (signal) => getOnce(`${base}/revision`, { signal }),
  readinessBreakdown: (signal) => getOnce(`${base}/readiness-breakdown`, { signal }),
  streakCalendar: (days, year, signal) => getOnce(`${base}/streak-calendar`, { params: { days, year }, signal }),
  companies: (signal) => getOnce(`${base}/companies`, { signal }),
  recommendations: (signal) => getOnce(`${base}/recommendations`, { signal }),
  dailyMission: (signal) => getOnce(`${base}/daily-mission`, { signal }),
  badges: (signal) => getOnce(`${base}/badges`, { signal }),
  submitAttempt: (payload) => api.post(`${base}/attempts`, payload),
  createSession: (payload) => payload?.config?.companyTag ? api.post(`${base}/sessions/company`, payload.config) : api.post(`${base}/sessions`, payload),
  activeSession: (signal) => getOnce(`${base}/sessions/active`, { signal }),
  getSession: (id, signal) => getOnce(`${base}/sessions/${id}`, { signal }),
  getSessionReview: (id, signal, all = false) => api.get(`${base}/sessions/${id}/review`, { params: all ? { all: "true" } : undefined, signal }),
  repracticeSessionMistakes: (id) => api.post(`${base}/sessions/${id}/repractice-mistakes`),
  submitSession: (id) => api.post(`${base}/sessions/${id}/submit`),
  markForReview: (payload) => api.post(`${base}/sessions/mark-review`, payload),
  startRevisionPractice: () => api.post(`${base}/practice/revision`),
  fixMistakes: (topic) => api.post(`${base}/practice/fix-mistakes`, topic ? { topic } : {}),
  startMistakeReplay: () => api.post(`${base}/practice/mistake-replay`),
  bookmarks: (signal) => api.get(`${base}/bookmarks`, { signal }),
  toggleBookmark: (questionId) => api.post(`${base}/questions/${questionId}/bookmark`, {}),
};
export default aptitudeApi;
