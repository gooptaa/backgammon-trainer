import type { DiceRoll } from "@backgammon-trainer/backgammon-engine";

import styles from "./DiceDisplay.module.css";

interface DiceDisplayProps {
  dice: DiceRoll | null;
}

export function DiceDisplay({ dice }: DiceDisplayProps): JSX.Element {
  return (
    <div
      className={styles.root}
      aria-label={dice === null ? "Dice: not rolled" : `Dice: ${dice.dice[0]} and ${dice.dice[1]}`}
      data-testid="dice-display"
    >
      <span className={styles.label}>Dice</span>
      <div className={styles.values}>
        <span className={styles.die} aria-label={`Die 1 value ${dice?.dice[0] ?? "not set"}`}>
          {dice?.dice[0] ?? "-"}
        </span>
        <span className={styles.die} aria-label={`Die 2 value ${dice?.dice[1] ?? "not set"}`}>
          {dice?.dice[1] ?? "-"}
        </span>
      </div>
    </div>
  );
}
