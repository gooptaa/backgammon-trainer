import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App shell", () => {
  it("renders board and coaching placeholders", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Backgammon Trainer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Board Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Coaching Panel" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Backgammon board placeholder" })).toBeInTheDocument();
  });
});
