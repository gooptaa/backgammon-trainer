import type { Player, Position } from "@backgammon-trainer/backgammon-analysis";

export interface GnuBgBoardPoint {
  readonly gnuPoint: number;
  readonly enginePoint: number;
  readonly rollerCheckerCount: number;
  readonly opponentCheckerCount: number;
}

export interface GnuBgBoardState {
  readonly playerOnRoll: Player;
  readonly points: readonly GnuBgBoardPoint[];
  readonly rollerBar: number;
  readonly opponentBar: number;
  readonly rollerOff: number;
  readonly opponentOff: number;
}

export type TranslatePositionToGnuBgBoardResult =
  | {
      readonly ok: true;
      readonly board: GnuBgBoardState;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

const ENGINE_POINTS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
] as const;

const GNU_POINTS_DESCENDING = [
  24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
] as const;

const getOpponent = (player: Player): Player => {
  return player === "white" ? "black" : "white";
};

export const enginePointToGnuPoint = (playerOnRoll: Player, enginePoint: number): number => {
  return playerOnRoll === "white" ? enginePoint : 25 - enginePoint;
};

export const gnuPointToEnginePoint = (playerOnRoll: Player, gnuPoint: number): number => {
  return playerOnRoll === "white" ? gnuPoint : 25 - gnuPoint;
};

const getTotalCheckers = (position: Position, player: Player): number => {
  let total = position.bar[player] + position.borneOff[player];

  for (const point of ENGINE_POINTS) {
    const occupancy = position.points[point];

    if (occupancy?.player === player) {
      total += occupancy.checkerCount;
    }
  }

  return total;
};

export const translatePositionToGnuBgBoard = (
  position: Position,
  playerOnRoll: Player
): TranslatePositionToGnuBgBoardResult => {
  const opponent = getOpponent(playerOnRoll);
  const rollerTotal = getTotalCheckers(position, playerOnRoll);
  const opponentTotal = getTotalCheckers(position, opponent);

  if (rollerTotal !== 15 || opponentTotal !== 15) {
    return {
      ok: false,
      message: "Position does not account for 15 checkers per side."
    };
  }

  const points = GNU_POINTS_DESCENDING.map((gnuPoint) => {
    const enginePoint = gnuPointToEnginePoint(playerOnRoll, gnuPoint);
    const occupancy = position.points[enginePoint as keyof Position["points"]];

    return {
      gnuPoint,
      enginePoint,
      rollerCheckerCount: occupancy?.player === playerOnRoll ? occupancy.checkerCount : 0,
      opponentCheckerCount: occupancy?.player === opponent ? occupancy.checkerCount : 0
    } satisfies GnuBgBoardPoint;
  });

  return {
    ok: true,
    board: {
      playerOnRoll,
      points,
      rollerBar: position.bar[playerOnRoll],
      opponentBar: position.bar[opponent],
      rollerOff: position.borneOff[playerOnRoll],
      opponentOff: position.borneOff[opponent]
    }
  };
};
