import { useSyncExternalStore } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import api from "../../api/api";

export const listMockInterviews = () => api.get("/api/mock-interviews").then((res) => res.data.interviews || []);
export const createMockInterview = (payload) => api.post("/api/mock-interviews", payload).then((res) => res.data.interview);
export const resolveJoinCode = (code) => api.get(`/api/mock-interviews/join/${encodeURIComponent(code)}`).then((res) => res.data.interview);
export const createRoomToken = (id) => api.post(`/api/mock-interviews/${id}/token`).then((res) => res.data);
export const endMockInterview = (id) => api.post(`/api/mock-interviews/${id}/end`).then((res) => res.data.interview);
export const cancelMockInterview = (id) => api.post(`/api/mock-interviews/${id}/cancel`).then((res) => res.data.interview);

const callState = { interviewId: null, interview: null, room: null, tracks: [], micEnabled: true, cameraEnabled: true, screenSharing: false, status: "idle", error: "", remaining: null };
let snapshot = { ...callState, tracks: [] };
const listeners = new Set(); let timerHandle = null;
function publish() { snapshot = { ...callState, tracks: [...callState.tracks] }; listeners.forEach((listener) => listener()); }
export const subscribeMockInterviewCall = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const getMockInterviewCallSnapshot = () => snapshot;
export const useMockInterviewCall = () => useSyncExternalStore(subscribeMockInterviewCall, getMockInterviewCallSnapshot);
function addTrack(track, participant) { if (!track || ![Track.Kind.Audio, Track.Kind.Video].includes(track.kind) || callState.tracks.some((item) => item.sid === track.sid)) return; callState.tracks.push({ sid: track.sid, track, participant, source: track.source }); publish(); }
function removeTrack(track) { callState.tracks = callState.tracks.filter((item) => item.sid !== track.sid); publish(); }
function tickRemaining() { if (!callState.interview?.endsAt) return; callState.remaining = Math.max(0, Math.ceil((new Date(callState.interview.endsAt).getTime() - Date.now()) / 1000)); if (!callState.remaining) { callState.status = "ended"; callState.room?.disconnect(); } publish(); }

export async function joinMockInterviewCall(interviewId) {
  if (callState.interviewId === interviewId && ["connected", "connecting"].includes(callState.status)) return;
  if (callState.room || callState.interviewId) await leaveMockInterviewCall();
  callState.interviewId = interviewId; callState.status = "connecting"; callState.error = ""; callState.tracks = []; publish();
  try {
    const data = await createRoomToken(interviewId); callState.interview = data.interview;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    room.on(RoomEvent.TrackSubscribed, addTrack); room.on(RoomEvent.TrackUnsubscribed, removeTrack); room.on(RoomEvent.LocalTrackPublished, (publication, participant) => addTrack(publication.track, participant)); room.on(RoomEvent.LocalTrackUnpublished, (publication) => publication.track && removeTrack(publication.track));
    room.on(RoomEvent.Disconnected, () => { callState.status = "ended"; callState.room = null; publish(); });
    await room.connect(data.url, data.token); await room.localParticipant.setMicrophoneEnabled(true); await room.localParticipant.setCameraEnabled(true);
    for (const publication of room.localParticipant.trackPublications.values()) addTrack(publication.track, room.localParticipant);
    for (const participant of room.remoteParticipants.values()) for (const publication of participant.trackPublications.values()) if (publication.track) addTrack(publication.track, participant);
    callState.room = room; callState.status = "connected"; callState.micEnabled = true; callState.cameraEnabled = true; callState.screenSharing = false; publish();
    if (timerHandle) clearInterval(timerHandle); tickRemaining(); timerHandle = setInterval(tickRemaining, 1000);
  } catch (error) { callState.status = "error"; callState.error = error.response?.data?.message || "Could not join the interview room."; publish(); }
}
export async function leaveMockInterviewCall() { if (timerHandle) { clearInterval(timerHandle); timerHandle = null; } try { callState.room?.disconnect(); } catch { /* room may already be disconnected */ } Object.assign(callState, { room: null, interviewId: null, interview: null, tracks: [], micEnabled: true, cameraEnabled: true, screenSharing: false, status: "idle", error: "", remaining: null }); publish(); }
export async function endMockInterviewForEveryone(interviewId) { try { await endMockInterview(interviewId); } finally { await leaveMockInterviewCall(); } }
export async function toggleMockInterviewMic() { if (!callState.room) return; const next = !callState.micEnabled; await callState.room.localParticipant.setMicrophoneEnabled(next); callState.micEnabled = next; publish(); }
export async function toggleMockInterviewCamera() { if (!callState.room) return; const next = !callState.cameraEnabled; await callState.room.localParticipant.setCameraEnabled(next); callState.cameraEnabled = next; publish(); }
export async function toggleMockInterviewScreenShare() { if (!callState.room) return; try { const next = !callState.screenSharing; await callState.room.localParticipant.setScreenShareEnabled(next, { audio: true }); callState.screenSharing = next; publish(); } catch { /* user cancelled screen sharing */ } }
if (typeof window !== "undefined") window.addEventListener("beforeunload", () => { try { callState.room?.disconnect(); } catch { /* browser is closing */ } });
