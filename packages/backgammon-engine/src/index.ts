import type { BoardPosition, Player, PointIndex } from "@backgammon-trainer/backgammon-domain";

export interface LegalMove {
  readonly from: PointIndex;
  readonly to: PointIndex;
}

export interface GetLegalMovesInput {
  readonly position: BoardPosition;
  readonly player: Player;
}

/**
 * Returns legal checker moves for a player from a board position.
 *
 * This initial milestone intentionally returns an empty list.
 * A future milestone will replace this stub with rules-driven logic.
 */
export const getLegalMoves = (input: GetLegalMovesInput): readonly LegalMove[] => {
  void input;
  return [];
};
