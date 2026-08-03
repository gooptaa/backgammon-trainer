import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeLegalMoveOutcomes } from "@backgammon-trainer/backgammon-analysis";
import {
  createGameState,
  createTurnRecord,
  type GameSnapshot
} from "@backgammon-trainer/backgammon-engine";
import { STANDARD_STARTING_POSITION } from "@backgammon-trainer/backgammon-domain";
import {
  createControlledFixtureChatModel,
  createFixtureChatModel
} from "@backgammon-trainer/ai-contracts/fixture";
import {
  resolveCoachQuestionContext,
  type CoachRuntime
} from "@backgammon-trainer/backgammon-coach";

import { CoachPanel } from "./CoachPanel";

afterEach(() => {
  cleanup();
});

const NOW = "2026-08-03T12:00:00.000Z";

const runtime: CoachRuntime = {
  createId: (() => {
    let index = 0;
    return () => {
      index += 1;
      return `id-${index}`;
    };
  })(),
  now: () => NOW
};

const snapshot: GameSnapshot = {
  savedAt: NOW,
  gameState: createGameState(STANDARD_STARTING_POSITION, "white"),
  turnHistory: [],
  openingState: {
    phase: "waiting",
    openingTurnPending: false
  }
};

const currentContext = resolveCoachQuestionContext({
  gameReference: "game-1",
  snapshot,
  openingResolved: true,
  gameComplete: false,
  legalMoveOutcomesResult: null
});

const moveOutcomeContext = (() => {
  const outcomes = analyzeLegalMoveOutcomes(snapshot.gameState.position, "white", { dice: [1, 2] });
  if (!outcomes.ok) {
    return currentContext;
  }

  const outcome = outcomes.analysis.outcomes[0];
  if (outcome === undefined) {
    return currentContext;
  }

  return resolveCoachQuestionContext({
    gameReference: "game-1",
    snapshot,
    openingResolved: true,
    gameComplete: false,
    legalMoveOutcomesResult: outcomes,
    selectedMoveOutcome: {
      moveFingerprint: "move-1",
      outcome
    }
  });
})();

const historyContext = (() => {
  const turn = createTurnRecord({
    turnNumber: 12,
    player: "white",
    dice: { dice: [1, 2] },
    outcome: { kind: "pass" },
    positionBefore: snapshot.gameState.position,
    positionAfter: snapshot.gameState.position,
    gameStatusAfter: { state: "in-progress" },
    phase: "normal"
  });

  return resolveCoachQuestionContext({
    gameReference: "game-1",
    snapshot,
    openingResolved: true,
    gameComplete: false,
    legalMoveOutcomesResult: null,
    selectedHistoryTurn: {
      turnRecord: turn
    }
  });
})();

