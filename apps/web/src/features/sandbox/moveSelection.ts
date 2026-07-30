import type { Move, MoveStep } from "@backgammon-trainer/backgammon-engine";
import type { PointIndex } from "@backgammon-trainer/backgammon-domain";

export type SelectableSource = PointIndex | "bar";
export type SelectableDestination = PointIndex | "off";

export interface SelectedStep {
  readonly fromPoint: SelectableSource;
  readonly toPoint: SelectableDestination;
}

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

  if (completedMoves.length !== 1) {
    return null;
  }

  const hasLongerAlternative = candidates.some((move) => move.steps.length > selectedSteps.length);

  return hasLongerAlternative ? null : (completedMoves[0] ?? null);
};
