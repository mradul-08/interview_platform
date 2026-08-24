import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveJoinCode } from "./api";
import "./mockInterviews.css";

export default function MockInterviewJoinPage() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    resolveJoinCode(joinCode).then((interview) => { if (active) navigate(`/dashboard/mock/${interview.id}`, { replace: true }); }).catch((e) => { if (active) setError(e.response?.data?.message || "This interview link is invalid or has expired."); });
    return () => { active = false; };
  }, [joinCode, navigate]);
  return <div className="mi-empty"><strong>{error ? "Couldn't join this interview" : "Joining interview…"}</strong>{error && <span>{error}</span>}</div>;
}
