import { Scale, Sparkles } from "lucide-react";
import { formatPlayerName, getPlayerInitials } from "../lib/playerNames";
import type { Schedule, Session } from "../types";

export function FairnessPanel({ session, schedule }: { session: Session; schedule?: Schedule }) {
  if (!schedule) return <section className="workspace-panel empty-state"><span><Scale /></span><h2>Fairness summary pending</h2><p>Generate the schedule to compare playing time, rounds, and rests for every player.</p></section>;
  const playerMap = new Map(session.players.map((player) => [player.id, player]));
  const maximum = Math.max(1, ...schedule.fairness.players.map((player) => player.playingMinutes));
  const rating = schedule.fairness.score >= 95 ? "Excellent balance" : schedule.fairness.score >= 85 ? "Strong balance" : schedule.fairness.score >= 70 ? "Fair balance" : "Balance needs review";

  return (
    <div className="fairness-layout">
      <section className="fairness-hero">
        <div className="score-ring" style={{ "--score": `${schedule.fairness.score * 3.6}deg` } as React.CSSProperties}><div><strong>{schedule.fairness.score}</strong><span>/ 100</span></div></div>
        <div><p className="eyebrow"><Sparkles />Fairness projection</p><h2>{rating}</h2><p>The difference between the most and least playing time is {schedule.fairness.spreadMinutes} minutes—the closest balance available for this setup.</p></div>
      </section>
      <section className="fairness-metrics" aria-label="Fairness metrics">
        <article><span>Average court time</span><strong>{schedule.fairness.averageMinutes} min</strong></article>
        <article><span>Playing-time spread</span><strong>{schedule.fairness.spreadMinutes} min</strong></article>
        <article><span>Rounds planned</span><strong>{schedule.rounds.length}</strong></article>
      </section>
      <section className="workspace-panel fairness-table-panel">
        <div className="panel-heading"><div><h2>Playing time by player</h2><p>Projected across all {schedule.rounds.length} rounds</p></div></div>
        <div className="fairness-table">
          <div className="fairness-row fairness-row--head"><span>Player</span><span>Playing time</span><span>Rounds</span><span>Rests</span></div>
          {schedule.fairness.players.map((entry, index) => {
            const player = playerMap.get(entry.playerId);
            const playerName = player?.name ?? "Unknown player";
            return <div className="fairness-row" key={entry.playerId}><span className="fair-player"><i className={`avatar--tone-${index % 5}`} title={playerName}>{getPlayerInitials(playerName)}</i><strong title={playerName}>{formatPlayerName(playerName)}</strong></span><span className="time-bar"><i><b style={{ width: `${entry.playingMinutes / maximum * 100}%` }} /></i><strong>{entry.playingMinutes} min</strong></span><span data-label="Rounds">{entry.roundsPlayed}</span><span data-label="Rests">{entry.restCount}</span></div>;
          })}
        </div>
      </section>
    </div>
  );
}
