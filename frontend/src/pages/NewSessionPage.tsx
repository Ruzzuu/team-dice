import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { calculateTimingPreview } from "../lib/timing";
import { localFairPlayApi } from "../services/fairplayApi";
import type { SessionInput } from "../types";

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const tomorrowDate = new Date();
tomorrowDate.setDate(tomorrowDate.getDate() + 1);
const tomorrow = localDateValue(tomorrowDate);
const initialSession: SessionInput = {
  name: "",
  date: tomorrow,
  startTime: "19:00",
  endTime: "21:00",
  warmupMinutes: 0,
  cleanupMinutes: 0,
  roundDurationMinutes: 15,
  courtCount: 2,
  playersPerCourt: 4,
};

export function NewSessionPage() {
  const [form, setForm] = useState(initialSession);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const timing = useMemo(() => calculateTimingPreview(form), [form]);

  const update = (field: keyof SessionInput, value: string | number) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return setError("Give your session a name.");
    if (!timing.isValid) return setError("End time must be later than start time, with buffers inside the session.");
    setSaving(true);
    setError("");
    try {
      const session = await localFairPlayApi.createSession({ ...form, name: form.name.trim() });
      navigate(`/sessions/${session.id}?tab=players`);
    } catch {
      setError("We couldn't save this session. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="page new-session-page">
      <Link to="/" className="back-link"><ArrowLeft size={17} />Back to overview</Link>
      <PageHeader eyebrow="Step 1 of 4" title="Create a new session" description="Start with the time and court setup. You’ll add players next." />
      <ol className="create-progress" aria-label="New session progress">
        <li className="active"><span>1</span><strong>Session</strong></li>
        <li><span>2</span><strong>Players</strong></li>
        <li><span>3</span><strong>Schedule</strong></li>
        <li><span>4</span><strong>Play</strong></li>
      </ol>
      <div className="create-layout">
        <form className="form-card" onSubmit={submit}>
          <div className="form-section-heading"><span>1</span><div><h2>Session details</h2><p>Give the game a name and choose when it happens.</p></div></div>
          <div className="field field--full"><label htmlFor="name">Session name</label><div className="input-with-icon"><Sparkles /><input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Friday Night Badminton" maxLength={120} autoFocus aria-invalid={Boolean(error && !form.name.trim())} /></div><small className="field-help">Use a name your group will recognize.</small></div>
          <div className="field field--full"><label htmlFor="date">Date</label><div className="input-with-icon"><CalendarDays /><input id="date" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} /></div></div>
          <div className="field-grid field-grid--three">
            <div className="field"><label htmlFor="start">Start time</label><input id="start" type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} /></div>
            <div className="field"><label htmlFor="end">End time</label><input id="end" type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} /></div>
            <div className="field"><label htmlFor="duration">Round length</label><select id="duration" value={form.roundDurationMinutes} onChange={(e) => update("roundDurationMinutes", Number(e.target.value))}><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option></select></div>
          </div>

          <div className="form-divider" />
          <div className="form-section-heading"><span>2</span><div><h2>Court setup</h2><p>Define how many people can play each round.</p></div></div>
          <div className="field-grid">
            <div className="field"><label>Number of courts</label><div className="stepper" role="group" aria-label="Number of courts"><button type="button" aria-label="Decrease courts" onClick={() => update("courtCount", Math.max(1, form.courtCount - 1))}>−</button><strong aria-live="polite">{form.courtCount}</strong><button type="button" aria-label="Increase courts" onClick={() => update("courtCount", Math.min(12, form.courtCount + 1))}>+</button></div></div>
            <div className="field"><label>Players per court</label><div className="stepper" role="group" aria-label="Players per court"><button type="button" aria-label="Decrease players per court" onClick={() => update("playersPerCourt", Math.max(2, form.playersPerCourt - 1))}>−</button><strong aria-live="polite">{form.playersPerCourt}</strong><button type="button" aria-label="Increase players per court" onClick={() => update("playersPerCourt", Math.min(12, form.playersPerCourt + 1))}>+</button></div></div>
          </div>
          <div className="field-grid">
            <div className="field"><label htmlFor="warmup">Warm-up buffer</label><select id="warmup" value={form.warmupMinutes} onChange={(e) => update("warmupMinutes", Number(e.target.value))}><option value={0}>No buffer</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option></select></div>
            <div className="field"><label htmlFor="cleanup">Clean-up buffer</label><select id="cleanup" value={form.cleanupMinutes} onChange={(e) => update("cleanupMinutes", Number(e.target.value))}><option value={0}>No buffer</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option></select></div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions form-actions--sticky"><Link className="button button--ghost" to="/">Cancel</Link><button className="button button--primary" disabled={saving}>{saving ? "Saving…" : "Continue to players"}<ArrowRight size={18} /></button></div>
        </form>

        <aside className="preview-card">
          <p className="eyebrow">Live session preview</p>
          <h2>{form.name || "Your new session"}</h2>
          <div className="preview-time"><Clock3 /><div><strong>{form.startTime}–{form.endTime}</strong><span>{timing.totalMinutes || "—"} minutes booked</span></div></div>
          <div className="preview-stats"><div><strong>{timing.numberOfRounds}</strong><span>Rounds</span></div><div><strong>{timing.capacity}</strong><span>Play at once</span></div><div><strong>{form.roundDurationMinutes}</strong><span>Min each</span></div></div>
          <div className="capacity-visual"><div className="capacity-court"><span /><span /><span /><span /></div><p><UsersRound size={16} />Capacity: <strong>{timing.capacity} players per round</strong></p></div>
          <ul className="check-list"><li><Check />Usable play time: {timing.usableMinutes} minutes</li><li><Check />{form.courtCount} court{form.courtCount === 1 ? "" : "s"} configured</li><li><Check />Unused time: {timing.unusedMinutes} minutes</li></ul>
          <div className="privacy-note"><ShieldCheck /><p><strong>Saved on this device</strong><span>Your session stays in this browser. The backend is only used to calculate the schedule.</span></p></div>
        </aside>
      </div>
    </div>
  );
}
