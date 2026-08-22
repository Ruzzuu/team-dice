import { Clock3, Coffee, Info, MapPin, UsersRound } from "lucide-react";
import { formatPlayerName, getPlayerInitials } from "../lib/playerNames";
import type { Player, Schedule, Session } from "../types";

function TeamPanel({ label, playerIds, playerMap, variant }: { label: string; playerIds: string[]; playerMap: Map<string, Player>; variant: "a" | "b" }) {
  return (
    <section className={`team-panel team-panel--${variant}`} aria-label={`Team ${label}`}>
      <div className="team-panel__heading"><span className={`team-label ${variant === "b" ? "team-label--orange" : ""}`}>{label}</span><strong>Team {label}</strong></div>
      <div className="team-members">
        {playerIds.map((id) => {
          const playerName = playerMap.get(id)?.name ?? "Unknown player";
          return (
            <div className="team-player" key={id} title={playerName} aria-label={playerName}>
              <span className="team-player__avatar" aria-hidden="true">{getPlayerInitials(playerName)}</span>
              <span className="team-player__name">{formatPlayerName(playerName)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ScheduleBoard({ session, schedule }: { session: Session; schedule?: Schedule }) {
  const playerMap = new Map(session.players.map((player) => [player.id, player]));

  if (!schedule) {
    return <section className="workspace-panel empty-state schedule-empty"><span><UsersRound /></span><h2>Schedule not generated yet</h2><p>Your session and roster are safely saved. Generate a schedule when your roster is ready.</p><div className="info-strip"><Info />Fair scheduling rules are calculated by the backend, not in the browser.</div></section>;
  }

  return (
    <section className="workspace-panel schedule-panel">
      <div className="panel-heading"><div><h2>Round schedule</h2><p>{schedule.rounds.length} rounds · {session.roundDurationMinutes} minutes each</p></div><span className={`demo-pill ${schedule.isDemo ? "" : "demo-pill--generated"}`}>{schedule.isDemo ? "Interactive demo data" : "Backend generated"}</span></div>
      <div className="round-list">
        {schedule.rounds.map((round) => (
          <article className={`round-card ${round.status === "ACTIVE" ? "round-card--current" : ""}`} key={round.id}>
            <div className="round-index"><span>Round</span><strong>{String(round.number).padStart(2, "0")}</strong><p><Clock3 />{round.startTime}<br />{round.endTime}</p></div>
            <div className="court-grid">
              {round.courts.map((court) => (
                <div className="court-match" key={court.courtNumber}>
                  <header className="court-match__header"><span><MapPin />Court {court.courtNumber}</span><small>{court.teamA.length + court.teamB.length} players</small></header>
                  <div className="court-match__teams">
                    <TeamPanel label="A" playerIds={court.teamA} playerMap={playerMap} variant="a" />
                    <span className="versus">VS</span>
                    <TeamPanel label="B" playerIds={court.teamB} playerMap={playerMap} variant="b" />
                  </div>
                </div>
              ))}
            </div>
            <div className="resting-list"><p><Coffee />Resting</p><div className="resting-players">{round.restingPlayerIds.length ? round.restingPlayerIds.map((id) => { const playerName = playerMap.get(id)?.name ?? "Unknown player"; return <div className="resting-player" key={id} title={playerName} aria-label={`${playerName} is resting`}><span className="resting-player__avatar" aria-hidden="true">{getPlayerInitials(playerName)}</span><span className="resting-player__name">{formatPlayerName(playerName)}</span></div>; }) : <span className="no-resting">Everyone plays</span>}</div></div>
            {round.status === "ACTIVE" && <div className="live-flag"><i />Now playing</div>}
          </article>
        ))}
      </div>
    </section>
  );
}
