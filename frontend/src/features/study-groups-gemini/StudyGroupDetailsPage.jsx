import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { createInviteLink, getDashboard, getCompetitiveTests, leaveGroup, updateGroupAppearance } from "./api";
import { getRealtimeSocket } from "../../realtime/socket";
import AppearanceModalV2 from "./AppearanceModalV2";
import CompetitiveTestBoard from "./CompetitiveTestBoard";
import MembersRealtime from "./MembersRealtime";
import StudyGroupChat from "./StudyGroupChat";
import "./studyGroups.css";
import "./studyGroupsApp.css";
import "./studyGroupsWorkspace.css";
import "./studyGroupsModals.css";
import "./studyGroupsHeader.css";
import "./studyGroupsAppearance.css";
import "./studyGroupsBannerFix.css";
import "./studyGroupsWorkspaceFixes.css";
import "./memberNavigation.js";

const tabs = ["Members", "Chat", "Live Tests"];

function LiveTestsBadge({ groupId }) {
  const [hasLiveTest, setHasLiveTest] = useState(false);
  const refresh = useCallback(async () => { try { const response = await getCompetitiveTests(groupId, 1, 10); setHasLiveTest((response.tests || []).some((test) => ["SCHEDULED", "LIVE"].includes(test.status))); } catch { setHasLiveTest(false); } }, [groupId]);
  useEffect(() => { refresh(); const socket = getRealtimeSocket(); const onTest = (event) => { if (!event?.groupId || String(event.groupId) === String(groupId)) refresh(); }; socket.on("group:test", onTest); socket.on("group:test-participant", onTest); return () => { socket.off("group:test", onTest); socket.off("group:test-participant", onTest); }; }, [groupId, refresh]);
  return hasLiveTest ? <span aria-label="Active or upcoming tests" title="Active or upcoming tests" style={{ display: "inline-flex", width: 7, height: 7, marginLeft: 6, borderRadius: "50%", background: "var(--accent)", verticalAlign: "middle" }} /> : null;
}

function Modal({ title, children, close }) { return <div className="sg-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="sg-modal" role="dialog" aria-modal="true" aria-labelledby="sg-modal-title"><button className="sg-modal-close" type="button" onClick={close} aria-label="Close">x</button><h2 id="sg-modal-title">{title}</h2>{children}</section></div>; }
function InviteModal({ groupId, close }) {
  const [url, setUrl] = useState(""); const [copied, setCopied] = useState(false); const [error, setError] = useState("");
  const generate = useCallback(async () => { try { setUrl((await createInviteLink(groupId)).inviteUrl); } catch (err) { setError(err.response?.data?.message || "Invite link could not be created."); } }, [groupId]);
  useEffect(() => { generate(); }, [generate]);
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setError("Copy failed. Select the link and copy it manually."); } };
  return <Modal title="Invite a member" close={close}><p className="sg-muted">Share this link with someone you want to add to this group. It expires in 7 days.</p>{url ? <><input className="sg-invite-input" readOnly value={url} onFocus={(event) => event.target.select()} /><div className="sg-actions"><button className="sg-btn accent" type="button" onClick={copy}>{copied ? "Copied" : "Copy invite link"}</button><button className="sg-btn" type="button" onClick={generate}>Generate new link</button></div></> : <p className="sg-muted">Generating secure invite link...</p>}{error && <p className="sg-error-text">{error}</p>}</Modal>;
}

export default function StudyGroupDetailsPage() {
  const { groupId } = useParams(); const [searchParams, setSearchParams] = useSearchParams(); const requestedTab = searchParams.get("tab"); const [data, setData] = useState(null); const [tab, setTabState] = useState(tabs.includes(requestedTab) ? requestedTab : "Members"); const [modal, setModal] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setData(await getDashboard(groupId)); setError(""); } catch (err) { setError(err.response?.data?.message || "This group could not be loaded."); } finally { setLoading(false); } }, [groupId]);
  const setTab = (next) => { setTabState(next); setSearchParams((current) => { const params = new URLSearchParams(current); params.set("tab", next); return params; }, { replace: true }); };
  useEffect(() => { if (tabs.includes(requestedTab) && requestedTab !== tab) setTabState(requestedTab); }, [requestedTab, tab]); useEffect(() => { load(); }, [load]);
  useEffect(() => { const socket = getRealtimeSocket(); const onAppearance = (group) => { if (String(group._id) === String(groupId)) setData((current) => current ? { ...current, group } : current); }; const onMembership = (event) => { if (!event?.groupId || String(event.groupId) === String(groupId)) load(); }; const join = () => socket.emit("group:join", { groupId }); socket.on("group:appearance", onAppearance); socket.on("group:membership", onMembership); if (socket.connected) join(); else socket.once("connect", join); return () => { socket.off("group:appearance", onAppearance); socket.off("group:membership", onMembership); socket.off("connect", join); socket.emit("group:leave", { groupId }); }; }, [groupId, load]);
  const membership = async (fn) => { try { await fn(groupId); await load(); } catch (err) { setError(err.response?.data?.message || "Membership action failed."); } }; const saveAppearance = async (payload) => { const group = await updateGroupAppearance(groupId, payload); setData((current) => ({ ...current, group })); };
  if (loading) return <main className="sg-app"><div className="sg-main"><div className="sg-card">Loading group workspace...</div></div></main>; if (error || !data?.group) return <main className="sg-app"><div className="sg-main"><div className="sg-card"><h2>Group unavailable</h2><p>{error || "This group does not exist."}</p><button className="sg-btn accent" onClick={load}>Retry</button><Link className="sg-btn" to="/dashboard/groups">Back to groups</Link></div></div></main>;
  const bannerStyle = data.group.bannerUrl ? { "--sg-banner-image": `url(${data.group.bannerUrl})`, "--sg-banner-color": data.group.accentColor || "#f5a623", "--sg-banner-zoom": Number(data.group.bannerZoom) || 1 } : { "--sg-banner-color": data.group.accentColor || "#f5a623", "--sg-banner-zoom": Number(data.group.bannerZoom) || 1 };
  return <main className="sg-app"><div className="sg-main"><Link to="/dashboard/groups" className="sg-muted">Back to all groups</Link><section className="sg-workspace-head" style={{ marginTop: 16 }}><button className="sg-workspace-cover sg-appearance-trigger" style={bannerStyle} type="button" onClick={() => setModal("appearance")} aria-label="Customize group banner"><span className="sg-banner-menu" aria-hidden="true">⋮</span></button><div className="sg-workspace-info"><div className="sg-workspace-avatar">{data.group.avatarText || data.group.name[0]}</div><div className="sg-actions"><button className="sg-btn accent" onClick={() => setModal("invite")}>Invite</button><button className="sg-btn" onClick={() => membership(leaveGroup)}>Leave</button></div><h1>{data.group.name}</h1><p className="sg-sub">{data.group.description || "No description provided."}</p><div className="sg-meta"><span>{data.group.isPublic ? "Public group" : "Private group"}</span><span>{data.members.length} members</span></div></div><div className="sg-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "Live Tests" ? <><span>Live Tests</span><LiveTestsBadge groupId={groupId} /></> : item}</button>)}</div></section>{tab === "Members" && <MembersRealtime members={data.members} groupId={groupId} />}{tab === "Chat" && <StudyGroupChat groupId={groupId} />}{tab === "Live Tests" && <CompetitiveTestBoard groupId={groupId} />}{modal === "invite" && <InviteModal groupId={groupId} close={() => setModal("")} />}{modal === "appearance" && <AppearanceModalV2 group={data.group} save={saveAppearance} close={() => setModal("")} />}</div></main>;
}
