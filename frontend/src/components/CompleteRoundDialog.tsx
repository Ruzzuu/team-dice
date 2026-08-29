import { CheckCircle2, LogOut, Trophy } from "lucide-react";
import { type FormEvent, useState } from "react";
import { formatPlayerName } from "../lib/playerNames";
import type { CompleteRoundInput, Player, Round } from "../types";
import { Dialog, DialogHeader } from "./Dialog";

interface ScoreDraft {
  teamA: string;
  teamB: string;
  completedWithoutScore: boolean;
}

export function CompleteRoundDialog({
  round,
  players,
  saving,
  onClose,
  onConfirm,
}: {
  round: Round;
  players: Player[];
  saving: boolean;
  onClose: () => void;
  onConfirm: (input: CompleteRoundInput) => void;
}) {
  const [scores, setScores] = useState<Record<number, ScoreDraft>>(() => Object.fromEntries(
    round.courts.map((court) => [court.courtNumber, { teamA: "", teamB: "", completedWithoutScore: false }]),
  ));
  const [departing, setDeparting] = useState<string[]>([]);
  const [error, setError] = useState("");
  const playerMap = new Map(players.map((player) => [player.id, player]));

  function updateScore(courtNumber: number, update: Partial<ScoreDraft>) {
    setScores((current) => ({ ...current, [courtNumber]: { ...current[courtNumber], ...update } }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const results = round.courts.map((court) => {
      const draft = scores[court.courtNumber];
      if (!draft.completedWithoutScore && (draft.teamA === "" || draft.teamB === "")) return undefined;
      return {
        courtNumber: court.courtNumber,
        teamAScore: draft.completedWithoutScore ? undefined : Number(draft.teamA),
        teamBScore: draft.completedWithoutScore ? undefined : Number(draft.teamB),
        completedWithoutScore: draft.completedWithoutScore,
      };
    });
    if (results.some((result) => !result)) return setError("Enter both scores for every court, or mark the match completed without a score.");
    setError("");
    onConfirm({ roundId: round.id, results: results as CompleteRoundInput["results"], departingPlayerIds: departing });
  }

  return (
    <Dialog titleId="complete-round-title" onClose={onClose} className="complete-round-dialog">
      <form onSubmit={submit} aria-label="Complete current round">
        <DialogHeader eyebrow={`Round ${round.number}`} title="Save results and finish round" titleId="complete-round-title" onClose={onClose} />
        <div className="live-dialog-intro"><CheckCircle2 /><p><strong>Completed matches stay in history</strong><span>Scores and lineups are locked after confirmation.</span></p></div>
        <div className="court-result-forms">
          {round.courts.map((court) => {
            const draft = scores[court.courtNumber];
            const teamA = court.teamA.map((id) => formatPlayerName(playerMap.get(id)?.name ?? "Unknown")).join(" & ");
            const teamB = court.teamB.map((id) => formatPlayerName(playerMap.get(id)?.name ?? "Unknown")).join(" & ");
            return (
              <fieldset className="court-result-form" key={court.courtNumber}>
                <legend><Trophy />Court {court.courtNumber}</legend>
                <div className="score-entry"><label><span>Team A</span><small>{teamA}</small><input type="number" min="0" inputMode="numeric" aria-label={`Court ${court.courtNumber} Team A score`} value={draft.teamA} disabled={draft.completedWithoutScore} onChange={(event) => updateScore(court.courtNumber, { teamA: event.target.value })} /></label><strong>–</strong><label><span>Team B</span><small>{teamB}</small><input type="number" min="0" inputMode="numeric" aria-label={`Court ${court.courtNumber} Team B score`} value={draft.teamB} disabled={draft.completedWithoutScore} onChange={(event) => updateScore(court.courtNumber, { teamB: event.target.value })} /></label></div>
                <label className="checkbox-row"><input type="checkbox" checked={draft.completedWithoutScore} onChange={(event) => updateScore(court.courtNumber, { completedWithoutScore: event.target.checked })} /><span>Completed without recording a score</span></label>
              </fieldset>
            );
          })}
        </div>
        <section className="departure-section" aria-labelledby="departure-title">
          <div><LogOut /><p><strong id="departure-title">Leaving after this round</strong><span>Selected players remain in match history but will not appear in future rounds.</span></p></div>
          <div className="departure-grid">
            {players.map((player) => <label className="checkbox-row" key={player.id}><input type="checkbox" checked={departing.includes(player.id)} onChange={(event) => setDeparting((current) => event.target.checked ? [...current, player.id] : current.filter((id) => id !== player.id))} /><span>{formatPlayerName(player.name)}</span></label>)}
          </div>
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="button button--ghost" disabled={saving} onClick={onClose}>Keep playing</button><button className="button button--primary" disabled={saving}><CheckCircle2 />{saving ? "Saving results…" : departing.length ? "Finish and replan" : "Finish round"}</button></div>
      </form>
    </Dialog>
  );
}
