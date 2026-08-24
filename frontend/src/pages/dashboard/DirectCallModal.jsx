import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, MicOff, PhoneOff, X } from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function DirectCallModal({ call, withName, onClose }) {
  const [room, setRoom] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [status, setStatus] = useState("Ringing…");
  const [error, setError] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(0);

  useEffect(() => {
    let active = true;
    let liveRoom;
    const connect = async () => {
      try {
        setStatus("Connecting…");
        liveRoom = new Room({ adaptiveStream: true, dynacast: true });
        const addTrack = (track, participant) => {
          if (!track || ![Track.Kind.Audio, Track.Kind.Video].includes(track.kind)) return;
          setTracks((current) => current.some((item) => item.sid === track.sid) ? current : [...current, { sid: track.sid, track, participant }]);
        };
        const removeTrack = (track) => setTracks((current) => current.filter((item) => item.sid !== track.sid));
        liveRoom.on(RoomEvent.TrackSubscribed, addTrack);
        liveRoom.on(RoomEvent.TrackUnsubscribed, removeTrack);
        liveRoom.on(RoomEvent.Disconnected, () => active && setStatus("Call ended"));
        await liveRoom.connect(call.url, call.token);
        if (!active) return;
        await liveRoom.localParticipant.setMicrophoneEnabled(true);
        await liveRoom.localParticipant.setCameraEnabled(true);
        for (const publication of liveRoom.localParticipant.trackPublications.values()) addTrack(publication.track, liveRoom.localParticipant);
        for (const participant of liveRoom.remoteParticipants.values()) for (const publication of participant.trackPublications.values()) if (publication.track) addTrack(publication.track, participant);
        setRoom(liveRoom);
        setStatus("Connected");
      } catch (requestError) { if (active) { setError(requestError.response?.data?.message || "Could not connect the call."); setStatus("Unable to connect"); } }
    };
    connect();
    return () => { active = false; liveRoom?.disconnect(); };
  }, [call.url, call.token]);

  // Real elapsed-time ticker — only runs while genuinely Connected, never a
  // fake pre-baked number.
  useEffect(() => {
    if (status !== "Connected") return undefined;
    setDurationSeconds(0);
    const interval = setInterval(() => setDurationSeconds((current) => current + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const toggleMic = async () => { if (!room) return; const next = !micEnabled; await room.localParticipant.setMicrophoneEnabled(next); setMicEnabled(next); };
  const toggleCamera = async () => { if (!room) return; const next = !cameraEnabled; await room.localParticipant.setCameraEnabled(next); setCameraEnabled(next); };

  const statusLine = status === "Connected" ? formatDuration(durationSeconds) : status;

  return (
    <div className="dm-call-backdrop">
      <section className="dm-call-modal" aria-label={`Private call with ${withName}`}>
        <header className="dm-call-header">
          <div>
            <span className="study-eyebrow">Private call</span>
            <h2>{withName}</h2>
            <small className={status === "Connected" ? "dm-call-status dm-call-status--live" : "dm-call-status"}>
              {status !== "Connected" && status !== "Unable to connect" && status !== "Call ended" && <i className="dm-call-pulse" aria-hidden="true" />}
              {statusLine}
            </small>
          </div>
          <button type="button" className="study-modal-close" onClick={onClose} aria-label="End call"><X size={17} /></button>
        </header>
        {error ? <div className="dm-call-error">{error}</div> : (
          <div className="dm-call-grid">
            {tracks.length ? tracks.map((item) => <CallTrack key={item.sid} item={item} withName={withName} />) : (
              <div className="dm-call-empty">
                <span className="dm-call-spinner" aria-hidden="true" />
                <strong>{status}</strong>
                <span>Allow camera and microphone access when your browser asks.</span>
              </div>
            )}
          </div>
        )}
        <footer className="dm-call-footer">
          <button type="button" className={micEnabled ? "dm-call-control" : "dm-call-control off"} onClick={toggleMic} disabled={!room}>{micEnabled ? <Mic size={16} /> : <MicOff size={16} />} {micEnabled ? "Mute" : "Unmute"}</button>
          <button type="button" className={cameraEnabled ? "dm-call-control" : "dm-call-control off"} onClick={toggleCamera} disabled={!room}>{cameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />} {cameraEnabled ? "Camera off" : "Camera on"}</button>
          <button type="button" className="dm-call-leave" onClick={onClose}><PhoneOff size={16} /> End call</button>
        </footer>
      </section>
    </div>
  );
}

function CallTrack({ item, withName }) {
  const elementRef = useRef(null);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    item.track.attach(element);
    return () => item.track.detach(element);
  }, [item.track]);
  const label = item.participant.isLocal ? "You" : withName;
  if (item.track.kind !== Track.Kind.Video) return <audio ref={elementRef} autoPlay muted={item.participant.isLocal} />;
  return (
    <div className="dm-call-tile">
      <video ref={elementRef} autoPlay playsInline muted={item.participant.isLocal} className="dm-call-video" />
      <span className="dm-call-tile-label">{label}</span>
    </div>
  );
}
