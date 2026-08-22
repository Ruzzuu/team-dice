import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, Sparkles, UsersRound } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { calculateTimingPreview } from "../lib/timing";
import { localFairPlayApi } from "../services/fairplayApi";
import type { SessionInput } from "../types";

const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
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
      <PageHeader title="Create a new session" description="Set the basics now. You’ll add your players on the next screen." />
      <div className="create-layout">
        <form className="form-card" onSubmit={submit}>
          <div className="form-section-heading"><span>1</span><div><h2>Session details</h2><p>When and where are you playing?</p></div></div>
          <div className="field field--full"><label htmlFor="name">Session name</label><div className="input-with-icon"><Sparkles /><input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Friday Night Badminton" maxLength={120} autoFocus /></div></div>
          <div className="field-grid">
            <div className="field"><label htmlFor="date">Date</label><div className="input-with-icon"><CalendarDays /><input id="date" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} /></div></div>
            <div className="field"><label htmlFor="location">Location <span>Optional</span></label><div className="input-with-icon"><MapPin /><input id="location" placeholder="Community sports hall" /></div></div>
          </div>
          <div className="field-grid field-grid--three">
            <div className="field"><label htmlFor="start">Start time</label><input id="start" type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} /></div>
            <div className="field"><label htmlFor="end">End time</label><input id="end" type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} /></div>
            <div className="field"><label htmlFor="duration">Round length</label><select id="duration" value={form.roundDurationMinutes} onChange={(e) => update("roundDurationMinutes", Number(e.target.value))}><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option></select></div>
          </div>

          <div className="form-divider" />
          <div className="form-section-heading"><span>2</span><div><h2>Court setup</h2><p>Define how many people can play each round.</p></div></div>
          <div className="field-grid">
            <div className="field"><label htmlFor="courts">Number of courts</label><div className="stepper"><button type="button" onClick={() => update("courtCount", Math.max(1, form.courtCount - 1))}>−</button><strong>{form.courtCount}</strong><button type="button" onClick={() => update("courtCount", form.courtCount + 1)}>+</button></div></div>
            <div className="field"><label htmlFor="players-per-court">Players per court</label><div className="stepper"><button type="button" onClick={() => update("playersPerCourt", Math.max(1, form.playersPerCourt - 1))}>−</button><strong>{form.playersPerCourt}</strong><button type="button" onClick={() => update("playersPerCourt", form.playersPerCourt + 1)}>+</button></div></div>
          </div>
          <div className="field-grid">
            <div className="field"><label htmlFor="warmup">Warm-up buffer</label><select id="warmup" value={form.warmupMinutes} onChange={(e) => update("warmupMinutes", Number(e.target.value))}><option value={0}>No buffer</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option></select></div>
            <div className="field"><label htmlFor="cleanup">Clean-up buffer</label><select id="cleanup" value={form.cleanupMinutes} onChange={(e) => update("cleanupMinutes", Number(e.target.value))}><option value={0}>No buffer</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option></select></div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions"><Link className="button button--ghost" to="/">Cancel</Link><button className="button button--primary" disabled={saving}>{saving ? "Saving…" : "Save & add players"}<ArrowRight size={18} /></button></div>
        </form>

        <aside className="preview-card">
          <p className="eyebrow">Live session preview</p>
          <h2>{form.name || "Your new session"}</h2>
          <div className="preview-time"><Clock3 /><div><strong>{form.startTime}–{form.endTime}</strong><span>{timing.totalMinutes || "—"} minutes booked</span></div></div>
          <div className="preview-stats"><div><strong>{timing.numberOfRounds}</strong><span>Rounds</span></div><div><strong>{timing.capacity}</strong><span>Play at once</span></div><div><strong>{form.roundDurationMinutes}</strong><span>Min each</span></div></div>
          <div className="capacity-visual"><div className="capacity-court"><span /><span /><span /><span /></div><p><UsersRound size={16} />Capacity: <strong>{timing.capacity} players per round</strong></p></div>
          <ul className="check-list"><li><Check />Usable play time: {timing.usableMinutes} minutes</li><li><Check />{form.courtCount} court{form.courtCount === 1 ? "" : "s"} configured</li><li><Check />Unused time: {timing.unusedMinutes} minutes</li></ul>
          <div className="prototype-note"><Sparkles /><p><strong>Prototype mode</strong><span>Your draft will be saved in this browser. Schedule generation arrives with the backend scheduler.</span></p></div>
        </aside>
      </div>
    </div>
  );
}
