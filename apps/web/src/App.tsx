import styles from "./App.module.css";
import { STANDARD_STARTING_POSITION } from "@backgammon-trainer/backgammon-domain";

import { BackgammonBoard } from "./features/board/BackgammonBoard";

const coachingPlaceholder = [
  "Post-move critique summary placeholder",
  "Hint ladder placeholder (light -> direct)",
  "Candidate comparison placeholder"
];

function App(): JSX.Element {
  return (
    <div className={styles.appFrame}>
      <header className={styles.header}>
        <div>
          <h1>Backgammon Trainer</h1>
          <p>
            Study-oriented board view with deterministic position rendering and coaching panel
            placeholders.
          </p>
        </div>
        <p className={styles.status} aria-live="polite">
          Server status: <span>mock-connected</span>
        </p>
      </header>

      <main className={styles.mainLayout}>
        <section aria-labelledby="board-workspace-title" className={styles.boardSection}>
          <h2 id="board-workspace-title">Board Workspace</h2>
          <BackgammonBoard position={STANDARD_STARTING_POSITION} />
          <div className={styles.controlsRow}>
            <button type="button" disabled>
              Hint
            </button>
            <button type="button" disabled>
              Show Best Move
            </button>
          </div>
        </section>

        <aside aria-labelledby="coaching-panel-title" className={styles.coachingPanel}>
          <h2 id="coaching-panel-title">Coaching Panel</h2>
          <p>
            Structured coaching output will appear here. Current content is static and intentionally
            non-interactive.
          </p>
          <ul>
            {coachingPlaceholder.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

export default App;
