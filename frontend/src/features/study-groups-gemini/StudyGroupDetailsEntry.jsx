import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import StudyGroupAccessGate from "./StudyGroupAccessGate";
import StudyGroupDetailsPage from "./StudyGroupDetailsPage";

export default function StudyGroupDetailsEntry() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");

  useEffect(() => {
    if (requestedTab !== "Chat") return undefined;
    const selectChat = () => {
      const button = Array.from(document.querySelectorAll(".sg-tabs button")).find((item) => item.textContent?.trim() === "Chat");
      if (!button) return false;
      button.click();
      return true;
    };
    if (selectChat()) return undefined;
    const timer = window.setInterval(() => {
      if (selectChat()) window.clearInterval(timer);
    }, 50);
    return () => window.clearInterval(timer);
  }, [requestedTab]);

  return <StudyGroupAccessGate><StudyGroupDetailsPage /></StudyGroupAccessGate>;
}
