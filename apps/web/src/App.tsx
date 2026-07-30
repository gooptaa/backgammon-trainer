import styles from "./App.module.css";

const coachingPlaceholder = [
  "Move critique placeholder",
  "Hint progression placeholder",
  "Candidate move explanation placeholder"
];

function App(): JSX.Element {
  return (
    <div className={styles.appFrame}>
      <header className={styles.header}>
        <div>
          <h1>Backgammon Trainer</h1>
          <p>
            Mobile-first training shell. Deterministic rules and coaching are not implemented yet.
          </p>
        </div>
        <p className={styles.status} aria-live="polite">
          Server status: <span>mock-connected</span>
        </p>
      </header>

      <main className={styles.mainLayout}>
        <section aria-labelledby="board-workspace-title" className={styles.boardSection}>
          <h2 id="board-workspace-title">Board Workspace</h2>
          <div
            className={styles.boardPlaceholder}
            role="img"
            aria-label="Backgammon board placeholder"
          >
            <div className={styles.boardHalf} />
            <div className={styles.barStripe} />
            <div className={styles.boardHalf} />
          </div>
          <div className={styles.controlsRow}>
            <button type="button">Roll Dice (placeholder)</button>
            <button type="button">Submit Move (placeholder)</button>
          </div>
        </section>

        <aside aria-labelledby="coaching-panel-title" className={styles.coachingPanel}>
          <h2 id="coaching-panel-title">Coaching Panel</h2>
          <p>Provider-neutral coaching boundary placeholder. No real model call is performed.</p>
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
