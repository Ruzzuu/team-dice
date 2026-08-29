import { calculateTimingPreview } from "./timing";
import type { Schedule, Session } from "../types";

type UnknownRecord = Record<string, unknown>;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fieldLabel(location: unknown): string {
  if (!Array.isArray(location)) return "Request";
  const parts = location.filter((part) => part !== "body");
  return parts.map((part, index) => {
    if (typeof part === "number") return index > 0 && parts[index - 1] === "players" ? `Player ${part + 1}` : String(part + 1);
    return String(part).replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
  }).join(" · ") || "Request";
}

export function backendErrorMessage(body: unknown, status?: number): string {
  if (isRecord(body) && typeof body.detail === "string") return body.detail;
  if (isRecord(body) && Array.isArray(body.detail)) {
    const messages = body.detail.flatMap((entry) => {
      if (!isRecord(entry) || typeof entry.msg !== "string") return [];
      return [`${fieldLabel(entry.loc)}: ${entry.msg.replace(/^Value error,\s*/i, "")}`];
    });
    if (messages.length) return messages.join(" ");
  }
  if (status === 404) return "The schedule endpoint was not found. Restart both the frontend and backend, then try again.";
  return "The scheduler could not generate this session. Check that the API is running and try again.";
}

export function validateSessionForSchedule(session: Session): string | undefined {
  if (!session.id.trim() || session.id.length > 120) return "This draft has an invalid session identifier. Open Settings and save it again.";
  if (!session.name.trim() || session.name.length > 120) return "Session name must contain 1–120 characters.";
  if (!datePattern.test(session.date) || Number.isNaN(Date.parse(`${session.date}T00:00:00Z`))) return "Session date is invalid. Open Settings and choose the date again.";
  if (!timePattern.test(session.startTime) || !timePattern.test(session.endTime)) return "Session start and end times must use valid whole-minute times.";
  const timing = calculateTimingPreview(session);
  if (!timing.isValid || timing.numberOfRounds < 1) return "Session timing must contain at least one complete round.";
  if (!Number.isInteger(session.courtCount) || session.courtCount < 1) return "Number of courts must be at least 1.";
  if (!Number.isInteger(session.playersPerCourt) || session.playersPerCourt < 1) return "Players per court must be at least 1.";
  if (session.players.length < 2) return `Add ${2 - session.players.length} more player${session.players.length === 1 ? "" : "s"} before generating a schedule.`;

  const ids = new Set<string>();
  for (const [index, player] of session.players.entries()) {
    const label = `Player ${index + 1}`;
    if (!player.id.trim() || player.id.length > 120) return `${label} has an invalid identifier. Edit and save that player again.`;
    if (ids.has(player.id)) return `${label} has a duplicate identifier. Edit and save that player again.`;
    ids.add(player.id);
    if (!player.name.trim() || player.name.length > 120) return `${label} name must contain 1–120 characters.`;
    if (player.skillRating !== undefined && (!Number.isInteger(player.skillRating) || player.skillRating < 1 || player.skillRating > 5)) return `${player.name}'s skill level must be between 1 and 5.`;
    if ((player.availableFrom && !timePattern.test(player.availableFrom)) || (player.availableUntil && !timePattern.test(player.availableUntil))) return `${player.name} has an invalid availability time.`;
    if (player.availableFrom && player.availableUntil && player.availableUntil <= player.availableFrom) return `${player.name}'s available-until time must be later than the available-from time.`;
  }
  return undefined;
}

function requiredRecord(value: unknown, label: string): UnknownRecord {
  if (!isRecord(value)) throw new Error(`The scheduler returned an invalid ${label}. Please try again.`);
  return value;
}

function requiredArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`The scheduler returned an invalid ${label}. Please try again.`);
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`The scheduler returned an invalid ${label}. Please try again.`);
  return value;
}

function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`The scheduler returned an invalid ${label}. Please try again.`);
  return value;
}

export function mapScheduleResponse(body: unknown, generationSeed = 0): Schedule {
  const root = requiredRecord(body, "response");
  const fairness = requiredRecord(root.fairness, "fairness summary");
  const rounds = requiredArray(root.rounds, "round list").map((value) => {
    const round = requiredRecord(value, "round");
    return {
      id: requiredString(round.id, "round identifier"),
      number: requiredNumber(round.number, "round number"),
      startTime: requiredString(round.start_time, "round start time").slice(0, 5),
      endTime: requiredString(round.end_time, "round end time").slice(0, 5),
      courts: requiredArray(round.courts, "court list").map((value) => {
        const court = requiredRecord(value, "court");
        return {
          courtNumber: requiredNumber(court.court_number, "court number"),
          teamA: requiredArray(court.team_a, "team A").map((id) => requiredString(id, "player identifier")),
          teamB: requiredArray(court.team_b, "team B").map((id) => requiredString(id, "player identifier")),
        };
      }),
      restingPlayerIds: requiredArray(round.resting_player_ids, "resting players").map((id) => requiredString(id, "player identifier")),
      status: "UPCOMING" as const,
    };
  });
  const players = requiredArray(fairness.players, "fairness players").map((value) => {
    const player = requiredRecord(value, "player fairness entry");
    return {
      playerId: requiredString(player.player_id, "player identifier"),
      playingMinutes: requiredNumber(player.playing_minutes, "playing minutes"),
      roundsPlayed: requiredNumber(player.rounds_played, "rounds played"),
      restCount: requiredNumber(player.rest_count, "rest count"),
    };
  });

  return {
    sessionId: requiredString(root.session_id, "session identifier"),
    rounds,
    fairness: {
      score: requiredNumber(fairness.score, "fairness score"),
      spreadMinutes: requiredNumber(fairness.spread_minutes, "playing-time spread"),
      averageMinutes: requiredNumber(fairness.average_minutes, "average playing time"),
      players,
    },
    isDemo: false,
    generationSeed,
  };
}

export function scheduleAssignmentSignature(schedule: Schedule): string {
  return JSON.stringify(schedule.rounds.map((round) => ({
    resting: [...round.restingPlayerIds].sort(),
    matchups: round.courts.map((court) => [
      [...court.teamA].sort().join(","),
      [...court.teamB].sort().join(","),
    ].sort().join(" vs ")).sort(),
  })));
}
