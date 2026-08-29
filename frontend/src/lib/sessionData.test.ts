import { describe, expect, it } from "vitest";
import { getStorageRecoveryNotice, readStoredSchedules, readStoredSessions, SCHEDULE_STORAGE_KEY, SESSION_STORAGE_BACKUP_KEY, SESSION_STORAGE_KEY } from "./sessionData";

describe("stored session migration", () => {
  it("repairs an older draft while preserving its name and roster", () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([{
      id: "old-draft",
      name: "Old Friday Game",
      date: "2026-08-21",
      startTime: "19:00",
      endTime: "21:00",
      status: "DRAFT",
      players: [{ id: "p1", name: "Edo Bagas" }, { id: "p2", name: "Ari Putra", skillRating: "4" }],
      createdAt: "2026-08-01T00:00:00Z",
    }]));

    const [repaired] = readStoredSessions();

    expect(repaired.name).toBe("Old Friday Game");
    expect(repaired.players.map((player) => player.name)).toEqual(["Edo Bagas", "Ari Putra"]);
    expect(repaired).toMatchObject({ warmupMinutes: 0, cleanupMinutes: 0, roundDurationMinutes: 15, courtCount: 1, playersPerCourt: 4 });
    expect(repaired.recoveryNotice).toMatch(/restored/i);
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? "[]")[0].roundDurationMinutes).toBe(15);
  });

  it("repairs duplicate IDs and invalid availability without losing valid players", () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([{
      id: "old-draft",
      name: "Old Game",
      date: "2026-08-21",
      startTime: "19:00",
      endTime: "21:00",
      warmupMinutes: 0,
      cleanupMinutes: 0,
      roundDurationMinutes: 15,
      courtCount: 1,
      playersPerCourt: 2,
      status: "DRAFT",
      players: [
        { id: "same", name: "One", availableFrom: "20:00", availableUntil: "19:00" },
        { id: "same", name: "Two" },
      ],
      createdAt: "2026-08-01T00:00:00Z",
    }]));

    const [repaired] = readStoredSessions();

    expect(repaired.players).toHaveLength(2);
    expect(new Set(repaired.players.map((player) => player.id)).size).toBe(2);
    expect(repaired.players[0].availableFrom).toBeUndefined();
    expect(repaired.recoveryNotice).toMatch(/duplicate player identifiers/i);
  });

  it("backs up irrecoverable storage and exposes a visible recovery notice", () => {
    localStorage.setItem(SESSION_STORAGE_KEY, "not-json");

    expect(readStoredSessions()).toEqual([]);
    expect(localStorage.getItem(SESSION_STORAGE_BACKUP_KEY)).toBe("not-json");
    expect(getStorageRecoveryNotice()).toMatch(/corrupted session data/i);
  });

  it("migrates previously generated schedules to seed zero", () => {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify({ old: {
      sessionId: "old",
      isDemo: false,
      rounds: [],
      fairness: { score: 100, spreadMinutes: 0, averageMinutes: 0, players: [] },
    } }));

    expect(readStoredSchedules().old.generationSeed).toBe(0);
    expect(JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY) ?? "{}").old.generationSeed).toBe(0);
  });
});
