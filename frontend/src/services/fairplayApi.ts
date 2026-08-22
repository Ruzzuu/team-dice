import { demoSchedule, demoSession } from "../data/demo";
import type { GeneratedScheduleResult, Player, Schedule, Session, SessionInput } from "../types";

const STORAGE_KEY = "fairplay.prototype.sessions.v1";
const SCHEDULE_STORAGE_KEY = "fairplay.prototype.schedules.v1";

export interface FairPlayApi {
  listSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(input: SessionInput): Promise<Session>;
  updateSession(sessionId: string, input: SessionInput): Promise<Session>;
  savePlayer(sessionId: string, player: Omit<Player, "id"> & { id?: string }): Promise<Session>;
  removePlayer(sessionId: string, playerId: string): Promise<Session>;
  getSchedule(sessionId: string): Promise<Schedule | undefined>;
  generateSchedule(session: Session, seed?: number): Promise<GeneratedScheduleResult>;
  startSession(sessionId: string): Promise<GeneratedScheduleResult>;
}

function readLocalSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Session[];
  } catch {
    return [];
  }
}

function writeLocalSessions(sessions: Session[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function readLocalSchedules(): Record<string, Schedule> {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY) ?? "{}") as Record<string, Schedule>;
  } catch {
    return {};
  }
}

function writeLocalSchedules(schedules: Record<string, Schedule>): void {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
}

function removeLocalSchedule(sessionId: string): void {
  const schedules = readLocalSchedules();
  delete schedules[sessionId];
  writeLocalSchedules(schedules);
}

function allSessions(): Session[] {
  return [demoSession, ...readLocalSessions()];
}

function updateLocalSession(id: string, transform: (session: Session) => Session): Session {
  const sessions = readLocalSessions();
  const index = sessions.findIndex((session) => session.id === id);
  if (index < 0) throw new Error("The session could not be updated.");
  sessions[index] = transform(sessions[index]);
  writeLocalSessions(sessions);
  return sessions[index];
}

function backendErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return "The scheduler could not generate this session. Check that the API is running and try again.";
}

function mapScheduleResponse(body: Record<string, unknown>): Schedule {
  const rounds = body.rounds as Array<Record<string, unknown>>;
  const fairness = body.fairness as Record<string, unknown>;
  return {
    sessionId: body.session_id as string,
    rounds: rounds.map((round) => ({
      id: round.id as string,
      number: round.number as number,
      startTime: String(round.start_time).slice(0, 5),
      endTime: String(round.end_time).slice(0, 5),
      courts: (round.courts as Array<Record<string, unknown>>).map((court) => ({
        courtNumber: court.court_number as number,
        teamA: court.team_a as string[],
        teamB: court.team_b as string[],
      })),
      restingPlayerIds: round.resting_player_ids as string[],
      status: "UPCOMING" as const,
    })),
    fairness: {
      score: fairness.score as number,
      spreadMinutes: fairness.spread_minutes as number,
      averageMinutes: fairness.average_minutes as number,
      players: (fairness.players as Array<Record<string, unknown>>).map((player) => ({
        playerId: player.player_id as string,
        playingMinutes: player.playing_minutes as number,
        roundsPlayed: player.rounds_played as number,
        restCount: player.rest_count as number,
      })),
    },
    isDemo: false,
  };
}

export const localFairPlayApi: FairPlayApi = {
  async listSessions() {
    return allSessions();
  },

  async getSession(id) {
    return allSessions().find((session) => session.id === id);
  },

  async createSession(input) {
    const session: Session = {
      ...input,
      id: crypto.randomUUID(),
      status: "DRAFT",
      players: [],
      createdAt: new Date().toISOString(),
    };
    writeLocalSessions([session, ...readLocalSessions()]);
    return session;
  },

  async updateSession(sessionId, input) {
    const session = updateLocalSession(sessionId, (current) => ({
      ...current,
      ...input,
      status: "DRAFT",
    }));
    removeLocalSchedule(sessionId);
    return session;
  },

  async savePlayer(sessionId, player) {
    const session = updateLocalSession(sessionId, (current) => {
      if (current.status === "ACTIVE") throw new Error("Active session rosters cannot be edited.");
      const savedPlayer: Player = { ...player, id: player.id ?? crypto.randomUUID() };
      const exists = current.players.some((item) => item.id === savedPlayer.id);
      return {
        ...current,
        status: "DRAFT",
        players: exists
          ? current.players.map((item) => (item.id === savedPlayer.id ? savedPlayer : item))
          : [...current.players, savedPlayer],
      };
    });
    removeLocalSchedule(sessionId);
    return session;
  },

  async removePlayer(sessionId, playerId) {
    const session = updateLocalSession(sessionId, (current) => {
      if (current.status === "ACTIVE") throw new Error("Active session rosters cannot be edited.");
      return {
        ...current,
        status: "DRAFT",
        players: current.players.filter((player) => player.id !== playerId),
      };
    });
    removeLocalSchedule(sessionId);
    return session;
  },

  async getSchedule(sessionId) {
    return sessionId === demoSession.id ? demoSchedule : readLocalSchedules()[sessionId];
  },

  async generateSchedule(session, seed = 0) {
    const response = await fetch("/api/schedules/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        session: {
          name: session.name,
          date: session.date,
          start_time: session.startTime,
          end_time: session.endTime,
          warmup_minutes: session.warmupMinutes,
          cleanup_minutes: session.cleanupMinutes,
          round_duration_minutes: session.roundDurationMinutes,
          court_count: session.courtCount,
          players_per_court: session.playersPerCourt,
        },
        players: session.players.map((player) => ({
          id: player.id,
          name: player.name,
          skill_rating: player.skillRating,
          available_from: player.availableFrom || undefined,
          available_until: player.availableUntil || undefined,
        })),
        seed,
      }),
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(backendErrorMessage(body));
    const schedule = mapScheduleResponse(body);
    const schedules = readLocalSchedules();
    schedules[session.id] = schedule;
    writeLocalSchedules(schedules);
    const updatedSession = updateLocalSession(session.id, (current) => ({ ...current, status: "READY" }));
    return { session: updatedSession, schedule };
  },

  async startSession(sessionId) {
    const schedules = readLocalSchedules();
    const existingSchedule = schedules[sessionId];
    if (!existingSchedule) throw new Error("Generate a schedule before starting this session.");
    const schedule: Schedule = {
      ...existingSchedule,
      rounds: existingSchedule.rounds.map((round, index) => ({
        ...round,
        status: index === 0 ? "ACTIVE" : "UPCOMING",
      })),
    };
    schedules[sessionId] = schedule;
    writeLocalSchedules(schedules);
    const session = updateLocalSession(sessionId, (current) => ({ ...current, status: "ACTIVE" }));
    return { session, schedule };
  },
};
