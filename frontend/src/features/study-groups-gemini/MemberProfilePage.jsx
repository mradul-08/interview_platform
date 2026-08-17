import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMembers } from "./api";
import "./studyGroups.css";
import "./studyGroupsApp.css";
import "./studyGroupsBannerFix.css";

export default function MemberProfilePage() {
  const { groupId, memberId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const cached = sessionStorage.getItem(`study-group-member:${groupId}:${memberId}`);
    const resolveMember = (member) => {
      const userId = member?.userId?._id;
      if (userId) navigate(`/dashboard/profile/${encodeURIComponent(userId)}`, { replace: true, state: { fromStudyGroup: `/dashboard/groups/${groupId}` } });
      else setError("This member could not be identified.");
    };
    if (cached) {
      try { resolveMember(JSON.parse(cached)); return () => { active = false; }; } catch { sessionStorage.removeItem(`study-group-member:${groupId}:${memberId}`); }
    }
    getMembers(groupId).then((members) => {
      if (!active) return;
      const decoded = decodeURIComponent(memberId || "");
      const member = members.find((item) => String(item.userId?._id) === String(memberId) || String(item.userId?.name) === decoded);
      resolveMember(member);
    }).catch((err) => active && setError(err.response?.data?.message || "Visitor profile could not be loaded."));
    return () => { active = false; };
  }, [groupId, memberId, navigate]);

  return <main className="sg-app"><div className="sg-main sg-profile-main"><section className={`sg-card sg-member-profile-page ${error ? "" : "sg-opening-profile"}`}>{error ? <><h1>Visitor profile unavailable</h1><p>{error}</p><Link className="sg-btn" to={`/dashboard/groups/${groupId}`}>Back to group</Link></> : <><span className="sg-profile-spinner" /><span className="sg-eyebrow">VISITOR PROFILE</span><h1>Opening profile...</h1><p>Loading this member&apos;s public information</p></>}</section></div></main>;
}
