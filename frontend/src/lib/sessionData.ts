import { calculateTimingPreview } from "./timing";
import type { Player, Schedule, Session, SessionInput, SessionStatus } from "../types";

export const SESSION_STORAGE_KEY = "fairplay.prototype.sessions.v1";
export const SCHEDULE_STORAGE_KEY = "fairplay.prototype.schedules.v1";
export const SESSION_STORAGE_BACKUP_KEY = "fairplay.prototype.sessions.backup";
export const STORAGE_RECOVERY_NOTICE_KEY = "fairplay.prototype.storage-notice";

const sessionStatuses = new Set<SessionStatus>(["DRAFT", "READY", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function text(value: unknown, fallback: string, maxLength = 120): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function optionalText(value: unknown, maxLength = 500): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : undefined;
}

function integer(value: unknown, fallback: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && timePattern.test(value);
}

function normalizePlayers(value: unknown, warnings: string[]): Player[] {
  if (!Array.isArray(value)) {
    if (value !== undefined) warnings.push("The old roster could not be read and was reset.");
    return [];
  }

  const players: Player[] = [];
  const ids = new Set<string>();
  value.forEach((raw, index) => {
    if (!isRecord(raw) || typeof raw.name !== "string" || !raw.name.trim()) {
      warnings.push(`A player without a valid name was removed from the old roster.`);
      return;
    }

    let id = text(raw.id, `recovered-player-${index + 1}`);
    if (ids.has(id)) {
      id = `${id}-${index + 1}`.slice(0, 120);
      warnings.push("Duplicate player identifiers were repaired.");
    }
    ids.add(id);

    let availableFrom = validTime(raw.availableFrom) ? raw.availableFrom : undefined;
    let availableUntil = validTime(raw.availableUntil) ? raw.availableUntil : undefined;
    if ((raw.availableFrom && !availableFrom) || (raw.availableUntil && !availableUntil)) {
      warnings.push("An invalid player availability time was removed.");
    }
    if (availableFrom && availableUntil && availableUntil <= availableFrom) {
      availableFrom = undefined;
      availableUntil = undefined;
      warnings.push("A reversed player availability range was reset.");
    }

    players.push({
      id,
      name: text(raw.name, `Player ${index + 1}`),
      skillRating: raw.skillRating === undefined ? undefined : integer(raw.skillRating, 3, 1, 5),
      availableFrom,
      availableUntil,
      notes: optionalText(raw.notes),
      participationStatus: raw.participationStatus === "LEFT" ? "LEFT" : "ACTIVE",
      leftAfterRoundNumber: raw.participationStatus === "LEFT"
        ? integer(raw.leftAfterRoundNumber, 0, 0)
        : undefined,
    });
  });
  return players;
}

function normalizeSession(value: unknown, index: number): Session | undefined {
  if (!isRecord(value)) return undefined;
  const warnings: string[] = [];
  const fallbackDate = localDateValue(new Date());
  const input: SessionInput = {
    name: text(value.name, "Recovered session"),
    date: validDate(value.date) ? value.date : fallbackDate,
    startTime: validTime(value.startTime) ? value.startTime : "19:00",
    endTime: validTime(value.endTime) ? value.endTime : "21:00",
    warmupMinutes: integer(value.warmupMinutes, 0, 0, 1440),
    cleanupMinutes: integer(value.cleanupMinutes, 0, 0, 1440),
    roundDurationMinutes: integer(value.roundDurationMinutes, 15, 1, 1440),
    courtCount: integer(value.courtCount, 1, 1, 12),
    playersPerCourt: integer(value.playersPerCourt, 4, 1, 12),
  };

  if (!value.name || !validDate(value.date) || !validTime(value.startTime) || !validTime(value.endTime)) {
    warnings.push("Missing session details were restored with safe defaults.");
  }
  const numericFields = ["warmupMinutes", "cleanupMinutes", "roundDurationMinutes", "courtCount", "playersPerCourt"];
  if (numericFields.some((field) => value[field] === undefined || !Number.isFinite(Number(value[field])))) {
    warnings.push("Missing session settings were restored with safe defaults.");
  }
  if (!calculateTimingPreview(input).isValid) {
    input.startTime = "19:00";
    input.endTime = "21:00";
    input.warmupMinutes = 0;
    input.cleanupMinutes = 0;
    input.roundDurationMinutes = 15;
    warnings.push("Invalid session timing was reset to 19:00–21:00.");
  }

  const status = typeof value.status === "string" && sessionStatuses.has(value.status as SessionStatus)
    ? value.status as SessionStatus
    : "DRAFT";
  if (status !== value.status) warnings.push("The session status was restored to Draft.");

  return {
    ...input,
    id: text(value.id, `recovered-session-${index + 1}`),
    status,
    players: normalizePlayers(value.players, warnings),
    createdAt: typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt))
      ? value.createdAt
      : new Date().toISOString(),
    recoveryNotice: warnings.length ? [...new Set(warnings)].join(" ") : undefined,
  };
}

