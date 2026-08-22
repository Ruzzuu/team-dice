import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../types";
import { SessionPage } from "./SessionPage";

const session: Session = {
  id: "session-under-test",
  name: "Test Session",
  date: "2026-08-21",
  startTime: "19:00",
  endTime: "20:00",
  warmupMinutes: 0,
  cleanupMinutes: 0,
  roundDurationMinutes: 15,
  courtCount: 1,
  playersPerCourt: 2,
  status: "DRAFT",
  createdAt: "2026-08-20T00:00:00Z",
  players: [
    { id: "p1", name: "Player One", skillRating: 3 },
    { id: "p2", name: "Player Two", skillRating: 3 },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/sessions/${session.id}`]}>
      <Routes><Route path="/sessions/:sessionId" element={<SessionPage />} /></Routes>
    </MemoryRouter>,
  );
}

function schedulerResponse() {
  return {
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
  };
}

describe("SessionPage lifecycle", () => {
  beforeEach(() => {
    localStorage.setItem("fairplay.prototype.sessions.v1", JSON.stringify([session]));
  });

  it("generates a schedule and starts the session after confirmation", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => schedulerResponse() }));
    renderPage();

    await user.click(await screen.findByRole("button", { name: /generate schedule/i }));
    expect(await screen.findByRole("button", { name: /^start session$/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /^start session$/i }));
    expect(screen.getByRole("dialog", { name: /start this session/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /start now/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /session active/i })).toBeDisabled());
    expect(screen.getByText(/settings and roster editing are locked/i)).toBeInTheDocument();
  });

  it("opens settings and saves editable session details", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /^settings$/i }));
    const nameInput = screen.getByLabelText("Session name");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Session");
    await user.click(screen.getByRole("button", { name: /save settings/i }));

    expect(await screen.findByRole("heading", { name: "Updated Session" })).toBeInTheDocument();
  });
});
