import type { Move } from "@backgammon-trainer/backgammon-engine";

const formatPoint = (point: number | "bar" | "off"): string => {
  if (point === "bar") {
    return "Bar";
  }

  if (point === "off") {
    return "Off";
  }

  return String(point);
};

const formatStep = (move: Move, stepIndex: number): string => {
  const step = move.steps[stepIndex];

  if (step === undefined) {
    return "";
  }

  if (step.kind === "enter-from-bar") {
    return `${formatPoint("bar")} -> ${formatPoint(step.toPoint)}${step.hitsBlot ? " (hit)" : ""}`;
  }

  if (step.kind === "bear-off") {
    return `${formatPoint(step.fromPoint)} -> ${formatPoint("off")}`;
  }

  return `${formatPoint(step.fromPoint)} -> ${formatPoint(step.toPoint)}${step.hitsBlot ? " (hit)" : ""}`;
};

export const formatMove = (move: Move): string => {
  return move.steps.map((_, index) => formatStep(move, index)).join(", ");
};
