import { Scale, Sparkles } from "lucide-react";
import { formatPlayerName, getPlayerInitials } from "../lib/playerNames";
import type { Schedule, Session } from "../types";

export function FairnessPanel({ session, schedule }: { session: Session; schedule?: Schedule }) {
  if (!schedule) return <section className="workspace-panel empty-state"><span><Scale /></span><h2>Fairness summary pending</h2><p>Playing-time balance will appear after the backend generates this session’s schedule.</p></section>;
  const playerMap = new Map(session.players.map((player) => [player.id, player]));
  const maximum = Math.max(...schedule.fairness.players.map((player) => player.playingMinutes));

  return (
    <div className="fairness-layout">
      <section className="fairness-hero">
        <div className="score-ring" style={{ "--score": `${schedule.fairness.score * 3.6}deg` } as React.CSSProperties}><div><strong>{schedule.fairness.score}</strong><span>/ 100</span></div></div>
        <div><p className="eyebrow"><Sparkles />Fairness projection</p><h2>Excellent balance</h2><p>Everyone receives nearly equal court time. The remaining {schedule.fairness.spreadMinutes}-minute difference is the closest mathematically achievable distribution.</p></div>
      </section>
      <section className="workspace-panel fairness-table-panel">
        <div className="panel-heading"><div><h2>Playing time by player</h2><p>Projected across all {schedule.rounds.length} rounds</p></div><div className="fairness-summary-stat"><span>Average</span><strong>{schedule.fairness.averageMinutes} min</strong></div></div>
        <div className="fairness-table">
          <div className="fairness-row fairness-row--head"><span>Player</span><span>Playing time</span><span>Rounds</span><span>Rests</span></div>
          {schedule.fairness.players.map((entry, index) => {
            const player = playerMap.get(entry.playerId);
            const playerName = player?.name ?? "Unknown player";
            return <div className="fairness-row" key={entry.playerId}><span className="fair-player"><i className={`avatar--tone-${index % 5}`} title={playerName}>{getPlayerInitials(playerName)}</i><strong title={playerName}>{formatPlayerName(playerName)}</strong></span><span className="time-bar"><i><b style={{ width: `${entry.playingMinutes / maximum * 100}%` }} /></i><strong>{entry.playingMinutes} min</strong></span><span>{entry.roundsPlayed}</span><span>{entry.restCount}</span></div>;
          })}
        </div>
      </section>
    </div>
  );
}
