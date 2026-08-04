import type { Move, MoveStep } from "@backgammon-trainer/backgammon-engine";
import type { PointIndex } from "@backgammon-trainer/backgammon-domain";

export type SelectableSource = PointIndex | "bar";
export type SelectableDestination = PointIndex | "off";

export interface SelectedStep {
  readonly fromPoint: SelectableSource;
  readonly toPoint: SelectableDestination;
}

export const formatSelectablePoint = (point: SelectableSource | SelectableDestination): string => {
  if (point === "bar") {
    return "Bar";
  }

  if (point === "off") {
    return "Off";
  }

  return String(point);
};

const matchesSelectedStep = (moveStep: MoveStep, selectedStep: SelectedStep): boolean => {
  return moveStep.fromPoint === selectedStep.fromPoint && moveStep.toPoint === selectedStep.toPoint;
};

export const moveStartsWithSelectedSteps = (
  move: Move,
  selectedSteps: readonly SelectedStep[]
): boolean => {
  if (selectedSteps.length > move.steps.length) {
    return false;
  }

  return selectedSteps.every((selectedStep, index) => {
    const moveStep = move.steps[index];

    return moveStep !== undefined && matchesSelectedStep(moveStep, selectedStep);
  });
};

export const filterCandidateMoves = (
  legalMoves: readonly Move[],
  selectedSteps: readonly SelectedStep[]
): readonly Move[] => {
  return legalMoves.filter((move) => moveStartsWithSelectedSteps(move, selectedSteps));
};

export const getSelectableSources = (
  candidates: readonly Move[],
  selectedSteps: readonly SelectedStep[]
): readonly SelectableSource[] => {
  const index = selectedSteps.length;
  const sources = new Set<SelectableSource>();

  for (const move of candidates) {
    const step = move.steps[index];

    if (step !== undefined) {
      sources.add(step.fromPoint);
    }
  }

  return [...sources];
};

export const getSelectableDestinations = (
  candidates: readonly Move[],
  selectedSteps: readonly SelectedStep[],
  source: SelectableSource
): readonly SelectableDestination[] => {
  const index = selectedSteps.length;
  const destinations = new Set<SelectableDestination>();

  for (const move of candidates) {
    const step = move.steps[index];

    if (step !== undefined && step.fromPoint === source) {
      destinations.add(step.toPoint);
    }
  }

  return [...destinations];
};

export const getSingleCompletedMove = (
  candidates: readonly Move[],
  selectedSteps: readonly SelectedStep[]
): Move | null => {
  const completedMoves = candidates.filter((move) => move.steps.length === selectedSteps.length);

  if (completedMoves.length === 0) {
    return null;
  }

  const hasLongerAlternative = candidates.some((move) => move.steps.length > selectedSteps.length);

  // Multiple engine moves can represent the same visible checker play when the
  // dice may be consumed in either order (especially oversized bear-offs).
  // Candidates have already been filtered by the selected source/destination
  // prefix, so either completed move produces the selected board transition.
  return hasLongerAlternative ? null : (completedMoves[0] ?? null);
};

export const formatSelectedStepsBreadcrumb = (selectedSteps: readonly SelectedStep[]): string => {
  const firstStep = selectedSteps[0];

  if (firstStep === undefined) {
    return "";
  }

  const labels: string[] = [formatSelectablePoint(firstStep.fromPoint)];

  for (const step of selectedSteps) {
    labels.push(formatSelectablePoint(step.toPoint));
  }

  return labels.join(" -> ");
};

export const formatSelectedStep = (step: SelectedStep): string => {
  return `${formatSelectablePoint(step.fromPoint)} -> ${formatSelectablePoint(step.toPoint)}`;
};
