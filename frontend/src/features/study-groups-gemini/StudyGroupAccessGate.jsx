import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDashboard, getGroup, joinGroup } from "./api";
import { connectRealtimeSocket } from "../../realtime/socket";
import "./studyGroups.css";
import "./studyGroupsApp.css";
import "./studyGroupsWorkspace.css";
import "./studyGroupsAccess.css";
import "./studyGroupsAccessFixes.css";

export default function StudyGroupAccessGate({ children }) {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getGroup(groupId), getDashboard(groupId)])
      .then(() => active && setState("member"))
      .catch(async (err) => {
        if (!active) return;
        if (err.response?.status === 403) {
          try { setGroup(await getGroup(groupId)); setState("join"); }
          catch (groupError) { setError(groupError.response?.data?.message || "This group is unavailable."); setState("error"); }
        } else { setError(err.response?.data?.message || "This group could not be loaded."); setState("error"); }
      });
    return () => { active = false; };
  }, [groupId]);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserId = currentUser._id || currentUser.id || currentUser.userId;
    const socket = connectRealtimeSocket();
    const revokeAccess = async () => {
      try { setGroup(await getGroup(groupId)); setState("join"); } catch (err) { setError(err.response?.data?.message || "This group is unavailable."); setState("error"); }
    };
    const onRevoked = (event) => { if (String(event.groupId) === String(groupId)) revokeAccess(); };
    const onMembership = async (event) => {
      if (String(event.groupId) !== String(groupId)) return;
      if (event.status === "APPROVED") { setState("member"); return; }
      if (String(event.userId) !== String(currentUserId)) return;
      if (["REMOVED", "LEFT"].includes(event.status)) {
        revokeAccess();
      } else if (event.status === "APPROVED") setState("member");
    };
    socket.on("group:membership", onMembership);
    socket.on("group:access-revoked", onRevoked);
    return () => { socket.off("group:membership", onMembership); socket.off("group:access-revoked", onRevoked); };
  }, [groupId]);

  useEffect(() => {
    if (state !== "pending") return undefined;
    const timer = setInterval(async () => {
      try { await getDashboard(groupId); setState("member"); } catch (err) { if (err.response?.status !== 403) clearInterval(timer); }
    }, 4000);
    return () => clearInterval(timer);
  }, [groupId, state]);

  const join = async () => {
    setJoining(true); setError("");
    try {
      const result = await joinGroup(groupId);
      if (result.membership?.status === "PENDING") { setState("pending"); return; }
      setState("member");
    } catch (err) { setError(err.response?.data?.message || "Could not join this group."); }
    finally { setJoining(false); }
  };

  if (state === "member") return children;
  if (state === "loading") return <main className="sg-app"><div className="sg-main"><section className="sg-card sg-access-state" role="status" aria-live="polite"><span className="sg-profile-spinner" /><span className="sg-eyebrow">SECURE ACCESS CHECK</span><h1>Checking group access</h1><p>Verifying your membership securely.</p></section></div></main>;
  if (state === "error") return <main className="sg-app"><div className="sg-main"><section className="sg-card sg-access-state" role="alert"><span className="sg-eyebrow">GROUP ACCESS</span><h1>Group unavailable</h1><p>{error}</p><Link className="sg-btn" to="/dashboard/groups">Back to groups</Link></section></div></main>;
  return <main className="sg-app"><div className="sg-main"><section className={`sg-card sg-access-state ${state === "pending" ? "is-pending" : ""}`} aria-live="polite"><span className="sg-eyebrow">GROUP ACCESS</span><div className="sg-access-avatar">{group?.avatarText || group?.name?.[0] || "S"}</div><h1>{group?.name || "Study group"}</h1><p>{state === "pending" ? "Your request is pending approval. We will keep checking while you wait." : "Join this group to view its members, chat, and live tests."}</p>{state !== "pending" && <button className="sg-btn accent" type="button" onClick={join} disabled={joining}>{joining ? "Joining..." : "Join group"}</button>}{state === "pending" && <span className="sg-access-pending">Waiting for owner approval</span>}<Link className="sg-btn" to="/dashboard/groups">Back to groups</Link>{error && <p className="sg-error-text" role="alert">{error}</p>}</section></div></main>;
}
