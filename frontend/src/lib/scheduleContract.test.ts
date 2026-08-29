import { describe, expect, it } from "vitest";
import { backendErrorMessage, mapScheduleResponse, scheduleAssignmentSignature, validateSessionForSchedule } from "./scheduleContract";
import type { Schedule, Session } from "../types";

const session: Session = {
  id: "session",
  name: "Friday Game",
  date: "2026-08-21",
  startTime: "19:00",
  endTime: "20:00",
  warmupMinutes: 0,
  cleanupMinutes: 0,
  roundDurationMinutes: 15,
  courtCount: 1,
  playersPerCourt: 2,
  status: "DRAFT",
  createdAt: "2026-08-01T00:00:00Z",
  players: [{ id: "p1", name: "One" }, { id: "p2", name: "Two" }],
};

describe("schedule API contract", () => {
  it("translates FastAPI validation details into readable field errors", () => {
    expect(backendErrorMessage({ detail: [{ loc: ["body", "players", 1, "available_until"], msg: "Value error, must be later" }] }, 422))
      .toBe("Players · Player 2 · Available until: must be later");
  });

  it("blocks malformed client data before it reaches the backend", () => {
    expect(validateSessionForSchedule({ ...session, players: [{ ...session.players[0], skillRating: 8 }, session.players[1]] }))
      .toMatch(/skill level must be between 1 and 5/i);
  });

  it("rejects an unexpected success response shape", () => {
    expect(() => mapScheduleResponse({ session_id: "session", rounds: [] })).toThrow(/invalid fairness summary/i);
  });

  it("ignores cosmetic team labels but detects a meaningful matchup change", () => {
    const base: Schedule = {
      sessionId: "session",
      generationSeed: 0,
      isDemo: false,
      rounds: [{ id: "r1", number: 1, startTime: "19:00", endTime: "19:15", status: "UPCOMING", restingPlayerIds: [], courts: [{ courtNumber: 1, teamA: ["p1", "p2"], teamB: ["p3", "p4"] }] }],
      fairness: { score: 100, spreadMinutes: 0, averageMinutes: 15, players: [] },
    };
    const swapped = { ...base, rounds: [{ ...base.rounds[0], courts: [{ courtNumber: 2, teamA: ["p4", "p3"], teamB: ["p2", "p1"] }] }] };
    const different = { ...base, rounds: [{ ...base.rounds[0], courts: [{ courtNumber: 1, teamA: ["p1", "p3"], teamB: ["p2", "p4"] }] }] };

    expect(scheduleAssignmentSignature(swapped)).toBe(scheduleAssignmentSignature(base));
    expect(scheduleAssignmentSignature(different)).not.toBe(scheduleAssignmentSignature(base));
  });
});
