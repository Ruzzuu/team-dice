import { describe, expect, it, vi } from "vitest";
import { localFairPlayApi } from "./fairplayApi";

function scheduleResponse(sessionId: string, teamA = ["p1", "p2"], teamB = ["p3", "p4"]) {
  const ids = [...teamA, ...teamB];
  return {
    session_id: sessionId,
    session_status: "READY",
    rounds: [{
      id: `${sessionId}-round-1`,
      number: 1,
      start_time: "19:00:00",
      end_time: "19:15:00",
      courts: [{ court_number: 1, team_a: teamA, team_b: teamB }],
      resting_player_ids: [],
      status: "UPCOMING",
    }],
    fairness: {
      score: 100,
      spread_minutes: 0,
      average_minutes: 15,
      players: ids.map((id) => ({ player_id: id, playing_minutes: 15, rounds_played: 1, rest_count: 0 })),
    },
  };
}

function multiRoundResponse(sessionId: string, playerIds = ["p1", "p2", "p3", "p4"], firstRoundNumber = 1, roundCount = 3) {
  const startMinutes = 19 * 60 + (firstRoundNumber - 1) * 15;
  const time = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
  return {
    session_id: sessionId,
    session_status: "READY",
    rounds: Array.from({ length: roundCount }, (_, index) => {
      const number = firstRoundNumber + index;
      return {
        id: `${sessionId}-round-${number}`,
        number,
        start_time: time(startMinutes + index * 15),
        end_time: time(startMinutes + (index + 1) * 15),
        courts: [{ court_number: 1, team_a: playerIds.slice(0, Math.ceil(playerIds.length / 2)), team_b: playerIds.slice(Math.ceil(playerIds.length / 2)) }],
        resting_player_ids: [],
        status: "UPCOMING",
      };
    }),
    fairness: {
      score: 100,
      spread_minutes: 0,
      average_minutes: roundCount * 15,
      players: playerIds.map((id) => ({ player_id: id, playing_minutes: roundCount * 15, rounds_played: roundCount, rest_count: 0 })),
    },
  };
}

