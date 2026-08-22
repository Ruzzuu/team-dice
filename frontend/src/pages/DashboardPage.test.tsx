import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  it("shows the demo session and primary action", async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /new session/i })).toBeInTheDocument();
    expect(await screen.findByText("Friday Night Badminton")).toBeInTheDocument();
    expect(screen.getByText("Less waiting.")).toBeInTheDocument();
  });
});
