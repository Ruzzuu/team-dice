import { describe, expect, it } from "vitest";
import { demoSession } from "../data/demo";
import type { Schedule, Session } from "../types";
import { buildDashboardMetrics, pickFeaturedSession } from "./sessionMetrics";

const baseSession: Session = {
  id: "one",
  name: "One",
  date: "2030-01-02",
  startTime: "19:00",
  endTime: "20:00",
  warmupMinutes: 0,
  cleanupMinutes: 0,
  roundDurationMinutes: 15,
  courtCount: 1,
  playersPerCourt: 4,
  status: "READY",
  createdAt: "2026-01-01T00:00:00Z",
  players: [{ id: "p1", name: "Edo Bagas" }, { id: "p2", name: "Ari Putra" }],
};

describe("dashboard session metrics", () => {
  it("ignores demo data and chooses the next real session", () => {
    const later = { ...baseSession, id: "two", date: "2030-01-03" };
    expect(pickFeaturedSession([demoSession, later, baseSession], new Date("2030-01-01T00:00:00"))?.id).toBe("one");
  });

  it("calculates unique players, rounds, and fairness from user schedules", () => {
    const second = { ...baseSession, id: "two", players: [{ id: "p3", name: "edo bagas" }] };
    const schedule = {
      generationSeed: 0,
      sessionId: baseSession.id,
      isDemo: false,
      rounds: [{}, {}],
      fairness: { score: 90 },
    } as Schedule;
    expect(buildDashboardMetrics([demoSession, baseSession, second], [undefined, schedule])).toEqual({
      sessionCount: 2,
      playerCount: 2,
      scheduledRounds: 2,
      averageFairness: 90,
    });
  });
});
