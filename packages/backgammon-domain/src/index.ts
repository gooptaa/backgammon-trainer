export type PlayerColor = "white" | "black";

export type PointIndex =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24;

export interface PointLocation {
  kind: "point";
  point: PointIndex;
}

export interface BarLocation {
  kind: "bar";
}

export interface BearOffLocation {
  kind: "bearOff";
}

export type CheckerLocation = PointLocation | BarLocation | BearOffLocation;

export interface CheckerStack {
  owner: PlayerColor;
  count: number;
}

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface DiceRoll {
  dice: readonly [DieValue, DieValue];
  isDouble: boolean;
}

export interface BoardPosition {
  points: Partial<Record<PointIndex, CheckerStack>>;
  bar: Record<PlayerColor, number>;
  borneOff: Record<PlayerColor, number>;
}

export interface Move {
  player: PlayerColor;
  from: CheckerLocation;
  to: CheckerLocation;
  distance: number;
  hitsBlot: boolean;
}

export interface MoveSequence {
  player: PlayerColor;
  roll: DiceRoll;
  moves: readonly Move[];
}

export type CubeOwner = PlayerColor | "center";

export interface CubeState {
  value: 1 | 2 | 4 | 8 | 16 | 32 | 64;
  owner: CubeOwner;
  canDouble: Record<PlayerColor, boolean>;
}

export interface GameState {
  playerToMove: PlayerColor;
  board: BoardPosition;
  cube: CubeState;
  currentRoll?: DiceRoll;
  matchLength?: number;
  score?: Record<PlayerColor, number>;
}

export const createInitialCubeState = (): CubeState => ({
  value: 1,
  owner: "center",
  canDouble: {
    white: true,
    black: true
  }
});
