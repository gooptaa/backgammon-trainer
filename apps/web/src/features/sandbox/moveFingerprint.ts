import type { Move } from "@backgammon-trainer/backgammon-engine";

export const getMoveFingerprint = (move: Move): string => {
  const steps = move.steps
    .map((step) => {
      const hitKey = step.hit === undefined ? "" : `:${step.hit.player}:${step.hit.point}`;
      return `${step.kind}:${step.fromPoint}:${step.toPoint}:${step.dieValue}:${step.dieIndex}:${step.hitsBlot}${hitKey}`;
    })
    .join("|");

  return `${move.player}::${steps}`;
};
