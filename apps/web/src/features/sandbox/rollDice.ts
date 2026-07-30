import type { DiceRoll } from "@backgammon-trainer/backgammon-engine";
import type { DieValue } from "@backgammon-trainer/backgammon-domain";

export type RandomSource = () => number;

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

export const rollDice = (random: RandomSource = Math.random): DiceRoll => {
  const first = rollSingleDie(random);
  const second = rollSingleDie(random);

  return {
    dice: [first, second] as const
  };
};
