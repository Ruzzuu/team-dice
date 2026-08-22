import { Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { formatPlayerName, getPlayerInitials } from "../lib/playerNames";
import { localFairPlayApi } from "../services/fairplayApi";
import type { Player, Session } from "../types";

const emptyPlayer = { name: "", skillRating: 3, availableFrom: "", availableUntil: "", notes: "" };

export function PlayerRoster({ session, onChange }: { session: Session; onChange: (session: Session) => void }) {
  const [editing, setEditing] = useState<(typeof emptyPlayer & { id?: string }) | null>(null);
  const [error, setError] = useState("");
  const isDemo = session.id === "demo-friday-badminton";
  const isEditable = !isDemo && session.status !== "ACTIVE";

  function startEdit(player?: Player) {
    setEditing(player ? { ...emptyPlayer, ...player } : { ...emptyPlayer });
    setError("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing?.name.trim()) return setError("Player name is required.");
    const duplicate = session.players.some((player) => player.name.toLowerCase() === editing.name.trim().toLowerCase() && player.id !== editing.id);
    if (duplicate) return setError("A player with this name is already in the roster.");
    const updated = await localFairPlayApi.savePlayer(session.id, {
      ...editing,
      name: editing.name.trim(),
      availableFrom: editing.availableFrom || undefined,
      availableUntil: editing.availableUntil || undefined,
      notes: editing.notes || undefined,
    });
    onChange(updated);
    setEditing(null);
  }

  async function remove(player: Player) {
    if (!window.confirm(`Remove ${player.name} from this session?`)) return;
    onChange(await localFairPlayApi.removePlayer(session.id, player.id));
  }

  return (
    <section className="workspace-panel roster-panel">
      <div className="panel-heading"><div><h2>Player roster</h2><p>{session.players.length} players · {Math.max(0, session.players.length - session.courtCount * session.playersPerCourt)} resting each round</p></div>{isEditable && <button className="button button--primary button--small" onClick={() => startEdit()}><Plus size={17} />Add player</button>}</div>
      {isDemo && <div className="demo-banner">Demo roster is read-only. Create a new session to manage your own players.</div>}
      {session.status === "ACTIVE" && <div className="demo-banner">Roster editing is locked while this session is active.</div>}
      {session.players.length ? (
        <div className="player-list">
          {session.players.map((player, index) => (
            <article className="player-row" key={player.id}>
              <div className={`avatar avatar--tone-${index % 5}`} title={player.name} aria-label={`${player.name} initials`}>{getPlayerInitials(player.name)}</div>
              <div className="player-name"><strong title={player.name}>{formatPlayerName(player.name)}</strong><span>{player.notes || "Available all session"}</span></div>
              <div className="skill-dots" aria-label={`Skill level ${player.skillRating ?? 3} of 5`}>{[1, 2, 3, 4, 5].map((level) => <i key={level} className={level <= (player.skillRating ?? 3) ? "filled" : ""} />)}</div>
              <span className="availability"><i />Available</span>
              {isEditable && <div className="row-actions"><button aria-label={`Edit ${player.name}`} onClick={() => startEdit(player)}><Pencil /></button><button aria-label={`Remove ${player.name}`} onClick={() => void remove(player)}><Trash2 /></button></div>}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><span><UserPlus /></span><h3>Build your player roster</h3><p>Add everyone joining this session. Availability and skill are optional.</p>{isEditable && <button className="button button--primary" onClick={() => startEdit()}><Plus size={18} />Add first player</button>}</div>
      )}

      {editing && (
        <div className="modal-backdrop" role="presentation">
          <form className="player-modal" onSubmit={save} aria-label={editing.id ? "Edit player" : "Add player"}>
            <div className="modal-heading"><div><p className="eyebrow">Roster</p><h2>{editing.id ? "Edit player" : "Add a player"}</h2></div><button type="button" aria-label="Close" onClick={() => setEditing(null)}><X /></button></div>
            <div className="field"><label htmlFor="player-name">Player name</label><input id="player-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Full name" autoFocus /></div>
            <div className="field"><label htmlFor="skill">Skill level <span>Optional</span></label><input id="skill" type="range" min="1" max="5" value={editing.skillRating} onChange={(e) => setEditing({ ...editing, skillRating: Number(e.target.value) })} /><div className="range-labels"><span>Beginner</span><strong>{editing.skillRating}/5</strong><span>Advanced</span></div></div>
            <div className="field-grid"><div className="field"><label htmlFor="available-from">Available from</label><input id="available-from" type="time" value={editing.availableFrom} onChange={(e) => setEditing({ ...editing, availableFrom: e.target.value })} /></div><div className="field"><label htmlFor="available-until">Available until</label><input id="available-until" type="time" value={editing.availableUntil} onChange={(e) => setEditing({ ...editing, availableUntil: e.target.value })} /></div></div>
            <div className="field"><label htmlFor="notes">Notes <span>Optional</span></label><textarea id="notes" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Anything the organizer should know" rows={3} /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions"><button type="button" className="button button--ghost" onClick={() => setEditing(null)}>Cancel</button><button className="button button--primary">{editing.id ? "Save changes" : "Add player"}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
