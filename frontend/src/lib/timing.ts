import type { SessionInput, TimingPreview } from "../types";

function minutesFromTime(value: string): number {
  if (!/^\d{2}:\d{2}$/.test(value)) return Number.NaN;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function calculateTimingPreview(input: SessionInput): TimingPreview {
  const start = minutesFromTime(input.startTime);
  const end = minutesFromTime(input.endTime);
  const totalMinutes = end - start;
  const usableMinutes = totalMinutes - input.warmupMinutes - input.cleanupMinutes;
  const isValid = Number.isFinite(totalMinutes) && totalMinutes > 0 && usableMinutes >= 0 && input.roundDurationMinutes > 0;
  const numberOfRounds = isValid ? Math.floor(usableMinutes / input.roundDurationMinutes) : 0;

  return {
    totalMinutes: isValid ? totalMinutes : 0,
    usableMinutes: isValid ? usableMinutes : 0,
    numberOfRounds,
    unusedMinutes: isValid ? usableMinutes % input.roundDurationMinutes : 0,
    capacity: Math.max(0, input.courtCount * input.playersPerCourt),
    isValid,
  };
}

export function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