describe("CoachPanel", () => {
  it("renders panel and labeled textarea", () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    expect(screen.getByTestId("coach-panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Ask the coach")).toBeInTheDocument();
  });

  it("shows fixture warning", () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    expect(screen.getByTestId("coach-fixture-warning")).toBeInTheDocument();
  });

  it("shows configured provider status and transparency note", () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={false}
        providerStatus={{
          configured: true,
          mode: "production",
          providerFamily: "openai-compatible",
          providerLabel: "openai-compatible",
          model: "gpt-test",
          message: "Configured"
        }}
      />
    );

    expect(screen.getByTestId("coach-provider-status")).toHaveTextContent("gpt-test");
    expect(screen.getByTestId("coach-provider-transparency")).toBeInTheDocument();
  });

  it("displays no-model message and disables send", () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        fixtureEnabled={false}
      />
    );

    expect(screen.getByTestId("coach-no-model-message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("rejects empty sends", () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("submits with enter and keeps shift+enter as newline", async () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    const input = screen.getByLabelText("Ask the coach");

    fireEvent.change(input, { target: { value: "Line 1" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect((input as HTMLTextAreaElement).value).toContain("Line 1");

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/Fixture coach response/)).toBeInTheDocument();
    });

    expect(screen.getByText(/via fixture-coach/)).toBeInTheDocument();
  });

  it("shows pending state and prevents duplicate send", async () => {
    const controlled = createControlledFixtureChatModel();
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={controlled.model}
        fixtureEnabled={true}
      />
    );

    const input = screen.getByLabelText("Ask the coach");
    fireEvent.change(input, { target: { value: "Question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByTestId("coach-pending-status")).toHaveTextContent("pending");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    controlled.resolve({
      ok: true,
      text: "Fixture coach response. Not strategic advice.",
      model: {
        provider: "fixture",
        model: "fixture-v1",
        adapterVersion: "1",
        mode: "fixture"
      },
      warnings: []
    });

    await waitFor(() => {
      expect(screen.getByText(/Not strategic advice/)).toBeInTheDocument();
    });
  });

  it("shows analysis pending state and disables send for current-position context", () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
        evaluatorConfigured={true}
        analysisPending={true}
      />
    );

    fireEvent.change(screen.getByLabelText("Ask the coach"), { target: { value: "Question" } });

    expect(screen.getByTestId("coach-analysis-pending-status")).toHaveTextContent(
      "Position analysis pending"
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("shows concise model failure states", async () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel({ mode: "rate-limited" })}
        fixtureEnabled={true}
      />
    );

    fireEvent.change(screen.getByLabelText("Ask the coach"), { target: { value: "Question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(screen.getByTestId("coach-failure-status")).toHaveTextContent("rate limited");
    });
  });

  it("shows current-position context label", () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    expect(screen.getByTestId("coach-context-label")).toHaveTextContent("Current position");
  });

  it("updates context label for move outcome and history selection", () => {
    const view = render(
      <CoachPanel
        lineageKey="game-1"
        context={moveOutcomeContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    expect(screen.getByTestId("coach-context-label").textContent).toContain("Move outcome");

    view.rerender(
      <CoachPanel
        lineageKey="game-1"
        context={historyContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    expect(screen.getByTestId("coach-context-label").textContent).toContain("Reviewing turn 12");
  });

  it("new lineage clears conversation", async () => {
    const view = render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    fireEvent.change(screen.getByLabelText("Ask the coach"), { target: { value: "Question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(screen.getByText("You")).toBeInTheDocument();
    });

    view.rerender(
      <CoachPanel
        lineageKey="game-2"
        context={currentContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    expect(screen.getByText("No messages yet.")).toBeInTheDocument();
  });

  it("ignores stale response from prior lineage", async () => {
    const controlled = createControlledFixtureChatModel();
    const view = render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={controlled.model}
        fixtureEnabled={true}
      />
    );

    fireEvent.change(screen.getByLabelText("Ask the coach"), { target: { value: "Question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    view.rerender(
      <CoachPanel
        lineageKey="game-2"
        context={currentContext}
        runtime={runtime}
        model={controlled.model}
        fixtureEnabled={true}
      />
    );

    controlled.resolve({
      ok: true,
      text: "Late response",
      model: {
        provider: "fixture",
        model: "fixture-v1",
        adapterVersion: "1"
      },
      warnings: []
    });

    await waitFor(() => {
      expect(screen.queryByText("Late response")).not.toBeInTheDocument();
    });
  });

  it("allows same-lineage late response to attach", async () => {
    const controlled = createControlledFixtureChatModel();
    const view = render(
      <CoachPanel
        lineageKey="game-1"
        context={currentContext}
        runtime={runtime}
        model={controlled.model}
        fixtureEnabled={true}
      />
    );

    fireEvent.change(screen.getByLabelText("Ask the coach"), { target: { value: "Question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    view.rerender(
      <CoachPanel
        lineageKey="game-1"
        context={historyContext}
        runtime={runtime}
        model={controlled.model}
        fixtureEnabled={true}
      />
    );

    controlled.resolve({
      ok: true,
      text: "Same lineage response",
      model: {
        provider: "fixture",
        model: "fixture-v1",
        adapterVersion: "1"
      },
      warnings: []
    });

    await waitFor(() => {
      expect(screen.getByText("Same lineage response")).toBeInTheDocument();
    });
  });

  it("renders evidence disclosure summary", async () => {
    render(
      <CoachPanel
        lineageKey="game-1"
        context={moveOutcomeContext}
        runtime={runtime}
        model={createFixtureChatModel()}
        fixtureEnabled={true}
      />
    );

    fireEvent.change(screen.getByLabelText("Ask the coach"), { target: { value: "Question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(screen.getByText(/Coach response received/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Evidence details"));

    expect(screen.getByTestId("coach-evidence-row")).toBeInTheDocument();
    expect(screen.getByText(/Context kind/)).toBeInTheDocument();
    expect(screen.getByText(/Curated knowledge entries/)).toBeInTheDocument();
  });
});
