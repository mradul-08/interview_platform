import { useCallback, useEffect, useState } from "react";
import { approveJoinRequest, getJoinRequests, getMembers, getDashboard, removeGroupMember } from "./api";
import { connectRealtimeSocket } from "../../realtime/socket";
import "./memberModeration.css";
import "./memberDirectoryFixes.css";

export default function MembersRealtime({ initialMembers = [], groupId }) {
  const [members, setMembers] = useState(initialMembers); const [requests, setRequests] = useState([]); const [isOwner, setIsOwner] = useState(false); const [selected, setSelected] = useState(null); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setMembers(await getMembers(groupId)); setError(""); } catch (err) { setError(err.response?.data?.message || "Members could not be loaded."); } }, [groupId]);
  const loadRequests = useCallback(async () => { if (!isOwner) return; try { setRequests(await getJoinRequests(groupId)); } catch (err) { setError(err.response?.data?.message || "Join requests could not be loaded."); } }, [groupId, isOwner]);
  useEffect(() => { getDashboard(groupId).then((data) => setIsOwner(data.membership?.role === "OWNER")).catch(() => {}); }, [groupId]);
  useEffect(() => {
    load();
    const socket = connectRealtimeSocket();
    const onMembership = (event) => { if (String(event.groupId) === String(groupId)) { load(); loadRequests(); } };
    const onProfileUpdated = (event) => {
      if (String(event.groupId) !== String(groupId)) return;
      setMembers((current) => current.map((member) => String(member.userId?._id) === String(event.userId)
        ? { ...member, userId: { ...member.userId, avatarUrl: event.avatarUrl || "" } }
        : member));
      setSelected((current) => current && String(current.userId?._id) === String(event.userId)
        ? { ...current, userId: { ...current.userId, avatarUrl: event.avatarUrl || "" } }
        : current);
    };
    socket.on("group:membership", onMembership);
    socket.on("group:profile-updated", onProfileUpdated);
    return () => { socket.off("group:membership", onMembership); socket.off("group:profile-updated", onProfileUpdated); };
  }, [groupId, load, loadRequests]);
  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => { members.forEach((member) => { const name = member.userId?.name; if (name) sessionStorage.setItem(`study-group-member:${groupId}:${encodeURIComponent(name)}`, JSON.stringify(member)); }); }, [groupId, members]);
  const approve = async (request) => { try { await approveJoinRequest(groupId, request._id); await Promise.all([load(), loadRequests()]); } catch (err) { setError(err.response?.data?.message || "Request could not be approved."); } };
  const remove = async (member) => { if (!window.confirm(`Remove ${member.userId?.name || "this member"} from the group?`)) return; try { await removeGroupMember(groupId, member._id); setSelected(null); await load(); } catch (err) { setError(err.response?.data?.message || "Member could not be removed."); } };
  return <section className="sg-card sg-members-panel"><div className="sg-section-head"><div><h2>Members</h2><span className="sg-muted">Live group directory</span></div><span className="sg-chip">{members.length} approved</span></div>{error && <p className="sg-error-text" role="alert">{error} <button type="button" className="sg-btn" onClick={load}>Retry</button></p>}{isOwner && requests.length > 0 && <div className="sg-join-requests"><div className="sg-request-heading"><strong>Join requests</strong><span>{requests.length} waiting</span></div>{requests.map((request) => <div className="sg-request-item" key={request._id}><span className="sg-member-avatar">{request.userId?.avatarUrl ? <img src={request.userId.avatarUrl} alt="" /> : (request.userId?.name || "M")[0]}</span><span className="sg-member-copy"><strong>{request.userId?.name || "Member"}</strong><small>{request.userId?.email || "Pending access request"}</small></span><button type="button" className="sg-btn accent sg-request-approve" onClick={() => approve(request)}>Accept</button><button type="button" className="sg-btn sg-request-deny" onClick={() => remove(request)}>Reject</button></div>)}</div>}<div className="sg-member-list">{members.map((member) => { const profile = member.userId || {}; const name = profile.name || "Member"; return <div className="sg-member-item" role="button" tabIndex="0" key={member._id} onClick={() => setSelected(member)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setSelected(member)}><span className="sg-member-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : name[0]}</span><span className="sg-member-copy"><strong>{name}</strong><small>{member.role === "OWNER" ? "Group owner" : "Member"}</small></span>{isOwner && member.role !== "OWNER" && <button type="button" className="sg-member-remove" onClick={(event) => { event.stopPropagation(); remove(member); }}>Remove</button>}<span className="sg-member-chevron">›</span></div>; })}</div>{!error && !members.length && <p className="sg-muted">No approved members yet.</p>}{selected && <div className="sg-member-profile"><div className="sg-member-avatar large">{selected.userId?.avatarUrl ? <img src={selected.userId.avatarUrl} alt="" /> : (selected.userId?.name || "M")[0]}</div><div><h3>{selected.userId?.name || "Member"}</h3><p>{selected.userId?.email || "Profile information available to group members."}</p><small>{selected.role === "OWNER" ? "Group owner" : "Approved member"}</small></div><button type="button" onClick={() => setSelected(null)} aria-label="Close profile">×</button></div>}</section>;
}
