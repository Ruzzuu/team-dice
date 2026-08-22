export type SessionStatus = "DRAFT" | "READY" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export interface SessionInput {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  warmupMinutes: number;
  cleanupMinutes: number;
  roundDurationMinutes: number;
  courtCount: number;
  playersPerCourt: number;
}

export interface Player {
  id: string;
  name: string;
  skillRating?: number;
  availableFrom?: string;
  availableUntil?: string;
  notes?: string;
}

export interface Session extends SessionInput {
  id: string;
  status: SessionStatus;
  players: Player[];
  createdAt: string;
}

export interface CourtAssignment {
  courtNumber: number;
  teamA: string[];
  teamB: string[];
}

export interface Round {
  id: string;
  number: number;
  startTime: string;
  endTime: string;
  courts: CourtAssignment[];
  restingPlayerIds: string[];
  status: "COMPLETED" | "ACTIVE" | "UPCOMING";
}

export interface PlayerFairness {
  playerId: string;
  playingMinutes: number;
  roundsPlayed: number;
  restCount: number;
}

export interface FairnessSummary {
  score: number;
  spreadMinutes: number;
  averageMinutes: number;
  players: PlayerFairness[];
}

export interface Schedule {
  sessionId: string;
  rounds: Round[];
  fairness: FairnessSummary;
  isDemo: boolean;
}

export interface GeneratedScheduleResult {
  session: Session;
  schedule: Schedule;
}

export interface TimingPreview {
  totalMinutes: number;
  usableMinutes: number;
  numberOfRounds: number;
  unusedMinutes: number;
  capacity: number;
  isValid: boolean;
}