export function readStoredSessions(): Session[] {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(SESSION_STORAGE_BACKUP_KEY, stored);
      localStorage.setItem(SESSION_STORAGE_KEY, "[]");
      localStorage.setItem(STORAGE_RECOVERY_NOTICE_KEY, "An unreadable session file was backed up and removed from the workspace.");
      return [];
    }
    const sessions = parsed.map(normalizeSession).filter((session): session is Session => Boolean(session));
    if (sessions.length !== parsed.length) {
      localStorage.setItem(STORAGE_RECOVERY_NOTICE_KEY, `${parsed.length - sessions.length} unreadable session record was backed up and removed.`);
      localStorage.setItem(SESSION_STORAGE_BACKUP_KEY, stored);
    }
    const normalized = JSON.stringify(sessions);
    if (normalized !== stored) localStorage.setItem(SESSION_STORAGE_KEY, normalized);
    return sessions;
  } catch {
    localStorage.setItem(SESSION_STORAGE_BACKUP_KEY, stored);
    localStorage.setItem(SESSION_STORAGE_KEY, "[]");
    localStorage.setItem(STORAGE_RECOVERY_NOTICE_KEY, "Corrupted session data was backed up and removed so FairPlay can start safely.");
    return [];
  }
}

export function getStorageRecoveryNotice(): string | undefined {
  return localStorage.getItem(STORAGE_RECOVERY_NOTICE_KEY) || undefined;
}

export function clearStorageRecoveryNotice(): void {
  localStorage.removeItem(STORAGE_RECOVERY_NOTICE_KEY);
}

export function writeStoredSessions(sessions: Session[]): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
}

function isSchedule(value: unknown): value is Schedule {
  if (!isRecord(value) || typeof value.sessionId !== "string" || !Array.isArray(value.rounds) || !isRecord(value.fairness)) return false;
  return value.rounds.every((round) => isRecord(round)
    && typeof round.id === "string"
    && typeof round.number === "number"
    && typeof round.startTime === "string"
    && typeof round.endTime === "string"
    && Array.isArray(round.courts)
    && Array.isArray(round.restingPlayerIds))
    && typeof value.fairness.score === "number"
    && typeof value.fairness.spreadMinutes === "number"
    && typeof value.fairness.averageMinutes === "number"
    && Array.isArray(value.fairness.players);
}

function normalizeSchedule(value: unknown): Schedule | undefined {
  if (!isSchedule(value)) return undefined;
  return {
    ...value,
    generationSeed: Number.isInteger(value.generationSeed) ? value.generationSeed : 0,
  };
}

export function readStoredSchedules(): Record<string, Schedule> {
  const stored = localStorage.getItem(SCHEDULE_STORAGE_KEY);
  if (!stored) return {};
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) return {};
    const schedules = Object.fromEntries(Object.entries(parsed).flatMap(([id, value]) => {
      const schedule = normalizeSchedule(value);
      return schedule ? [[id, schedule]] : [];
    })) as Record<string, Schedule>;
    const normalized = JSON.stringify(schedules);
    if (normalized !== stored) localStorage.setItem(SCHEDULE_STORAGE_KEY, normalized);
    return schedules;
  } catch {
    return {};
  }
}

export function writeStoredSchedules(schedules: Record<string, Schedule>): void {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
}
