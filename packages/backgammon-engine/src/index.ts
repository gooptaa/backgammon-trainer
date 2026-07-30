import type { BoardPosition, Player, PointIndex } from "@backgammon-trainer/backgammon-domain";

/**
 * High-level category for an individual move step.
 * These variants allow ordinary moves, hits, bar entry, and bearing off.
 */
export type MoveStepKind = "point-to-point" | "enter-from-bar" | "bear-off";

/**
 * Atomic movement within a turn.
 * Future legality logic will emit one or more steps to describe full turns.
 */
export interface MoveStep {
  readonly kind: MoveStepKind;
  readonly fromPoint: PointIndex | "bar";
  readonly toPoint: PointIndex | "off";
  readonly dieValue: 1 | 2 | 3 | 4 | 5 | 6;
  readonly hitsBlot: boolean;
}

/**
 * A complete candidate turn for a player.
 * Doubles and multi-step turns are represented as multiple ordered steps.
 */
export interface Move {
  readonly player: Player;
  readonly steps: readonly MoveStep[];
}

/**
 * Result container returned by the legal-move engine API.
 * Includes candidate turn list and optional non-fatal diagnostics.
 */
export interface LegalMoveResult {
  readonly moves: readonly Move[];
  readonly warnings?: readonly string[];
}

export interface GetLegalMovesInput {
  readonly position: BoardPosition;
  readonly player: Player;
}

/**
 * Returns legal checker moves for a player from a board position.
 *
 * This milestone intentionally returns an empty move collection.
 * A future milestone will replace this stub with rules-driven logic.
 */
export const getLegalMoves = (input: GetLegalMovesInput): LegalMoveResult => {
  void input;
  return {
    moves: []
  };
};
