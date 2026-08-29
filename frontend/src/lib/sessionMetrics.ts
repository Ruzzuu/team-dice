import type { Schedule, Session } from "../types";

export const DEMO_SESSION_ID = "demo-friday-badminton";

export interface DashboardMetrics {
  sessionCount: number;
  playerCount: number;
  scheduledRounds: number;
  averageFairness?: number;
}

function sessionTimestamp(session: Session): number {
  return new Date(`${session.date}T${session.startTime}:00`).getTime();
}

export function isDemoSession(session: Session): boolean {
  return session.id === DEMO_SESSION_ID;
}

export function sortUserSessions(sessions: Session[]): Session[] {
  return sessions
    .filter((session) => !isDemoSession(session))
    .sort((left, right) => sessionTimestamp(left) - sessionTimestamp(right));
}

export function pickFeaturedSession(sessions: Session[], now = new Date()): Session | undefined {
  const sorted = sortUserSessions(sessions);
  return sorted.find((session) => sessionTimestamp(session) >= now.getTime()) ?? sorted.at(-1);
}

export function buildDashboardMetrics(sessions: Session[], schedules: Array<Schedule | undefined>): DashboardMetrics {
  const userSessions = sessions.filter((session) => !isDemoSession(session));
  const userSchedules = schedules.filter((schedule): schedule is Schedule => Boolean(schedule && !schedule.isDemo));
  const playerNames = new Set(
    userSessions.flatMap((session) => session.players.map((player) => player.name.trim().toLocaleLowerCase())),
  );
  const fairnessValues = userSchedules.map((schedule) => schedule.fairness.score);

  return {
    sessionCount: userSessions.length,
    playerCount: playerNames.size,
    scheduledRounds: userSchedules.reduce((total, schedule) => total + schedule.rounds.length, 0),
    averageFairness: fairnessValues.length
      ? Math.round(fairnessValues.reduce((total, score) => total + score, 0) / fairnessValues.length)
      : undefined,
  };
}
