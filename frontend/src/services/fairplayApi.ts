import { demoSchedule, demoSession } from "../data/demo";
import { backendErrorMessage, mapScheduleResponse, scheduleAssignmentSignature, validateSessionForSchedule } from "../lib/scheduleContract";
import { readStoredSchedules, readStoredSessions, writeStoredSchedules, writeStoredSessions } from "../lib/sessionData";
import { calculateTimingPreview } from "../lib/timing";
import type { CompleteRoundInput, CourtResult, FairnessSummary, GeneratedScheduleResult, Player, Schedule, Session, SessionInput } from "../types";

export interface FairPlayApi {
  listSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(input: SessionInput): Promise<Session>;
  updateSession(sessionId: string, input: SessionInput): Promise<Session>;
  savePlayer(sessionId: string, player: Omit<Player, "id"> & { id?: string }): Promise<Session>;
  removePlayer(sessionId: string, playerId: string): Promise<Session>;
  getSchedule(sessionId: string): Promise<Schedule | undefined>;
  generateSchedule(session: Session, seed?: number): Promise<GeneratedScheduleResult>;
  reshuffleSchedule(session: Session, currentSchedule: Schedule): Promise<GeneratedScheduleResult>;
  startSession(sessionId: string): Promise<GeneratedScheduleResult>;
  completeRound(sessionId: string, input: CompleteRoundInput): Promise<GeneratedScheduleResult>;
  startNextRound(sessionId: string): Promise<GeneratedScheduleResult>;
  replanRemainingRounds(sessionId: string): Promise<GeneratedScheduleResult>;
}

const RESHUFFLE_ATTEMPTS = 8;

interface ScheduleContinuation {
  nextStartTime: string;
  roundNumberOffset: number;
  playerHistory: Array<{ playerId: string; roundsPlayed: number; restCount: number }>;
  previousRestingPlayerIds: string[];
}

function readLocalSessions(): Session[] {
  return readStoredSessions();
}

function writeLocalSessions(sessions: Session[]): void {
  writeStoredSessions(sessions);
}

function readLocalSchedules(): Record<string, Schedule> {
  return readStoredSchedules();
}

function writeLocalSchedules(schedules: Record<string, Schedule>): void {
  writeStoredSchedules(schedules);
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

function sessionInputMatches(session: Session, input: SessionInput): boolean {
  return session.name === input.name
    && session.date === input.date
    && session.startTime === input.startTime
    && session.endTime === input.endTime
    && session.warmupMinutes === input.warmupMinutes
    && session.cleanupMinutes === input.cleanupMinutes
    && session.roundDurationMinutes === input.roundDurationMinutes
    && session.courtCount === input.courtCount
    && session.playersPerCourt === input.playersPerCourt;
}

function playerMatches(left: Player, right: Player): boolean {
  return left.id === right.id
    && left.name === right.name
    && left.skillRating === right.skillRating
    && left.availableFrom === right.availableFrom
    && left.availableUntil === right.availableUntil
    && left.notes === right.notes;
}

async function requestSchedule(session: Session, seed: number, continuation?: ScheduleContinuation): Promise<Schedule> {
  const validationError = validateSessionForSchedule(session);
  if (validationError) throw new Error(validationError);
  let response: Response;
  try {
    response = await fetch("/api/schedules/generate", {
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
        continuation: continuation ? {
          next_start_time: continuation.nextStartTime,
          round_number_offset: continuation.roundNumberOffset,
          player_history: continuation.playerHistory.map((entry) => ({
            player_id: entry.playerId,
            rounds_played: entry.roundsPlayed,
            rest_count: entry.restCount,
          })),
          previous_resting_player_ids: continuation.previousRestingPlayerIds,
        } : undefined,
      }),
    });
  } catch {
    throw new Error("The scheduler backend could not be reached. Make sure the backend is running on port 8000, then try again.");
  }
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(backendErrorMessage(body, response.status));
  return mapScheduleResponse(body, seed);
}

function saveGeneratedSchedule(session: Session, schedule: Schedule): GeneratedScheduleResult {
  const schedules = readLocalSchedules();
  schedules[session.id] = schedule;
  writeLocalSchedules(schedules);
  const updatedSession = updateLocalSession(session.id, (current) => ({ ...current, status: "READY" }));
  return { session: updatedSession, schedule };
}

