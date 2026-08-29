import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the sample separate from the user's empty workspace", async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /new session/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /no sessions yet/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /complete sample schedule/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view sample/i })).toHaveAttribute("href", "/sessions/demo-friday-badminton");
    expect(screen.queryByText("Friday Night Badminton")).not.toBeInTheDocument();
    expect(screen.getByText("Less waiting.")).toBeInTheDocument();
  });

  it("shows a user session first and calculates real workspace metrics", async () => {
    localStorage.setItem("fairplay.prototype.sessions.v1", JSON.stringify([{
      id: "local-session",
      name: "Community Badminton",
      date: "2030-08-21",
      startTime: "19:00",
      endTime: "20:00",
      warmupMinutes: 0,
      cleanupMinutes: 0,
      roundDurationMinutes: 15,
      courtCount: 1,
      playersPerCourt: 4,
      status: "DRAFT",
      createdAt: "2026-08-20T00:00:00Z",
      players: [{ id: "p1", name: "Edo Bagas" }, { id: "p2", name: "Ari Putra" }],
    }]));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Community Badminton" })).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Workspace summary" });
    expect(within(summary).getByText("Your sessions").nextElementSibling).toHaveTextContent("1");
    expect(within(summary).getByText("Players organized").nextElementSibling).toHaveTextContent("2");
    expect(within(summary).getByText("Average fairness").nextElementSibling).toHaveTextContent("—");
  });
});
