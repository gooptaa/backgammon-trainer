import type { DiceRoll } from "@backgammon-trainer/backgammon-engine";
import type { DieValue, Player } from "@backgammon-trainer/backgammon-domain";

import type { RandomSource } from "./rollDice";

const MIN_RANDOM = 0;
const MAX_RANDOM_EXCLUSIVE = 1;

const normalizeRandom = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < MIN_RANDOM) {
    return MIN_RANDOM;
  }

  if (value >= MAX_RANDOM_EXCLUSIVE) {
    return Number.MIN_VALUE + 1 - Number.EPSILON;
  }

  return value;
};

const rollSingleDie = (random: RandomSource): DieValue => {
  const normalized = normalizeRandom(random());
  return (Math.floor(normalized * 6) + 1) as DieValue;
};

export type OpeningRollResult =
  | {
      readonly outcome: "tie";
      readonly whiteDie: DieValue;
      readonly blackDie: DieValue;
    }
  | {
      readonly outcome: "resolved";
      readonly whiteDie: DieValue;
      readonly blackDie: DieValue;
      readonly startingPlayer: Player;
      readonly dice: DiceRoll;
    };

export const rollOpeningDice = (random: RandomSource = Math.random): OpeningRollResult => {
  const whiteDie = rollSingleDie(random);
  const blackDie = rollSingleDie(random);

  if (whiteDie === blackDie) {
    return {
      outcome: "tie",
      whiteDie,
      blackDie
    };
  }

  return {
    outcome: "resolved",
    whiteDie,
    blackDie,
    startingPlayer: whiteDie > blackDie ? "white" : "black",
    dice: {
      dice: [whiteDie, blackDie]
    }
  };
};