function isActivePlayer(player: Player): boolean {
  return player.participationStatus !== "LEFT";
}

function assertSetupEditable(session: Session): void {
  if (session.status === "ACTIVE" || session.status === "COMPLETED") {
    throw new Error("Session settings and rosters are locked after play has started.");
  }
}

function getLocalSession(sessionId: string): Session {
  const session = readLocalSessions().find((item) => item.id === sessionId);
  if (!session) throw new Error("The session could not be found.");
  return session;
}

function getLocalSchedule(sessionId: string): Schedule {
  const schedule = readLocalSchedules()[sessionId];
  if (!schedule) throw new Error("The schedule could not be found.");
  return schedule;
}

function saveLiveState(session: Session, schedule: Schedule): GeneratedScheduleResult {
  const sessions = readLocalSessions();
  const index = sessions.findIndex((item) => item.id === session.id);
  if (index < 0) throw new Error("The session could not be updated.");
  sessions[index] = session;
  writeLocalSessions(sessions);
  const schedules = readLocalSchedules();
  schedules[session.id] = schedule;
  writeLocalSchedules(schedules);
  return { session, schedule };
}

function completedHistory(schedule: Schedule, playerIds: string[]): Map<string, { roundsPlayed: number; restCount: number }> {
  const history = new Map(playerIds.map((id) => [id, { roundsPlayed: 0, restCount: 0 }]));
  for (const round of schedule.rounds.filter((item) => item.status === "COMPLETED")) {
    const playing = new Set(round.courts.flatMap((court) => [...court.teamA, ...court.teamB]));
    for (const id of playerIds) {
      const entry = history.get(id)!;
      if (playing.has(id)) entry.roundsPlayed += 1;
      else if (round.restingPlayerIds.includes(id)) entry.restCount += 1;
    }
  }
  return history;
}

function historicalFairness(session: Session, schedule: Schedule, playerIds = session.players.map((player) => player.id)): FairnessSummary {
  const history = completedHistory(schedule, playerIds);
  const players = playerIds.map((playerId) => {
    const entry = history.get(playerId) ?? { roundsPlayed: 0, restCount: 0 };
    return { playerId, playingMinutes: entry.roundsPlayed * session.roundDurationMinutes, ...entry };
  });
  const minutes = players.map((player) => player.playingMinutes);
  const minimum = minutes.length ? Math.min(...minutes) : 0;
  const maximum = minutes.length ? Math.max(...minutes) : 0;
  return {
    score: maximum === 0 ? 100 : Math.round((minimum / maximum) * 100),
    spreadMinutes: maximum - minimum,
    averageMinutes: minutes.length ? Math.round((minutes.reduce((sum, value) => sum + value, 0) / minutes.length) * 10) / 10 : 0,
    players,
  };
}

