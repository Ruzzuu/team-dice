import { AlertCircle, ArrowLeft, CalendarDays, Clock3, Play, Settings2, Sparkles, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FairnessPanel } from "../components/FairnessPanel";
import { PlayerRoster } from "../components/PlayerRoster";
import { ScheduleBoard } from "../components/ScheduleBoard";
import { SessionSettingsModal } from "../components/SessionSettingsModal";
import { StatusBadge } from "../components/StatusBadge";
import { calculateTimingPreview, formatSessionDate } from "../lib/timing";
import { localFairPlayApi } from "../services/fairplayApi";
import type { Schedule, Session } from "../types";

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
  const primaryLabel = currentSession.status === "ACTIVE"
    ? "Session active"
    : needsSchedule
      ? actionLoading ? "Generating…" : "Generate schedule"
      : "Start session";
  const primaryDisabled = isDemo || currentSession.status === "ACTIVE" || actionLoading || (needsSchedule && !canGenerate);

  async function handlePrimaryAction() {
    if (primaryDisabled) return;
    if (needsSchedule) {
      setActionLoading(true);
      setActionError("");
      try {
        const result = await localFairPlayApi.generateSchedule(currentSession);
        setSession(result.session);
        setSchedule(result.schedule);
        setParams({ tab: "schedule" });
      } catch (reason) {
        setActionError(reason instanceof Error ? reason.message : "The schedule could not be generated.");
      } finally {
        setActionLoading(false);
      }
      return;
    }
    setStartConfirmationOpen(true);
  }

  async function confirmStart() {
    setActionLoading(true);
    setActionError("");
    try {
      const result = await localFairPlayApi.startSession(currentSession.id);
      setSession(result.session);
      setSchedule(result.schedule);
      setStartConfirmationOpen(false);
      setParams({ tab: "schedule" });
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The session could not be started.");
      setStartConfirmationOpen(false);
    } finally {
      setActionLoading(false);
    }
  }

  function readinessMessage(): string {
    if (isDemo) return "This example session is read-only. Create a new session to use live controls.";
    if (currentSession.status === "ACTIVE") return "The session is active. Settings and roster editing are locked.";
    if (currentSession.players.length < 2) return `Add ${2 - currentSession.players.length} more player${currentSession.players.length === 1 ? "" : "s"} to generate a schedule.`;
    if (timing.numberOfRounds < 1) return "Adjust the session time so at least one complete round fits.";
    if (currentSession.status === "READY") return "Review the schedule and fairness summary before starting.";
    return "Your roster is ready. Generate a fair schedule to continue.";
  }

  return (
    <div className="session-page">
      <header className="session-topbar">
        <div><Link to="/" className="back-link"><ArrowLeft />Overview</Link><div className="session-heading"><h1>{session.name}</h1><StatusBadge status={session.status} /></div><p><CalendarDays />{formatSessionDate(session.date)}<span>•</span><Clock3 />{session.startTime}–{session.endTime}<span>•</span>{session.courtCount} courts</p></div>
        <div className="session-actions"><div className="page-actions"><button className="button button--ghost" disabled={isDemo || session.status === "ACTIVE"} onClick={() => setSettingsOpen(true)} title={session.status === "ACTIVE" ? "Settings are locked while the session is active" : undefined}><Settings2 />Settings</button><button className="button button--primary" disabled={primaryDisabled} onClick={() => void handlePrimaryAction()}>{needsSchedule ? <Sparkles /> : <Play />}{primaryLabel}</button></div><p className="action-guidance">{readinessMessage()}</p>{actionError && <p className="action-error" role="alert"><AlertCircle />{actionError}</p>}</div>
      </header>
      <nav className="tab-nav" aria-label="Session views">
        <button className={activeTab === "schedule" ? "active" : ""} onClick={() => setParams({ tab: "schedule" })}><CalendarDays />Schedule{schedule && <span>{schedule.rounds.length}</span>}</button>
        <button className={activeTab === "players" ? "active" : ""} onClick={() => setParams({ tab: "players" })}><UsersRound />Players<span>{session.players.length}</span></button>
        <button className={activeTab === "fairness" ? "active" : ""} onClick={() => setParams({ tab: "fairness" })}>Fairness</button>
      </nav>
      <div className="session-body">
        {activeTab === "schedule" && <ScheduleBoard session={session} schedule={schedule} />}
        {activeTab === "players" && <PlayerRoster session={session} onChange={(updated) => { setSession(updated); if (updated.status === "DRAFT") setSchedule(undefined); }} />}
        {activeTab === "fairness" && <FairnessPanel session={session} schedule={schedule} />}
      </div>
      {settingsOpen && <SessionSettingsModal session={session} hasSchedule={Boolean(schedule)} onClose={() => setSettingsOpen(false)} onSaved={(updated) => { setSession(updated); setSchedule(undefined); setSettingsOpen(false); setParams({ tab: "players" }); }} />}
      {startConfirmationOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="start-session-title">
            <div className="modal-heading"><div><p className="eyebrow">Ready to play</p><h2 id="start-session-title">Start this session?</h2></div><button type="button" aria-label="Close confirmation" onClick={() => setStartConfirmationOpen(false)}><X /></button></div>
            <p>This activates Round 1 and locks session settings and roster editing. Live round completion controls will be added in a later phase.</p>
            <div className="confirmation-summary"><span>{session.players.length}<small>Players</small></span><span>{schedule?.rounds.length ?? 0}<small>Rounds</small></span><span>{schedule?.fairness.score ?? 0}%<small>Fairness</small></span></div>
            <div className="form-actions"><button className="button button--ghost" onClick={() => setStartConfirmationOpen(false)}>Not yet</button><button className="button button--primary" disabled={actionLoading} onClick={() => void confirmStart()}><Play />{actionLoading ? "Starting…" : "Start now"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
