import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { NewSessionPage } from "./NewSessionPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sessions/new"]}>
      <Routes>
        <Route path="/sessions/new" element={<NewSessionPage />} />
        <Route path="/sessions/:sessionId" element={<p>Player setup destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NewSessionPage", () => {
  beforeEach(() => localStorage.clear());

  it("shows actionable validation for a missing name", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /continue to players/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Give your session a name");
    expect(screen.getByLabelText("Session name")).toHaveAttribute("aria-invalid", "true");
  });

  it("saves the real fields and continues to player setup", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Session name"), "Sunday Badminton");
    await user.click(screen.getByRole("button", { name: /continue to players/i }));

    expect(await screen.findByText("Player setup destination")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("fairplay.prototype.sessions.v1") ?? "[]")[0].name).toBe("Sunday Badminton");
  });
});
