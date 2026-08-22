import { describe, expect, it, vi } from "vitest";
import { localFairPlayApi } from "./fairplayApi";

describe("localFairPlayApi", () => {
  it("persists a draft session and roster changes", async () => {
    const session = await localFairPlayApi.createSession({
      name: "Sunday Padel",
      date: "2026-08-23",
      startTime: "09:00",
      endTime: "11:00",
      warmupMinutes: 0,
      cleanupMinutes: 0,
      roundDurationMinutes: 15,
      courtCount: 2,
      playersPerCourt: 4,
    });
    const withPlayer = await localFairPlayApi.savePlayer(session.id, { name: "New Player", skillRating: 3 });

    expect(withPlayer.status).toBe("DRAFT");
    expect(withPlayer.players).toHaveLength(1);
    expect((await localFairPlayApi.getSession(session.id))?.players[0].name).toBe("New Player");
  });

  it("only exposes a schedule for the seeded demo", async () => {
    expect(await localFairPlayApi.getSchedule("demo-friday-badminton")).toBeDefined();
    expect(await localFairPlayApi.getSchedule("draft-id")).toBeUndefined();
  });

  it("generates, persists, and starts a local session", async () => {
    let session = await localFairPlayApi.createSession({
      name: "Friday Badminton",
      date: "2026-08-21",
      startTime: "19:00",
      endTime: "20:00",
      warmupMinutes: 0,
      cleanupMinutes: 0,
      roundDurationMinutes: 15,
      courtCount: 1,
      playersPerCourt: 2,
    });
    session = await localFairPlayApi.savePlayer(session.id, { id: "p1", name: "Player One", skillRating: 3 });
    session = await localFairPlayApi.savePlayer(session.id, { id: "p2", name: "Player Two", skillRating: 3 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session_id: session.id,
        session_status: "READY",
        rounds: [{
          id: `${session.id}-round-1`,
          number: 1,
          start_time: "19:00:00",
          end_time: "19:15:00",
          courts: [{ court_number: 1, team_a: ["p1"], team_b: ["p2"] }],
          resting_player_ids: [],
          status: "UPCOMING",
        }],
        fairness: {
          score: 100,
          spread_minutes: 0,
          average_minutes: 15,
          players: [
            { player_id: "p1", playing_minutes: 15, rounds_played: 1, rest_count: 0 },
            { player_id: "p2", playing_minutes: 15, rounds_played: 1, rest_count: 0 },
          ],
        },
      }),
    }));

    const generated = await localFairPlayApi.generateSchedule(session);
    expect(generated.session.status).toBe("READY");
    expect((await localFairPlayApi.getSchedule(session.id))?.rounds).toHaveLength(1);

    const started = await localFairPlayApi.startSession(session.id);
    expect(started.session.status).toBe("ACTIVE");
    expect(started.schedule.rounds[0].status).toBe("ACTIVE");
  });

  it("invalidates an existing schedule when settings change", async () => {
    const session = await localFairPlayApi.createSession({
      name: "Draft",
      date: "2026-08-21",
      startTime: "19:00",
      endTime: "20:00",
      warmupMinutes: 0,
      cleanupMinutes: 0,
      roundDurationMinutes: 15,
      courtCount: 1,
      playersPerCourt: 2,
    });

    const updated = await localFairPlayApi.updateSession(session.id, { ...session, name: "Updated Draft" });

    expect(updated.name).toBe("Updated Draft");
    expect(updated.status).toBe("DRAFT");
    expect(await localFairPlayApi.getSchedule(session.id)).toBeUndefined();
  });
});