async function createFourPlayerSession() {
  let session = await localFairPlayApi.createSession({
    name: "Four Player Game",
    date: "2026-08-21",
    startTime: "19:00",
    endTime: "20:00",
    warmupMinutes: 0,
    cleanupMinutes: 0,
    roundDurationMinutes: 15,
    courtCount: 1,
    playersPerCourt: 4,
  });
  for (const id of ["p1", "p2", "p3", "p4"]) {
    session = await localFairPlayApi.savePlayer(session.id, { id, name: `Player ${id.slice(1)}`, skillRating: 3 });
  }
  return session;
}

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
    expect(generated.schedule.generationSeed).toBe(0);
    expect((await localFairPlayApi.getSchedule(session.id))?.rounds).toHaveLength(1);

    const started = await localFairPlayApi.startSession(session.id);
    expect(started.session.status).toBe("ACTIVE");
    expect(started.schedule.rounds[0].status).toBe("ACTIVE");
  });

  it("invalidates an existing schedule when settings change", async () => {
    const session = await createFourPlayerSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => scheduleResponse(session.id) }));
    const generated = await localFairPlayApi.generateSchedule(session);

    const updated = await localFairPlayApi.updateSession(session.id, { ...generated.session, name: "Updated Draft" });

    expect(updated.name).toBe("Updated Draft");
    expect(updated.status).toBe("DRAFT");
    expect(await localFairPlayApi.getSchedule(session.id)).toBeUndefined();
  });

  it("tries successive seeds and persists only a different reshuffled arrangement", async () => {
    const session = await createFourPlayerSession();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => scheduleResponse(session.id) })
      .mockResolvedValueOnce({ ok: true, json: async () => scheduleResponse(session.id) })
      .mockResolvedValueOnce({ ok: true, json: async () => scheduleResponse(session.id, ["p1", "p3"], ["p2", "p4"]) });
    vi.stubGlobal("fetch", fetchMock);

    const generated = await localFairPlayApi.generateSchedule(session);
    const reshuffled = await localFairPlayApi.reshuffleSchedule(generated.session, generated.schedule);

    expect(reshuffled.schedule.generationSeed).toBe(2);
    expect(reshuffled.schedule.rounds[0].courts[0].teamA).toEqual(["p1", "p3"]);
    expect((await localFairPlayApi.getSchedule(session.id))?.generationSeed).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).seed).toBe(1);
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body)).seed).toBe(2);
  });

  it("preserves the current schedule when no alternative arrangement is found", async () => {
    const session = await createFourPlayerSession();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => scheduleResponse(session.id) });
    vi.stubGlobal("fetch", fetchMock);
    const generated = await localFairPlayApi.generateSchedule(session);
    fetchMock.mockClear();

    await expect(localFairPlayApi.reshuffleSchedule(generated.session, generated.schedule)).rejects.toThrow(/no different fair arrangement/i);

    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect((await localFairPlayApi.getSchedule(session.id))?.generationSeed).toBe(0);
  });

  it("keeps a generated schedule when setup and player saves are unchanged", async () => {
    const session = await createFourPlayerSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => scheduleResponse(session.id) }));
    const generated = await localFairPlayApi.generateSchedule(session);

    const unchangedSetup = await localFairPlayApi.updateSession(session.id, generated.session);
    const firstPlayer = unchangedSetup.players[0];
    const unchangedRoster = await localFairPlayApi.savePlayer(session.id, firstPlayer);

    expect(unchangedSetup.status).toBe("READY");
    expect(unchangedRoster.status).toBe("READY");
    expect(await localFairPlayApi.getSchedule(session.id)).toBeDefined();

    const changedRoster = await localFairPlayApi.savePlayer(session.id, { ...firstPlayer, name: "Updated Player" });
    expect(changedRoster.status).toBe("DRAFT");
    expect(await localFairPlayApi.getSchedule(session.id)).toBeUndefined();
  });

  it("saves a round result and waits for an explicit next-round start", async () => {
    const session = await createFourPlayerSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => multiRoundResponse(session.id) }));
    await localFairPlayApi.generateSchedule(session);
    await localFairPlayApi.startSession(session.id);

    const completed = await localFairPlayApi.completeRound(session.id, {
      roundId: `${session.id}-round-1`,
      results: [{ courtNumber: 1, teamAScore: 21, teamBScore: 17, completedWithoutScore: false }],
      departingPlayerIds: [],
    });

    expect(completed.session.status).toBe("ACTIVE");
    expect(completed.schedule.rounds[0]).toMatchObject({ status: "COMPLETED", completedAt: expect.any(String) });
    expect(completed.schedule.rounds[0].courts[0].result).toMatchObject({ teamAScore: 21, teamBScore: 17, winner: "A" });
    expect(completed.schedule.rounds[1].status).toBe("UPCOMING");
    expect(completed.schedule.rounds.some((round) => round.status === "ACTIVE")).toBe(false);

    const next = await localFairPlayApi.startNextRound(session.id);
    expect(next.schedule.rounds[1].status).toBe("ACTIVE");
  });

  it("keeps completed history and replans with only players who remain", async () => {
    const session = await createFourPlayerSession();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => multiRoundResponse(session.id) })
      .mockResolvedValueOnce({ ok: true, json: async () => multiRoundResponse(session.id, ["p1", "p2", "p3"], 2, 2) });
    vi.stubGlobal("fetch", fetchMock);
    await localFairPlayApi.generateSchedule(session);
    await localFairPlayApi.startSession(session.id);

    const replanned = await localFairPlayApi.completeRound(session.id, {
      roundId: `${session.id}-round-1`,
      results: [{ courtNumber: 1, teamAScore: 12, teamBScore: 12, completedWithoutScore: false }],
      departingPlayerIds: ["p4"],
    });

    expect(replanned.session.players.find((player) => player.id === "p4")).toMatchObject({ participationStatus: "LEFT", leftAfterRoundNumber: 1 });
    expect(replanned.schedule.rounds[0].courts[0].result?.winner).toBe("DRAW");
    expect(replanned.schedule.rounds.slice(1).flatMap((round) => round.courts.flatMap((court) => [...court.teamA, ...court.teamB]))).not.toContain("p4");
    expect(replanned.schedule.rounds[1].status).toBe("UPCOMING");

    const request = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(request.players.map((player: { id: string }) => player.id)).toEqual(["p1", "p2", "p3"]);
    expect(request.continuation).toMatchObject({ next_start_time: "19:15", round_number_offset: 1 });
    expect(request.continuation.player_history).toEqual(expect.arrayContaining([
      { player_id: "p1", rounds_played: 1, rest_count: 0 },
      { player_id: "p2", rounds_played: 1, rest_count: 0 },
    ]));
  });

  it("preserves saved results and departures when automatic replanning fails", async () => {
    const session = await createFourPlayerSession();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => multiRoundResponse(session.id) })
      .mockRejectedValueOnce(new Error("offline")));
    await localFairPlayApi.generateSchedule(session);
    await localFairPlayApi.startSession(session.id);

    await expect(localFairPlayApi.completeRound(session.id, {
      roundId: `${session.id}-round-1`,
      results: [{ courtNumber: 1, completedWithoutScore: true }],
      departingPlayerIds: ["p4"],
    })).rejects.toThrow(/backend could not be reached/i);

    expect((await localFairPlayApi.getSession(session.id))?.players.find((player) => player.id === "p4")?.participationStatus).toBe("LEFT");
    const savedSchedule = await localFairPlayApi.getSchedule(session.id);
    expect(savedSchedule?.rounds).toHaveLength(1);
    expect(savedSchedule?.rounds[0].courts[0].result?.winner).toBe("UNRECORDED");
  });

  it("completes the session when fewer than two active players remain", async () => {
    let session = await localFairPlayApi.createSession({
      name: "Two Player Game", date: "2026-08-21", startTime: "19:00", endTime: "20:00",
      warmupMinutes: 0, cleanupMinutes: 0, roundDurationMinutes: 15, courtCount: 1, playersPerCourt: 2,
    });
    session = await localFairPlayApi.savePlayer(session.id, { id: "p1", name: "One" });
    session = await localFairPlayApi.savePlayer(session.id, { id: "p2", name: "Two" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => multiRoundResponse(session.id, ["p1", "p2"]) });
    vi.stubGlobal("fetch", fetchMock);
    await localFairPlayApi.generateSchedule(session);
    await localFairPlayApi.startSession(session.id);

    const completed = await localFairPlayApi.completeRound(session.id, {
      roundId: `${session.id}-round-1`,
      results: [{ courtNumber: 1, completedWithoutScore: true }],
      departingPlayerIds: ["p2"],
    });

    expect(completed.session.status).toBe("COMPLETED");
    expect(completed.schedule.rounds).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate court results and locks completed session setup", async () => {
    const session = await createFourPlayerSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => multiRoundResponse(session.id, undefined, 1, 1) }));
    await localFairPlayApi.generateSchedule(session);
    await localFairPlayApi.startSession(session.id);

    await expect(localFairPlayApi.completeRound(session.id, {
      roundId: `${session.id}-round-1`,
      results: [
        { courtNumber: 1, completedWithoutScore: true },
        { courtNumber: 1, completedWithoutScore: true },
      ],
      departingPlayerIds: [],
    })).rejects.toThrow(/exactly one result/i);

    const completed = await localFairPlayApi.completeRound(session.id, {
      roundId: `${session.id}-round-1`,
      results: [{ courtNumber: 1, completedWithoutScore: true }],
      departingPlayerIds: [],
    });
    expect(completed.session.status).toBe("COMPLETED");
    await expect(localFairPlayApi.savePlayer(session.id, { name: "Too late" })).rejects.toThrow(/locked after play/i);
    await expect(localFairPlayApi.updateSession(session.id, completed.session)).rejects.toThrow(/locked after play/i);
  });
});
