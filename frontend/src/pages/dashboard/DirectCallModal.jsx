import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, MicOff, PhoneOff, X } from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";

export default function DirectCallModal({ call, withName, onClose }) {
  const [room, setRoom] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [status, setStatus] = useState("Calling…");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let liveRoom;
    const connect = async () => {
      try {
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

  const toggleMic = async () => { if (!room) return; const next = !micEnabled; await room.localParticipant.setMicrophoneEnabled(next); setMicEnabled(next); };
  const toggleCamera = async () => { if (!room) return; const next = !cameraEnabled; await room.localParticipant.setCameraEnabled(next); setCameraEnabled(next); };

  return (
    <div className="dm-call-backdrop">
      <section className="dm-call-modal" aria-label={`Private call with ${withName}`}>
        <header>
          <div><span className="study-eyebrow">Private call</span><h2>{withName}</h2><small>{status}</small></div>
          <button type="button" className="study-modal-close" onClick={onClose} aria-label="End call"><X size={17} /></button>
        </header>
        {error ? <div className="study-meeting-error">{error}</div> : (
          <div className="dm-call-grid">
            {tracks.length ? tracks.map((item) => <CallTrack key={item.sid} item={item} />) : <div className="study-meeting-empty"><strong>{status}</strong><span>Allow camera and microphone access when your browser asks.</span></div>}
          </div>
        )}
        <footer>
          <button type="button" className={micEnabled ? "study-meeting-control" : "study-meeting-control off"} onClick={toggleMic} disabled={!room}>{micEnabled ? <Mic size={16} /> : <MicOff size={16} />} {micEnabled ? "Mute" : "Unmute"}</button>
          <button type="button" className={cameraEnabled ? "study-meeting-control" : "study-meeting-control off"} onClick={toggleCamera} disabled={!room}>{cameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />} {cameraEnabled ? "Camera off" : "Camera on"}</button>
          <button type="button" className="study-meeting-leave" onClick={onClose}><PhoneOff size={16} /> End call</button>
        </footer>
      </section>
    </div>
  );
}

function CallTrack({ item }) {
  const elementRef = useRef(null);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    item.track.attach(element);
    return () => item.track.detach(element);
  }, [item.track]);
  return item.track.kind === Track.Kind.Video
    ? <video ref={elementRef} autoPlay playsInline muted={item.participant.isLocal} className="dm-call-video" />
    : <audio ref={elementRef} autoPlay muted={item.participant.isLocal} />;
}
