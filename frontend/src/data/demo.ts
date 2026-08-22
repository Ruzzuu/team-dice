import type { Player, Round, Schedule, Session } from "../types";

const playerNames = ["Alex Morgan", "Jamie Chen", "Sam Rivera", "Taylor Kim", "Jordan Lee", "Casey Patel", "Drew Wilson", "Morgan Diaz", "Riley Tan", "Avery Smith"];

export const demoPlayers: Player[] = playerNames.map((name, index) => ({
  id: `player-${index + 1}`,
  name,
  skillRating: [4, 3, 4, 2, 3, 5, 3, 4, 2, 3][index],
}));

export const demoSession: Session = {
  id: "demo-friday-badminton",
  name: "Friday Night Badminton",
  date: "2026-08-21",
  startTime: "19:00",
  endTime: "21:00",
  warmupMinutes: 0,
  cleanupMinutes: 0,
  roundDurationMinutes: 15,
  courtCount: 2,
  playersPerCourt: 4,
  status: "READY",
  players: demoPlayers,
  createdAt: "2026-08-20T09:00:00.000Z",
};

const restPairs = [[8, 9], [6, 7], [4, 5], [2, 3], [0, 1], [8, 9], [6, 7], [4, 5]];

const rounds: Round[] = restPairs.map((resting, roundIndex) => {
  const active = demoPlayers.filter((_, index) => !resting.includes(index));
  const startMinutes = 19 * 60 + roundIndex * 15;
  const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

  return {
    id: `round-${roundIndex + 1}`,
    number: roundIndex + 1,
    startTime: formatTime(startMinutes),
    endTime: formatTime(startMinutes + 15),
    courts: [
      { courtNumber: 1, teamA: [active[0].id, active[1].id], teamB: [active[2].id, active[3].id] },
      { courtNumber: 2, teamA: [active[4].id, active[5].id], teamB: [active[6].id, active[7].id] },
    ],
    restingPlayerIds: resting.map((index) => demoPlayers[index].id),
    status: roundIndex === 0 ? "ACTIVE" : "UPCOMING",
  };
});

const fairnessPlayers = demoPlayers.map((player) => {
  const roundsPlayed = rounds.filter((round) => !round.restingPlayerIds.includes(player.id)).length;
  return {
    playerId: player.id,
    playingMinutes: roundsPlayed * 15,
    roundsPlayed,
    restCount: rounds.length - roundsPlayed,
  };
});

export const demoSchedule: Schedule = {
  sessionId: demoSession.id,
  rounds,
  fairness: {
    score: 96,
    spreadMinutes: 15,
    averageMinutes: 96,
    players: fairnessPlayers,
  },
  isDemo: true,
};
