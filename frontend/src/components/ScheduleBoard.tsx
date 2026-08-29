import { ChevronDown, Clock3, Coffee, Info, MapPin, Settings2, Shuffle, UserCog, UsersRound } from "lucide-react";
import { useState } from "react";
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

export function ScheduleBoard({
  session,
  schedule,
  onEditSetup,
  onEditPlayers,
  onReshuffle,
}: {
  session: Session;
  schedule?: Schedule;
  onEditSetup?: () => void;
  onEditPlayers?: () => void;
  onReshuffle?: () => void;
}) {
  const [showAllRounds, setShowAllRounds] = useState(false);
  const playerMap = new Map(session.players.map((player) => [player.id, player]));

  if (!schedule) {
    return <section className="workspace-panel empty-state schedule-empty"><span><UsersRound /></span><p className="eyebrow">Step 3</p><h2>Your schedule will appear here</h2><p>Add at least two players, then use the action above to generate fair court rotations.</p><div className="info-strip"><Info />Fairness, availability, rests, and team balance are calculated by the scheduler.</div></section>;
  }

  const activeRound = schedule.rounds.find((round) => round.status === "ACTIVE");
  const visibleRounds = showAllRounds ? schedule.rounds : schedule.rounds.slice(0, 3);
  const hiddenRoundCount = schedule.rounds.length - visibleRounds.length;

  return (
    <section className="workspace-panel schedule-panel">
      <div className="panel-heading"><div><p className="eyebrow">{activeRound ? "Now playing" : "Step 3"}</p><h2>{activeRound ? `Round ${activeRound.number} is live` : "Round schedule"}</h2><p>{schedule.rounds.length} rounds · {session.roundDurationMinutes} minutes each · {session.courtCount} courts</p></div><span className={`source-pill ${schedule.isDemo ? "" : "source-pill--generated"}`}>{schedule.isDemo ? "Sample schedule" : "FairPlay generated"}</span></div>
      {!schedule.isDemo && (session.status === "DRAFT" || session.status === "READY") && onEditSetup && onEditPlayers && onReshuffle && (
        <div className="schedule-review-toolbar" aria-label="Change generated schedule">
          <div><strong>Want a different plan?</strong><span>Revise the inputs or ask FairPlay for another balanced arrangement.</span></div>
          <div className="schedule-review-actions">
            <button type="button" className="button button--ghost button--small" onClick={onEditSetup}><Settings2 />Change setup</button>
            <button type="button" className="button button--ghost button--small" onClick={onEditPlayers}><UserCog />Edit players</button>
            <button type="button" className="button button--secondary button--small" onClick={onReshuffle}><Shuffle />Reshuffle teams</button>
          </div>
        </div>
      )}
      <div className="schedule-summary" aria-label="Schedule summary">
        <div><Clock3 /><span><strong>{schedule.rounds[0]?.startTime}–{schedule.rounds.at(-1)?.endTime}</strong><small>Playing window</small></span></div>
        <div><UsersRound /><span><strong>{session.players.length} players</strong><small>{Math.max(0, session.players.length - session.courtCount * session.playersPerCourt)} rest each round</small></span></div>
        <div><Coffee /><span><strong>{schedule.fairness.spreadMinutes} min spread</strong><small>Closest fair balance</small></span></div>
      </div>
      <div className="round-list">
        {visibleRounds.map((round) => (
          <article className={`round-card ${round.status === "ACTIVE" ? "round-card--current" : round.status === "COMPLETED" ? "round-card--completed" : ""}`} key={round.id}>
            <div className="round-index"><span>{round.status === "ACTIVE" ? "Now" : round.status === "COMPLETED" ? "Finished" : "Round"}</span><strong>{String(round.number).padStart(2, "0")}</strong><p><Clock3 />{round.startTime}–{round.endTime}</p></div>
            <div className="court-grid">
              {round.courts.map((court) => (
                <div className="court-match" key={court.courtNumber}>
                  <header className="court-match__header"><span><MapPin />Court {court.courtNumber}</span><small>{court.teamA.length + court.teamB.length} players</small></header>
                  <div className="court-match__teams">
                    <TeamPanel label="A" playerIds={court.teamA} playerMap={playerMap} variant="a" />
                    <span className="versus">VS</span>
                    <TeamPanel label="B" playerIds={court.teamB} playerMap={playerMap} variant="b" />
                  </div>
                  {court.result && <div className="match-result"><span>{court.result.winner === "UNRECORDED" ? "Completed · no score" : court.result.winner === "DRAW" ? "Draw" : `Team ${court.result.winner} won`}</span>{court.result.winner !== "UNRECORDED" && <strong>{court.result.teamAScore}–{court.result.teamBScore}</strong>}</div>}
                </div>
              ))}
            </div>
            <div className="resting-list"><p><Coffee />Resting</p><div className="resting-players">{round.restingPlayerIds.length ? round.restingPlayerIds.map((id) => { const playerName = playerMap.get(id)?.name ?? "Unknown player"; return <div className="resting-player" key={id} title={playerName} aria-label={`${playerName} is resting`}><span className="resting-player__avatar" aria-hidden="true">{getPlayerInitials(playerName)}</span><span className="resting-player__name">{formatPlayerName(playerName)}</span></div>; }) : <span className="no-resting">Everyone plays</span>}</div></div>
            {round.status === "ACTIVE" && <div className="live-flag"><i />Now playing</div>}
          </article>
        ))}
        {schedule.rounds.length > 3 && <button className="show-rounds-button" type="button" onClick={() => setShowAllRounds((current) => !current)}>{showAllRounds ? "Show fewer rounds" : `Show ${hiddenRoundCount} more rounds`}<ChevronDown className={showAllRounds ? "is-open" : ""} /></button>}
      </div>
    </section>
  );
}
