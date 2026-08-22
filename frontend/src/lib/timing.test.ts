import { describe, expect, it } from "vitest";
import type { SessionInput } from "../types";
import { calculateTimingPreview } from "./timing";

const input: SessionInput = {
  name: "Friday Badminton",
  date: "2026-08-21",
  startTime: "19:00",
  endTime: "21:00",
  warmupMinutes: 10,
  cleanupMinutes: 5,
  roundDurationMinutes: 15,
  courtCount: 2,
  playersPerCourt: 4,
};

describe("calculateTimingPreview", () => {
  it("calculates capacity and complete rounds", () => {
    expect(calculateTimingPreview(input)).toEqual({
      totalMinutes: 120,
      usableMinutes: 105,
      numberOfRounds: 7,
      unusedMinutes: 0,
      capacity: 8,
      isValid: true,
    });
  });

  it("rejects an end time before the start time", () => {
    expect(calculateTimingPreview({ ...input, endTime: "18:00" }).isValid).toBe(false);
  });
});
