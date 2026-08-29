import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Schedule, Session } from "../types";
import { ScheduleBoard } from "./ScheduleBoard";

const session: Session = {
  id: "name-format-session",
  name: "Name Format Session",
  date: "2026-08-21",
  startTime: "19:00",
  endTime: "19:15",
  warmupMinutes: 0,
  cleanupMinutes: 0,
  roundDurationMinutes: 15,
  courtCount: 1,
  playersPerCourt: 2,
  status: "READY",
  createdAt: "2026-08-20T00:00:00Z",
  players: [
    { id: "edo", name: "edo bagas sehat walafiat" },
    { id: "mas", name: "Mas fid" },
    { id: "rest", name: "adi cahyo luar biasa" },
  ],
};

const schedule: Schedule = {
  sessionId: session.id,
  isDemo: false,
  generationSeed: 0,
  rounds: [{
    id: "round-1",
    number: 1,
    startTime: "19:00",
    endTime: "19:15",
    courts: [{ courtNumber: 1, teamA: ["edo"], teamB: ["mas"] }],
    restingPlayerIds: ["rest"],
    status: "UPCOMING",
  }],
  fairness: {
    score: 100,
    spreadMinutes: 0,
    averageMinutes: 10,
    players: [],
  },
};

describe("ScheduleBoard player presentation", () => {
  it("shows abbreviated names and uppercase profile initials", () => {
    render(<ScheduleBoard session={session} schedule={schedule} />);

    expect(screen.getByText("edo bagas S.W.")).toBeInTheDocument();
    expect(screen.getByText("adi cahyo L.B.")).toBeInTheDocument();
    expect(screen.getByText("EB")).toBeInTheDocument();
    expect(screen.getByText("MF")).toBeInTheDocument();
    expect(screen.getByText("AC")).toBeInTheDocument();
    expect(screen.getByTitle("edo bagas sehat walafiat")).toHaveAttribute("aria-label", "edo bagas sehat walafiat");
    expect(screen.getByText("FairPlay generated")).toBeInTheDocument();
  });
});
