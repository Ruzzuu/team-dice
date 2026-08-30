import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, Clock3, Play, RefreshCw, Scale, Settings2, Shuffle, Sparkles, SquareCheckBig, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CompleteRoundDialog } from "../components/CompleteRoundDialog";
import { FairnessPanel } from "../components/FairnessPanel";
import { Dialog, DialogHeader } from "../components/Dialog";
import { PlayerRoster } from "../components/PlayerRoster";
import { ScheduleBoard } from "../components/ScheduleBoard";
import { SessionProgress } from "../components/SessionProgress";
import { SessionSettingsModal } from "../components/SessionSettingsModal";
import { StatusBadge } from "../components/StatusBadge";
import { calculateTimingPreview, formatSessionDate } from "../lib/timing";
import { localFairPlayApi } from "../services/fairplayApi";
import type { Schedule, Session, SessionStep } from "../types";

type Tab = "schedule" | "players" | "fairness";

export function SessionPage() {
  const { sessionId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const activeTab: Tab = requestedTab === "players" || requestedTab === "fairness" ? requestedTab : "schedule";
  const [session, setSession] = useState<Session>();
  const [schedule, setSchedule] = useState<Schedule>();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [startConfirmationOpen, setStartConfirmationOpen] = useState(false);
  const [completeRoundOpen, setCompleteRoundOpen] = useState(false);
  const [replanConfirmationOpen, setReplanConfirmationOpen] = useState(false);
  const [reshuffleConfirmationOpen, setReshuffleConfirmationOpen] = useState(false);
  const [addPlayerRequest, setAddPlayerRequest] = useState(0);
  const [workflowNotice, setWorkflowNotice] = useState("");

  useEffect(() => {
    setLoading(true);
    void Promise.all([localFairPlayApi.getSession(sessionId), localFairPlayApi.getSchedule(sessionId)]).then(([nextSession, nextSchedule]) => {
      setSession(nextSession);
      setSchedule(nextSchedule);
      setLoading(false);
    });
  }, [sessionId]);

  if (loading) return <div className="page loading-state"><div className="spinner" />Loading session…</div>;
  if (!session) return <div className="page empty-state"><h1>Session not found</h1><p>This draft may have been removed from your browser.</p><Link className="button button--primary" to="/">Return to overview</Link></div>;

  const currentSession = session;
  const isDemo = currentSession.id === "demo-friday-badminton";
  const timing = calculateTimingPreview(currentSession);
  const canGenerate = currentSession.players.length >= 2 && timing.numberOfRounds > 0;
  const needsSchedule = currentSession.status === "DRAFT" || !schedule;
  const activeRound = schedule?.rounds.find((round) => round.status === "ACTIVE");
  const hasUpcomingRound = schedule?.rounds.some((round) => round.status === "UPCOMING") ?? false;
  const hasCompletedRound = schedule?.rounds.some((round) => round.status === "COMPLETED") ?? false;
  const activePlayers = currentSession.players.filter((player) => player.participationStatus !== "LEFT");
  const isLive = currentSession.status === "ACTIVE";
  const isLocked = isLive || currentSession.status === "COMPLETED";
  const requestedStep = params.get("step");
  const activeStep: SessionStep = requestedStep === "setup" || requestedStep === "players" || requestedStep === "schedule" || requestedStep === "play"
    ? requestedStep
    : activeTab === "players" ? "players" : currentSession.status === "ACTIVE" || currentSession.status === "COMPLETED" ? "play" : "schedule";
  const primaryLabel = currentSession.status === "COMPLETED"
    ? "Session completed"
    : isLive
      ? activeRound ? "Complete current round" : hasUpcomingRound ? "Start next round" : "Replan remaining matches"
      : activeStep === "players"
    ? "Add player"
    : activeStep === "play"
      ? currentSession.status === "ACTIVE" ? "Session active" : "Start session"
      : needsSchedule
        ? actionLoading ? "Generating…" : "Generate schedule"
        : "Continue to play";
  const primaryDisabled = isDemo || currentSession.status === "COMPLETED" || actionLoading || (!isLive && activeStep === "schedule" && needsSchedule && !canGenerate);

  function selectTab(tab: Tab, step: SessionStep = tab === "players" ? "players" : "schedule") {
    setParams({ tab, step });
    setActionError("");
  }

  function selectStep(step: SessionStep) {
    setActionError("");
    if (step === "setup") {
      if (isLocked) {
        setActionError("Settings are locked after the session has started.");
        return;
      }
      setSettingsOpen(true);
      return;
    }
    if (step === "players") {
      selectTab("players", "players");
      return;
    }
    if (step === "schedule") {
      if (currentSession.players.length < 2) {
        selectTab("players", "players");
        setActionError(`Add ${2 - currentSession.players.length} more player${currentSession.players.length === 1 ? "" : "s"} to unlock Schedule.`);
        return;
      }
      selectTab("schedule", "schedule");
      return;
    }
    if (!schedule) {
      selectTab(currentSession.players.length < 2 ? "players" : "schedule", currentSession.players.length < 2 ? "players" : "schedule");
      setActionError(currentSession.players.length < 2 ? "Complete the player roster before starting." : "Generate and review a schedule before starting.");
      return;
    }
    selectTab("schedule", "play");
  }

  async function handlePrimaryAction() {
    if (primaryDisabled) return;
    if (isLive) {
      if (activeRound) {
        setCompleteRoundOpen(true);
        return;
      }
      if (hasUpcomingRound) {
        await startNextRound();
        return;
      }
      setReplanConfirmationOpen(true);
      return;
    }
    if (activeStep === "players") {
      setAddPlayerRequest((value) => value + 1);
      return;
    }
    if (activeStep === "play") {
      if (!schedule) return selectStep("play");
      setStartConfirmationOpen(true);
      return;
    }
    if (needsSchedule) {
      setActionLoading(true);
      setActionError("");
      setWorkflowNotice("");
      try {
        const result = await localFairPlayApi.generateSchedule(currentSession);
        setSession(result.session);
        setSchedule(result.schedule);
        selectTab("schedule", "schedule");
      } catch (reason) {
        setActionError(reason instanceof Error ? reason.message : "The schedule could not be generated.");
      } finally {
        setActionLoading(false);
      }
      return;
    }
    selectStep("play");
  }

  async function refreshLiveState() {
    const [nextSession, nextSchedule] = await Promise.all([
      localFairPlayApi.getSession(currentSession.id),
      localFairPlayApi.getSchedule(currentSession.id),
    ]);
    if (nextSession) setSession(nextSession);
    setSchedule(nextSchedule);
  }

  async function completeCurrentRound(input: Parameters<typeof localFairPlayApi.completeRound>[1]) {
    setActionLoading(true);
    setActionError("");
    setWorkflowNotice("");
    try {
      const result = await localFairPlayApi.completeRound(currentSession.id, input);
      setSession(result.session);
      setSchedule(result.schedule);
      setCompleteRoundOpen(false);
      setWorkflowNotice(input.departingPlayerIds.length
        ? "Results saved. Departing players were marked Left and the remaining matches were rebuilt for the active roster."
        : result.session.status === "COMPLETED"
          ? "Final results saved. This session is complete."
          : "Results saved. Start the next round when the courts are ready.");
    } catch (reason) {
      await refreshLiveState();
      setCompleteRoundOpen(false);
      setActionError(`${reason instanceof Error ? reason.message : "The round could not be completed."} If the results appear below, they are already saved; use Replan remaining matches to retry.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function startNextRound() {
    setActionLoading(true);
    setActionError("");
    setWorkflowNotice("");
    try {
      const result = await localFairPlayApi.startNextRound(currentSession.id);
      setSession(result.session);
      setSchedule(result.schedule);
      setWorkflowNotice(result.session.status === "COMPLETED" ? "No matches remain. This session is complete." : `Round ${result.schedule.rounds.find((round) => round.status === "ACTIVE")?.number ?? ""} is now live.`);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The next round could not be started.");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmReplan() {
    setActionLoading(true);
    setActionError("");
    setWorkflowNotice("");
    try {
      const result = await localFairPlayApi.replanRemainingRounds(currentSession.id);
      setSession(result.session);
      setSchedule(result.schedule);
      setReplanConfirmationOpen(false);
      setWorkflowNotice(result.session.status === "COMPLETED"
        ? "There is not enough time or active players for another match. The session is complete."
        : "Remaining matches rebuilt. Completed results were kept unchanged; start the next round when ready.");
    } catch (reason) {
      await refreshLiveState();
      setReplanConfirmationOpen(false);
      setActionError(reason instanceof Error ? reason.message : "The remaining matches could not be rebuilt.");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmStart() {
    setActionLoading(true);
    setActionError("");
    try {
      const result = await localFairPlayApi.startSession(currentSession.id);
      setSession(result.session);
      setSchedule(result.schedule);
      setStartConfirmationOpen(false);
      selectTab("schedule", "play");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The session could not be started.");
      setStartConfirmationOpen(false);
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmReshuffle() {
    if (!schedule || isLocked) return;
    setActionLoading(true);
    setActionError("");
    setWorkflowNotice("");
    try {
      const result = await localFairPlayApi.reshuffleSchedule(currentSession, schedule);
      setSession(result.session);
      setSchedule(result.schedule);
      setReshuffleConfirmationOpen(false);
      setWorkflowNotice("A different fair arrangement has replaced the previous schedule.");
      selectTab("schedule", "schedule");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The teams could not be reshuffled.");
      setReshuffleConfirmationOpen(false);
    } finally {
      setActionLoading(false);
    }
  }

  function readinessMessage(): string {
    if (isDemo) return "This example session is read-only. Create a new session to use live controls.";
    if (currentSession.status === "COMPLETED") return "This session is complete. Results and previous lineups remain available below.";
    if (isLive && activeRound) return `Round ${activeRound.number} is in progress. Save its results before changing the remaining matches.`;
    if (isLive && hasUpcomingRound) return "The previous round is saved. Start the next round, or rebuild the remaining matchups first.";
    if (isLive) return "Completed results are safe. Rebuild the remaining matches to continue with the active roster.";
    if (activeStep === "players") return currentSession.players.length < 2 ? "Add at least two players. Availability and skill level are optional." : `${currentSession.players.length} players are ready. Add more or continue to Schedule.`;
    if (activeStep === "play") return schedule ? "Everything is ready. Start when the courts and players are prepared." : "Generate and review the schedule before starting.";
    if (currentSession.players.length < 2) return `Add ${2 - currentSession.players.length} more player${currentSession.players.length === 1 ? "" : "s"} to generate a schedule.`;
    if (timing.numberOfRounds < 1) return "Adjust the session time so at least one complete round fits.";
    if (currentSession.status === "READY") return "Review the schedule and fairness summary before starting.";
    return "Your roster is ready. Generate a fair schedule to continue.";
  }

  return (
    <div className="session-page">
      <header className="session-topbar">
        <div className="session-title-block"><Link to="/" className="back-link"><ArrowLeft />Overview</Link><div className="session-heading"><h1>{session.name}</h1><StatusBadge status={session.status} /></div><p><CalendarDays />{formatSessionDate(session.date)}<span>•</span><Clock3 />{session.startTime}–{session.endTime}<span>•</span>{session.courtCount} courts</p></div>
        <button className="button button--secondary settings-button" disabled={isDemo || isLocked} onClick={() => selectStep("setup")} title={isLocked ? "Settings are locked after the session has started" : undefined}><Settings2 />Settings</button>
      </header>
      <nav className="tab-nav" aria-label="Session views">
        <button className={activeTab === "schedule" ? "active" : ""} onClick={() => selectTab("schedule", schedule && activeStep === "play" ? "play" : "schedule")}><CalendarDays />Schedule{schedule && <span>{schedule.rounds.length}</span>}</button>
        <button className={activeTab === "players" ? "active" : ""} onClick={() => selectTab("players", "players")}><UsersRound />Players<span>{session.players.length}</span></button>
        <button className={activeTab === "fairness" ? "active" : ""} onClick={() => selectTab("fairness", "schedule")}><Scale />Fairness</button>
      </nav>
      <div className="session-body">
        {!isDemo && <SessionProgress session={session} schedule={schedule} activeStep={activeStep} onSelect={selectStep} />}
        {currentSession.recoveryNotice && <div className="recovery-banner" role="status"><AlertCircle /><p><strong>We repaired this older draft</strong><span>{currentSession.recoveryNotice} Please review Setup and Players before generating the schedule.</span></p></div>}
        {workflowNotice && <div className="workflow-notice" role="status"><CheckCircle2 />{workflowNotice}</div>}
        <section className={`session-action-bar ${actionError ? "has-error" : ""}`} aria-label="Session next step">
          <div className="action-message">
            {currentSession.status === "COMPLETED" ? <SquareCheckBig /> : isLive ? activeRound ? <Clock3 /> : <CheckCircle2 /> : activeStep === "players" ? <UsersRound /> : needsSchedule ? <Sparkles /> : <Play />}
            <div><strong>{currentSession.status === "COMPLETED" ? "Session finished" : isLive ? activeRound ? `Round ${activeRound.number} in progress` : "Ready for the next round" : activeStep === "players" ? "Build your roster" : activeStep === "play" ? "Ready for the courts" : needsSchedule ? "Next: build your schedule" : "Schedule ready to review"}</strong><p>{readinessMessage()}</p></div>
          </div>
          <div className="session-live-actions">
            {isLive && !activeRound && hasCompletedRound && hasUpcomingRound && <button className="button button--secondary" disabled={actionLoading} onClick={() => setReplanConfirmationOpen(true)}><RefreshCw />Replan remaining</button>}
            <button className="button button--primary session-primary-action" disabled={primaryDisabled} onClick={() => void handlePrimaryAction()}>{currentSession.status === "COMPLETED" ? <SquareCheckBig /> : isLive ? activeRound ? <SquareCheckBig /> : hasUpcomingRound ? <Play /> : <RefreshCw /> : activeStep === "players" ? <UsersRound /> : needsSchedule ? <Sparkles /> : <Play />}{primaryLabel}</button>
          </div>
          {actionError && <p className="action-error" role="alert"><AlertCircle />{actionError}</p>}
        </section>
        {activeTab === "schedule" && <ScheduleBoard session={session} schedule={schedule} onEditSetup={() => selectStep("setup")} onEditPlayers={() => selectTab("players", "players")} onReshuffle={() => setReshuffleConfirmationOpen(true)} />}
        {activeTab === "players" && <PlayerRoster session={session} hasSchedule={Boolean(schedule)} addRequest={addPlayerRequest} onChange={(updated) => { const invalidated = Boolean(schedule && updated.status === "DRAFT"); setSession(updated); if (invalidated) { setSchedule(undefined); setWorkflowNotice("The previous schedule was cleared because the player roster changed. Generate a new schedule when the roster is ready."); } }} />}
        {activeTab === "fairness" && <FairnessPanel session={session} schedule={schedule} />}
      </div>
      {settingsOpen && <SessionSettingsModal session={session} hasSchedule={Boolean(schedule)} onClose={() => setSettingsOpen(false)} onSaved={(updated) => { const invalidated = Boolean(schedule && updated.status === "DRAFT"); setSession(updated); setSettingsOpen(false); if (invalidated) { setSchedule(undefined); setWorkflowNotice("The previous schedule was cleared because the session setup changed. Review the roster, then generate it again."); selectTab("players", "players"); } else { selectTab(schedule ? "schedule" : "players", schedule ? "schedule" : "players"); } }} />}
      {reshuffleConfirmationOpen && schedule && (
        <Dialog titleId="reshuffle-title" onClose={() => setReshuffleConfirmationOpen(false)} className="confirmation-dialog">
          <DialogHeader eyebrow="Replace schedule" title="Reshuffle all teams?" titleId="reshuffle-title" onClose={() => setReshuffleConfirmationOpen(false)} />
          <p>FairPlay will keep the same setup, players, availability, and fairness rules while searching for a different turn and opponent arrangement. The current schedule will be replaced only if an alternative is found.</p>
          <div className="confirmation-summary"><span>{session.players.length}<small>Players</small></span><span>{schedule.rounds.length}<small>Rounds</small></span><span>{schedule.fairness.score}%<small>Current fairness</small></span></div>
          <div className="form-actions"><button className="button button--ghost" disabled={actionLoading} onClick={() => setReshuffleConfirmationOpen(false)}>Keep current</button><button className="button button--primary" disabled={actionLoading} onClick={() => void confirmReshuffle()}><Shuffle />{actionLoading ? "Finding another…" : "Replace schedule"}</button></div>
        </Dialog>
      )}
      {startConfirmationOpen && (
        <Dialog titleId="start-session-title" onClose={() => setStartConfirmationOpen(false)} className="confirmation-dialog">
            <DialogHeader eyebrow="Ready to play" title="Start this session?" titleId="start-session-title" onClose={() => setStartConfirmationOpen(false)} />
            <p>This activates Round 1 and locks session settings and roster editing. After each round, save the scores, mark anyone leaving, and start the next round when the courts are ready.</p>
            <div className="confirmation-summary"><span>{session.players.length}<small>Players</small></span><span>{schedule?.rounds.length ?? 0}<small>Rounds</small></span><span>{schedule?.fairness.score ?? 0}%<small>Fairness</small></span></div>
            <div className="form-actions"><button className="button button--ghost" onClick={() => setStartConfirmationOpen(false)}>Not yet</button><button className="button button--primary" disabled={actionLoading} onClick={() => void confirmStart()}><Play />{actionLoading ? "Starting…" : "Start now"}</button></div>
        </Dialog>
      )}
      {completeRoundOpen && activeRound && <CompleteRoundDialog round={activeRound} players={activePlayers} saving={actionLoading} onClose={() => setCompleteRoundOpen(false)} onConfirm={(input) => void completeCurrentRound(input)} />}
      {replanConfirmationOpen && (
        <Dialog titleId="replan-title" onClose={() => setReplanConfirmationOpen(false)} className="confirmation-dialog">
          <DialogHeader eyebrow="Remaining roster" title="Rebuild future matches?" titleId="replan-title" onClose={() => setReplanConfirmationOpen(false)} />
          <p>Completed rounds, scores, and winners will stay unchanged. Only future matchups will be replaced using the active players and their playing-time history.</p>
          <div className="confirmation-summary"><span>{activePlayers.length}<small>Active players</small></span><span>{schedule?.rounds.filter((round) => round.status === "COMPLETED").length ?? 0}<small>Saved rounds</small></span><span>{currentSession.players.length - activePlayers.length}<small>Players left</small></span></div>
          <div className="form-actions"><button className="button button--ghost" disabled={actionLoading} onClick={() => setReplanConfirmationOpen(false)}>Keep current</button><button className="button button--primary" disabled={actionLoading} onClick={() => void confirmReplan()}><RefreshCw />{actionLoading ? "Rebuilding…" : "Rebuild matches"}</button></div>
        </Dialog>
      )}
    </div>
  );
}
