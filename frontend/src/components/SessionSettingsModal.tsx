import { AlertTriangle } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Dialog, DialogHeader } from "./Dialog";
import { calculateTimingPreview } from "../lib/timing";
import { localFairPlayApi } from "../services/fairplayApi";
import type { Session, SessionInput } from "../types";

export function SessionSettingsModal({
  session,
  hasSchedule,
  onClose,
  onSaved,
}: {
  session: Session;
  hasSchedule: boolean;
  onClose: () => void;
  onSaved: (session: Session) => void;
}) {
  const [form, setForm] = useState<SessionInput>({
    name: session.name,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    warmupMinutes: session.warmupMinutes,
    cleanupMinutes: session.cleanupMinutes,
    roundDurationMinutes: session.roundDurationMinutes,
    courtCount: session.courtCount,
    playersPerCourt: session.playersPerCourt,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const timing = useMemo(() => calculateTimingPreview(form), [form]);
  const update = (field: keyof SessionInput, value: string | number) => setForm((current) => ({ ...current, [field]: value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return setError("Session name is required.");
    if (!timing.isValid || timing.numberOfRounds < 1) return setError("Session timing must contain at least one complete round.");
    setSaving(true);
    setError("");
    try {
      const updated = await localFairPlayApi.updateSession(session.id, { ...form, name: form.name.trim() });
      onSaved(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The settings could not be saved.");
      setSaving(false);
    }
  }

  return (
    <Dialog titleId="session-settings-title" onClose={onClose} className="settings-dialog">
      <form onSubmit={save} aria-label="Session settings">
        <DialogHeader eyebrow="Session setup" title="Settings" titleId="session-settings-title" onClose={onClose} />
        {hasSchedule && <div className="settings-warning"><AlertTriangle /><p><strong>Schedule will be cleared</strong><span>Changing these settings returns the session to Draft so a new fair schedule can be generated.</span></p></div>}
        <div className="field"><label htmlFor="settings-name">Session name</label><input id="settings-name" value={form.name} onChange={(event) => update("name", event.target.value)} /></div>
        <div className="field"><label htmlFor="settings-date">Date</label><input id="settings-date" type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></div>
        <div className="field-grid field-grid--three">
          <div className="field"><label htmlFor="settings-start">Start</label><input id="settings-start" type="time" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} /></div>
          <div className="field"><label htmlFor="settings-end">End</label><input id="settings-end" type="time" value={form.endTime} onChange={(event) => update("endTime", event.target.value)} /></div>
          <div className="field"><label htmlFor="settings-round">Round</label><select id="settings-round" value={form.roundDurationMinutes} onChange={(event) => update("roundDurationMinutes", Number(event.target.value))}><option value={10}>10 min</option><option value={15}>15 min</option><option value={20}>20 min</option><option value={30}>30 min</option></select></div>
        </div>
        <div className="field-grid">
          <div className="field"><label htmlFor="settings-courts">Courts</label><input id="settings-courts" type="number" min="1" value={form.courtCount} onChange={(event) => update("courtCount", Number(event.target.value))} /></div>
          <div className="field"><label htmlFor="settings-capacity">Players per court</label><input id="settings-capacity" type="number" min="2" value={form.playersPerCourt} onChange={(event) => update("playersPerCourt", Number(event.target.value))} /></div>
        </div>
        <div className="field-grid">
          <div className="field"><label htmlFor="settings-warmup">Warm-up</label><input id="settings-warmup" type="number" min="0" value={form.warmupMinutes} onChange={(event) => update("warmupMinutes", Number(event.target.value))} /></div>
          <div className="field"><label htmlFor="settings-cleanup">Clean-up</label><input id="settings-cleanup" type="number" min="0" value={form.cleanupMinutes} onChange={(event) => update("cleanupMinutes", Number(event.target.value))} /></div>
        </div>
        <div className="settings-preview"><span>{timing.numberOfRounds} rounds</span><span>{timing.capacity} players at once</span><span>{timing.unusedMinutes} unused min</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button></div>
      </form>
    </Dialog>
  );
}
