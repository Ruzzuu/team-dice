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
    expect(await screen.findByRole("button", { name: /continue to play/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /continue to play/i }));
    expect(await screen.findByRole("button", { name: /^start session$/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /^start session$/i }));
    expect(screen.getByRole("dialog", { name: /start this session/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /start now/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /session active/i })).toBeDisabled());
    expect(screen.getByText(/settings and roster editing are locked/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reshuffle teams/i })).not.toBeInTheDocument();
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

  it("explains why schedule generation is unavailable", async () => {
    localStorage.setItem("fairplay.prototype.sessions.v1", JSON.stringify([{ ...session, players: [session.players[0]] }]));
    renderPage();

    expect(await screen.findByRole("button", { name: /generate schedule/i })).toBeDisabled();
    expect(screen.getByText(/add 1 more player to generate/i)).toBeInTheDocument();
  });

  it("uses the progress steps for guided navigation and explains locked steps", async () => {
    const user = userEvent.setup();
    localStorage.setItem("fairplay.prototype.sessions.v1", JSON.stringify([{ ...session, players: [] }]));
    renderPage();

    await user.click(await screen.findByRole("button", { name: /players ready/i }));
    expect(await screen.findByRole("heading", { name: /^player roster$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /schedule needs previous step/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/add 2 more players to unlock schedule/i);
    await user.click(screen.getByRole("button", { name: /setup/i }));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });

  it("opens the add-player dialog from the Players step primary action", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /players complete/i }));
    await user.click(screen.getAllByRole("button", { name: /^add player$/i })[0]);
    expect(screen.getByRole("dialog", { name: /add a player/i })).toBeInTheDocument();
  });

  it("shows the backend field error returned with a 422 response", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ detail: [{ loc: ["body", "players", 0, "skill_rating"], msg: "Input should be less than or equal to 5" }] }),
    }));
    renderPage();

    await user.click(await screen.findByRole("button", { name: /generate schedule/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/players · player 1 · skill rating: input should be less than or equal to 5/i);
  });

  it("confirms and replaces a generated schedule with a different arrangement", async () => {
    const user = userEvent.setup();
    const readySession: Session = {
      ...session,
      status: "READY",
      players: [...session.players, { id: "p3", name: "Player Three", skillRating: 3 }, { id: "p4", name: "Player Four", skillRating: 3 }],
    };
    localStorage.setItem("fairplay.prototype.sessions.v1", JSON.stringify([readySession]));
    localStorage.setItem("fairplay.prototype.schedules.v1", JSON.stringify({ [session.id]: {
      sessionId: session.id,
      generationSeed: 0,
      isDemo: false,
      rounds: [{ id: "round-1", number: 1, startTime: "19:00", endTime: "19:15", status: "UPCOMING", courts: [{ courtNumber: 1, teamA: ["p1"], teamB: ["p2"] }], restingPlayerIds: ["p3", "p4"] }],
      fairness: { score: 100, spreadMinutes: 0, averageMinutes: 15, players: [] },
    } }));
    const baseResponse = schedulerResponse();
    const alternate = { ...baseResponse, rounds: [{
      ...baseResponse.rounds[0],
      courts: [{ court_number: 1, team_a: ["p1"], team_b: ["p3"] }],
      resting_player_ids: ["p2", "p4"],
    }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => alternate }));
    renderPage();

    await user.click(await screen.findByRole("button", { name: /reshuffle teams/i }));
    expect(screen.getByRole("dialog", { name: /reshuffle all teams/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /keep current/i }));
    expect(screen.queryByRole("dialog", { name: /reshuffle all teams/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reshuffle teams/i }));
    await user.click(screen.getByRole("button", { name: /replace schedule/i }));

    expect(await screen.findByText(/different fair arrangement has replaced/i)).toBeInTheDocument();
    expect(screen.getByText("Player Three")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("fairplay.prototype.schedules.v1") ?? "{}")[session.id].generationSeed).toBe(1);
  });

  it("closes the settings dialog with Escape", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /^settings$/i }));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument());
  });
});