function resultFromInput(input: CompleteRoundInput["results"][number], completedAt: string): CourtResult {
  if (input.completedWithoutScore) return { winner: "UNRECORDED", completedAt };
  if (!Number.isInteger(input.teamAScore) || !Number.isInteger(input.teamBScore) || input.teamAScore! < 0 || input.teamBScore! < 0) {
    throw new Error(`Enter valid non-negative scores for Court ${input.courtNumber}, or choose completed without score.`);
  }
  return {
    teamAScore: input.teamAScore,
    teamBScore: input.teamBScore,
    winner: input.teamAScore! > input.teamBScore! ? "A" : input.teamBScore! > input.teamAScore! ? "B" : "DRAW",
    completedAt,
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
    let changed = false;
    const session = updateLocalSession(sessionId, (current) => {
      assertSetupEditable(current);
      if (sessionInputMatches(current, input)) return current;
      changed = true;
      return { ...current, ...input, status: "DRAFT", recoveryNotice: undefined };
    });
    if (changed) removeLocalSchedule(sessionId);
    return session;
  },

  async savePlayer(sessionId, player) {
    let changed = false;
    const session = updateLocalSession(sessionId, (current) => {
      assertSetupEditable(current);
      const savedPlayer: Player = { ...player, id: player.id ?? crypto.randomUUID() };
      const exists = current.players.some((item) => item.id === savedPlayer.id);
      if (exists && current.players.some((item) => item.id === savedPlayer.id && playerMatches(item, savedPlayer))) return current;
      changed = true;
      return {
        ...current,
        status: "DRAFT",
        players: exists
          ? current.players.map((item) => (item.id === savedPlayer.id ? savedPlayer : item))
          : [...current.players, savedPlayer],
      };
    });
    if (changed) removeLocalSchedule(sessionId);
    return session;
  },

  async removePlayer(sessionId, playerId) {
    let changed = false;
    const session = updateLocalSession(sessionId, (current) => {
      assertSetupEditable(current);
      if (!current.players.some((player) => player.id === playerId)) return current;
      changed = true;
      return {
        ...current,
        status: "DRAFT",
        players: current.players.filter((player) => player.id !== playerId),
      };
    });
    if (changed) removeLocalSchedule(sessionId);
    return session;
  },

  async getSchedule(sessionId) {
    return sessionId === demoSession.id ? demoSchedule : readLocalSchedules()[sessionId];
  },

  async generateSchedule(session, seed = 0) {
    assertSetupEditable(session);
    return saveGeneratedSchedule(session, await requestSchedule(session, seed));
  },

  async reshuffleSchedule(session, currentSchedule) {
    assertSetupEditable(session);
    const currentSignature = scheduleAssignmentSignature(currentSchedule);
    for (let offset = 1; offset <= RESHUFFLE_ATTEMPTS; offset += 1) {
      const candidate = await requestSchedule(session, currentSchedule.generationSeed + offset);
      if (scheduleAssignmentSignature(candidate) !== currentSignature) return saveGeneratedSchedule(session, candidate);
    }
    throw new Error("No different fair arrangement is available for this setup. Change the players, availability, or court setup and try again.");
  },

  async startSession(sessionId) {
    const currentSession = getLocalSession(sessionId);
    if (currentSession.status !== "READY") throw new Error("Only a reviewed schedule can be started.");
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

  async completeRound(sessionId, input) {
    const session = getLocalSession(sessionId);
    const schedule = getLocalSchedule(sessionId);
    if (session.status !== "ACTIVE") throw new Error("Only an active session can complete a round.");
    const activeRound = schedule.rounds.find((round) => round.status === "ACTIVE");
    if (!activeRound || activeRound.id !== input.roundId) throw new Error("The active round could not be found.");

    const activePlayerIds = new Set(session.players.filter(isActivePlayer).map((player) => player.id));
    const departingIds = [...new Set(input.departingPlayerIds)];
    if (departingIds.some((id) => !activePlayerIds.has(id))) throw new Error("Only currently active players can be marked as leaving.");
    const expectedCourtNumbers = new Set(activeRound.courts.map((court) => court.courtNumber));
    if (input.results.length !== expectedCourtNumbers.size || new Set(input.results.map((result) => result.courtNumber)).size !== input.results.length) {
      throw new Error("Record exactly one result for every court before completing the round.");
    }
    if (input.results.some((result) => !expectedCourtNumbers.has(result.courtNumber))) {
      throw new Error("A submitted result does not belong to the active round.");
    }
    const results = new Map(input.results.map((result) => [result.courtNumber, result]));
    if (activeRound.courts.some((court) => !results.has(court.courtNumber))) throw new Error("Record a result for every court before completing the round.");

    const completedAt = new Date().toISOString();
    const completedRound = {
      ...activeRound,
      status: "COMPLETED" as const,
      completedAt,
      courts: activeRound.courts.map((court) => ({
        ...court,
        result: resultFromInput(results.get(court.courtNumber)!, completedAt),
      })),
    };
    const players = session.players.map((player) => departingIds.includes(player.id)
      ? { ...player, participationStatus: "LEFT" as const, leftAfterRoundNumber: activeRound.number }
      : player);
    const remainingRounds = schedule.rounds.filter((round) => round.id !== activeRound.id && round.status !== "COMPLETED");
    const completedRounds = schedule.rounds.filter((round) => round.status === "COMPLETED");
    const updatedRounds = [...completedRounds, completedRound, ...(departingIds.length ? [] : remainingRounds)];
    const hasUpcoming = updatedRounds.some((round) => round.status === "UPCOMING");
    const updatedSession: Session = {
      ...session,
      players,
      status: !departingIds.length && !hasUpcoming ? "COMPLETED" : "ACTIVE",
    };
    const updatedSchedule: Schedule = {
      ...schedule,
      rounds: updatedRounds,
      fairness: historicalFairness(updatedSession, { ...schedule, rounds: updatedRounds }),
    };
    saveLiveState(updatedSession, updatedSchedule);

    if (departingIds.length && updatedSession.status === "ACTIVE") {
      return localFairPlayApi.replanRemainingRounds(sessionId);
    }
    return { session: updatedSession, schedule: updatedSchedule };
  },

  async startNextRound(sessionId) {
    const session = getLocalSession(sessionId);
    const schedule = getLocalSchedule(sessionId);
    if (session.status !== "ACTIVE") throw new Error("The session is not active.");
    if (schedule.rounds.some((round) => round.status === "ACTIVE")) throw new Error("Complete the current round before starting another.");
    const nextRound = schedule.rounds.find((round) => round.status === "UPCOMING");
    if (!nextRound) {
      return saveLiveState({ ...session, status: "COMPLETED" }, schedule);
    }
    const updatedSchedule: Schedule = {
      ...schedule,
      rounds: schedule.rounds.map((round) => round.id === nextRound.id ? { ...round, status: "ACTIVE" } : round),
    };
    return saveLiveState(session, updatedSchedule);
  },

  async replanRemainingRounds(sessionId) {
    const session = getLocalSession(sessionId);
    const schedule = getLocalSchedule(sessionId);
    if (session.status !== "ACTIVE") throw new Error("Only an active session can replan future rounds.");
    if (schedule.rounds.some((round) => round.status === "ACTIVE")) throw new Error("Complete the current round before replanning future matches.");
    const completedRounds = schedule.rounds.filter((round) => round.status === "COMPLETED").sort((left, right) => left.number - right.number);
    const lastCompleted = completedRounds.at(-1);
    if (!lastCompleted) throw new Error("Complete the current round before replanning future matches.");
    const activePlayers = session.players.filter(isActivePlayer);
    const completedOnly: Schedule = {
      ...schedule,
      rounds: completedRounds,
      fairness: historicalFairness(session, { ...schedule, rounds: completedRounds }),
    };
    const remainingTiming = calculateTimingPreview({ ...session, startTime: lastCompleted.endTime, warmupMinutes: 0 });
    if (activePlayers.length < 2 || remainingTiming.numberOfRounds < 1) {
      return saveLiveState({ ...session, status: "COMPLETED" }, completedOnly);
    }

    const history = completedHistory(completedOnly, activePlayers.map((player) => player.id));
    const seed = schedule.generationSeed + 1;
    const candidate = await requestSchedule(
      { ...session, players: activePlayers },
      seed,
      {
        nextStartTime: lastCompleted.endTime,
        roundNumberOffset: lastCompleted.number,
        playerHistory: activePlayers.map((player) => ({
          playerId: player.id,
          roundsPlayed: history.get(player.id)?.roundsPlayed ?? 0,
          restCount: history.get(player.id)?.restCount ?? 0,
        })),
        previousRestingPlayerIds: lastCompleted.restingPlayerIds.filter((id) => activePlayers.some((player) => player.id === id)),
      },
    );
    const playableFutureRounds = candidate.rounds.filter((round) => round.courts.length > 0);
    if (!playableFutureRounds.length) {
      return saveLiveState({ ...session, status: "COMPLETED" }, completedOnly);
    }
    const departedIds = session.players.filter((player) => !isActivePlayer(player)).map((player) => player.id);
    const departedHistory = historicalFairness(session, completedOnly, departedIds).players;
    const mergedSchedule: Schedule = {
      ...candidate,
      rounds: [...completedRounds, ...playableFutureRounds],
      fairness: { ...candidate.fairness, players: [...candidate.fairness.players, ...departedHistory] },
    };
    return saveLiveState(session, mergedSchedule);
  },
};
