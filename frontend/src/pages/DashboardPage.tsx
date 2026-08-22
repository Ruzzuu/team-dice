import { ArrowRight, CalendarDays, Clock3, Plus, Scale, Sparkles, Trophy, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { formatSessionDate } from "../lib/timing";
import { localFairPlayApi } from "../services/fairplayApi";
import type { Session } from "../types";

export function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => { void localFairPlayApi.listSessions().then(setSessions); }, []);
  const featured = sessions[0];

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow="Thursday, 20 August"
        title="Ready for a fair game?"
        description="Build balanced rotations, keep every minute visible, and make rest time feel fair."
        actions={<Link className="button button--primary" to="/sessions/new"><Plus size={18} />New session</Link>}
      />

      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker"><Sparkles size={15} />Built for every player</span>
          <h2>Less waiting.<br /><em>More playing.</em></h2>
          <p>FairPlay turns a crowded court into a rotation everyone can trust.</p>
          <Link className="button button--light" to="/sessions/new">Plan a session <ArrowRight size={18} /></Link>
        </div>
        <div className="court-illustration" aria-hidden="true">
          <div className="court-lines"><span className="court-net" /></div>
          <div className="player-dot dot-one">AM</div>
          <div className="player-dot dot-two">JC</div>
          <div className="player-dot dot-three">SR</div>
          <div className="player-dot dot-four">TK</div>
          <div className="fair-card"><Scale size={18} /><div><strong>96%</strong><span>fairness score</span></div></div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Workspace summary">
        <article className="metric-card"><span className="metric-icon metric-icon--green"><CalendarDays /></span><div><p>Upcoming sessions</p><strong>{sessions.length}</strong><small>Next game tomorrow</small></div></article>
        <article className="metric-card"><span className="metric-icon metric-icon--orange"><Clock3 /></span><div><p>Playing time</p><strong>96 <sup>min</sup></strong><small>Average per player</small></div></article>
        <article className="metric-card"><span className="metric-icon metric-icon--blue"><UsersRound /></span><div><p>Active players</p><strong>{featured?.players.length ?? 0}</strong><small>Across your roster</small></div></article>
        <article className="metric-card"><span className="metric-icon metric-icon--purple"><Trophy /></span><div><p>Fairness score</p><strong>96%</strong><small className="positive">Excellent balance</small></div></article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Coming up</p><h2>Your next session</h2></div><Link to="/sessions/demo-friday-badminton">View all <ArrowRight size={16} /></Link></div>
        {featured ? (
          <Link className="session-card" to={`/sessions/${featured.id}`}>
            <div className="date-tile"><span>{new Date(`${featured.date}T00:00:00Z`).toLocaleString("en", { month: "short", timeZone: "UTC" })}</span><strong>{new Date(`${featured.date}T00:00:00Z`).getUTCDate()}</strong></div>
            <div className="session-main"><div className="session-title-row"><h3>{featured.name}</h3><StatusBadge status={featured.status} /></div><p><CalendarDays size={16} />{formatSessionDate(featured.date)} <span>•</span> <Clock3 size={16} />{featured.startTime}–{featured.endTime}</p><div className="session-meta"><span>{featured.courtCount} courts</span><span>{featured.players.length} players</span><span>{featured.roundDurationMinutes} min rounds</span></div></div>
            <div className="session-fairness"><span>Projected fairness</span><strong>96%</strong><div><i style={{ width: "96%" }} /></div></div>
            <ArrowRight className="session-arrow" />
          </Link>
        ) : <div className="empty-card">No sessions yet. Create your first fair rotation.</div>}
      </section>
    </div>
  );
}
