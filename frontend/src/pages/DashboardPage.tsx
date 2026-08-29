import { AlertCircle, ArrowRight, CalendarDays, Clock3, Plus, Scale, Sparkles, Trophy, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { demoSession } from "../data/demo";
import { formatSessionDate } from "../lib/timing";
import { clearStorageRecoveryNotice, getStorageRecoveryNotice } from "../lib/sessionData";
import { buildDashboardMetrics, pickFeaturedSession, sortUserSessions, type DashboardMetrics } from "../lib/sessionMetrics";
import { localFairPlayApi } from "../services/fairplayApi";
import type { Session } from "../types";

const emptyMetrics: DashboardMetrics = { sessionCount: 0, playerCount: 0, scheduledRounds: 0 };

function SessionCard({ session, featured = false }: { session: Session; featured?: boolean }) {
  const date = new Date(`${session.date}T00:00:00Z`);
  return (
    <Link className={`session-card ${featured ? "session-card--featured" : ""}`} to={`/sessions/${session.id}`}>
      <div className="date-tile">
        <span>{date.toLocaleString("en", { month: "short", timeZone: "UTC" })}</span>
        <strong>{date.getUTCDate()}</strong>
      </div>
      <div className="session-main">
        <div className="session-title-row"><h3>{session.name}</h3><StatusBadge status={session.status} /></div>
        <p><CalendarDays />{formatSessionDate(session.date)}<span>•</span><Clock3 />{session.startTime}–{session.endTime}</p>
        <div className="session-meta"><span>{session.courtCount} courts</span><span>{session.players.length} players</span><span>{session.roundDurationMinutes} min rounds</span></div>
      </div>
      <ArrowRight className="session-arrow" aria-hidden="true" />
    </Link>
  );
}

export function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>();
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [storageNotice, setStorageNotice] = useState<string>();

  useEffect(() => {
    let active = true;
    void localFairPlayApi.listSessions().then(async (nextSessions) => {
      const schedules = await Promise.all(nextSessions.map((session) => localFairPlayApi.getSchedule(session.id)));
      if (!active) return;
      setSessions(nextSessions);
      setMetrics(buildDashboardMetrics(nextSessions, schedules));
      setStorageNotice(getStorageRecoveryNotice());
    });
    return () => { active = false; };
  }, []);

  const userSessions = sessions ? sortUserSessions(sessions) : [];
  const featured = sessions ? pickFeaturedSession(sessions) : undefined;
  const recentSessions = [...userSessions].reverse().filter((session) => session.id !== featured?.id).slice(0, 3);
  const today = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow={today}
        title="Ready for a fair game?"
        description="Set up your courts, add the group, and let FairPlay build a rotation everyone can trust."
        actions={<Link className="button button--primary" to="/sessions/new"><Plus size={18} />New session</Link>}
      />

      {storageNotice && <div className="recovery-banner" role="status"><AlertCircle /><p><strong>Local data recovery completed</strong><span>{storageNotice} Your original data remains available in a browser backup key.</span></p><button type="button" className="icon-button" aria-label="Dismiss data recovery notice" onClick={() => { clearStorageRecoveryNotice(); setStorageNotice(undefined); }}><X /></button></div>}

      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker"><Sparkles />Fair rotations, made simple</span>
          <h2>Less waiting.<br /><em>More playing.</em></h2>
          <p>Turn a crowded court into a clear, balanced schedule in a few minutes.</p>
          <Link className="button button--light" to="/sessions/new">Plan your next game <ArrowRight /></Link>
        </div>
        <div className="court-illustration" aria-hidden="true">
          <div className="court-lines"><span className="court-net" /></div>
          <div className="player-dot dot-one">AM</div>
          <div className="player-dot dot-two">JC</div>
          <div className="player-dot dot-three">SR</div>
          <div className="player-dot dot-four">TK</div>
          <div className="fair-card"><Scale size={18} /><div><strong>Fair by design</strong><span>balanced court time</span></div></div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Workspace summary">
        <article className="metric-card"><span className="metric-icon metric-icon--green"><CalendarDays /></span><div><p>Your sessions</p><strong>{metrics.sessionCount}</strong><small>Saved on this device</small></div></article>
        <article className="metric-card"><span className="metric-icon metric-icon--orange"><Clock3 /></span><div><p>Scheduled rounds</p><strong>{metrics.scheduledRounds}</strong><small>Across generated schedules</small></div></article>
        <article className="metric-card"><span className="metric-icon metric-icon--blue"><UsersRound /></span><div><p>Players organized</p><strong>{metrics.playerCount}</strong><small>Unique names in your sessions</small></div></article>
        <article className="metric-card"><span className="metric-icon metric-icon--purple"><Trophy /></span><div><p>Average fairness</p><strong>{metrics.averageFairness === undefined ? "—" : `${metrics.averageFairness}%`}</strong><small>{metrics.averageFairness === undefined ? "Generate a schedule to measure" : "From generated schedules"}</small></div></article>
      </section>

      <section className="section-block" id="sessions">
        <div className="section-heading"><div><p className="eyebrow">Your workspace</p><h2>{featured ? "Next session" : "Create your first session"}</h2></div></div>
        {sessions === undefined ? (
          <div className="session-card session-card--loading" aria-label="Loading sessions" />
        ) : featured ? (
          <SessionCard session={featured} featured />
        ) : (
          <div className="empty-card">
            <span><CalendarDays /></span>
            <div><h3>No sessions yet</h3><p>Create a session, add players, and generate your first fair rotation.</p></div>
            <Link className="button button--primary" to="/sessions/new">Create session</Link>
          </div>
        )}
        {recentSessions.length > 0 && <div className="session-list">{recentSessions.map((session) => <SessionCard key={session.id} session={session} />)}</div>}
      </section>

      <section className="sample-card" aria-labelledby="sample-title">
        <div className="sample-icon"><Scale /></div>
        <div><p className="eyebrow">Explore safely</p><h2 id="sample-title">See a complete sample schedule</h2><p>Open a read-only example to understand courts, resting players, and fairness before creating your own.</p></div>
        <Link className="button button--secondary" to={`/sessions/${demoSession.id}`}>View sample <ArrowRight /></Link>
      </section>
    </div>
  );
}
