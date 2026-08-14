import { Award, Flame, LockKeyhole, Sparkles, Trophy, Zap } from "lucide-react";
import { Card } from "../lib/ui";

const LEVELS = [0, 100, 250, 500, 1000, 2000, 4000];

function levelFor(xp) {
  let level = 1;
  LEVELS.forEach((threshold, index) => { if (xp >= threshold) level = index + 1; });
  const current = LEVELS[level - 1] || 0;
  const next = LEVELS[level] ?? null;
  return { level, current, next, progress: next ? Math.min(100, Math.round(((xp - current) / (next - current)) * 100)) : 100 };
}

export default function AptitudeGamificationCard({ dashboard }) {
  const xp = dashboard?.aptitudeXp || 0;
  const streak = dashboard?.currentStreak || 0;
  const longest = dashboard?.longestStreak || 0;
  const level = levelFor(xp);
  const badges = dashboard?.badges || [];
  const mission = dashboard?.dailyMission;
  const missionItems = Object.values(mission?.completed || {});
  const missionDone = missionItems.filter(Boolean).length;
  const missionComplete = Boolean(mission?.xpRewarded);

  return (
    <Card className="apt-gamification-card">
      <div className="apt-gamification-heading">
        <div className="apt-gamification-title"><span className="apt-gamification-icon"><Flame size={17} /></span><div><strong>Aptitude streak</strong><small>{streak ? (missionComplete ? "Today's mission secured" : "Keep going today") : "Answer one question to start"}</small></div></div>
        <span className="apt-gamification-level"><Sparkles size={13} /> Level {level.level}</span>
      </div>

      <div className="apt-gamification-stats">
        <div><strong>{streak}</strong><span>Current streak</span></div>
        <div><strong>{longest}</strong><span>Best streak</span></div>
        <div><strong>{xp}</strong><span>Aptitude XP</span></div>
      </div>

      <div className="apt-gamification-progress">
        <div><span><Zap size={12} /> Progress to level {level.level + 1}</span><b>{level.next == null ? "Max level" : `${Math.max(0, level.next - xp)} XP to go`}</b></div>
        <div className="apt-gamification-track"><span style={{ width: `${level.progress}%` }} /></div>
      </div>

      <div className="apt-gamification-footer">
        <span><Trophy size={13} /> {badges.length} badge{badges.length === 1 ? "" : "s"} unlocked</span>
        {missionItems.length > 0 && <span><Award size={13} /> Mission {missionDone}/{missionItems.length}</span>}
      </div>

      {badges.length === 0 && <div className="apt-gamification-hint"><LockKeyhole size={13} /> Your first correct answer unlocks your first aptitude badge.</div>}
    </Card>
  );
}
