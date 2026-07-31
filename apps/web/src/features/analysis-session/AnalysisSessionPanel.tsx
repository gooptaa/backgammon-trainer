import {
  summarizeAnalysisSession,
  type AnalysisRecord,
  type AnalysisSession
} from "@backgammon-trainer/backgammon-analysis-session";
import { getMoveFingerprint } from "@backgammon-trainer/backgammon-analysis";

import type { AnalysisCaptureFailure, AnalysisEvaluatorStatus } from "./analysisCapture";
import { formatMove } from "../sandbox/formatMove";
import styles from "./AnalysisSessionPanel.module.css";

type AnalysisSessionPanelProps = {
  session: AnalysisSession | null;
  evaluatorStatus: AnalysisEvaluatorStatus;
  lastCaptureFailure: AnalysisCaptureFailure | null;
};

const SHORT_ID_LENGTH = 12;

const shorten = (value: string): string => {
  return value.length <= SHORT_ID_LENGTH ? value : `${value.slice(0, SHORT_ID_LENGTH)}...`;
};

const getPlayerLabel = (player: "white" | "black"): string => {
  return player === "white" ? "White" : "Black";
};

const formatDice = (dice: readonly [number, number]): string => {
  return `${dice[0]}-${dice[1]}`;
};

const getChosenMoveDetail = (record: AnalysisRecord): string => {
  if (record.rankedMoveAnalysis.kind !== "evaluated") {
    return "Unevaluated";
  }

  if (record.chosenMove === null) {
    return "Unevaluated";
  }

  const chosenMoveFingerprint = getMoveFingerprint(record.chosenMove);
  const chosenFingerprint = record.rankedMoveAnalysis.rankedMoves.find(
    (row) => row.moveFingerprint === chosenMoveFingerprint
  );

  if (chosenFingerprint === undefined) {
    return "Unevaluated";
  }

  return `Fixture Rank ${chosenFingerprint.rank}; Fixture Score ${chosenFingerprint.normalizedScore}; Fixture Loss ${chosenFingerprint.lossFromBest}`;
};

export function AnalysisSessionPanel({
  session,
  evaluatorStatus,
  lastCaptureFailure
}: AnalysisSessionPanelProps): JSX.Element {
  if (session === null) {
    return (
      <section
        className={styles.panel}
        aria-labelledby="analysis-session-title"
        data-testid="analysis-session-panel"
      >
        <h2 id="analysis-session-title">Analysis Session</h2>
        <p className={styles.meta}>Analysis capture is not enabled for this runtime.</p>
      </section>
    );
  }

  const summary = summarizeAnalysisSession(session);

  return (
    <section
      className={styles.panel}
      aria-labelledby="analysis-session-title"
      data-testid="analysis-session-panel"
    >
      <h2 id="analysis-session-title">Analysis Session</h2>
      <p className={styles.warning} data-testid="analysis-session-fixture-warning">
        Development fixture scores - not strategic evaluation.
      </p>
      <p className={styles.meta} data-testid="analysis-session-status">
        Session status: active
      </p>
      <p className={styles.meta} data-testid="analysis-session-id">
        Session ID: {shorten(session.sessionId)}
      </p>
      <p className={styles.meta} data-testid="analysis-session-game-reference">
        Game reference: {shorten(session.gameSnapshotReference.gameReference)}
      </p>
      <p className={styles.meta} data-testid="analysis-session-record-count">
        Captured records: {summary.recordCount}
      </p>
      <p className={styles.meta} data-testid="analysis-session-turn-numbers">
        Analyzed turns:{" "}
        {summary.analyzedTurnNumbers.length === 0 ? "none" : summary.analyzedTurnNumbers.join(", ")}
      </p>
      <p className={styles.meta}>Complete coverage records: {summary.completeCoverageCount}</p>
      <p className={styles.meta}>Partial coverage records: {summary.partialCoverageCount}</p>
      <p className={styles.meta}>Evaluated chosen moves: {summary.evaluatedChosenMoves}</p>
      <p className={styles.meta}>Unevaluated chosen moves: {summary.unevaluatedChosenMoves}</p>
      <p className={styles.meta} data-testid="analysis-session-evaluator-status">
        Evaluator status: {evaluatorStatus}
      </p>
      {lastCaptureFailure === null ? null : (
        <p className={styles.failure} data-testid="analysis-session-capture-failure">
          Capture failure: {lastCaptureFailure.reason}. {lastCaptureFailure.message}
        </p>
      )}

      {session.records.length === 0 ? (
        <p className={styles.meta} data-testid="analysis-session-empty">
          No committed turn analysis captured yet.
        </p>
      ) : (
        <ol className={styles.recordList} data-testid="analysis-session-record-list">
          {session.records.map((record) => (
            <li key={`analysis-record-${record.turnNumber}`} className={styles.recordRow}>
              <p className={styles.meta}>
                Turn {record.turnNumber}: {getPlayerLabel(record.player)}{" "}
                {formatDice(record.rankedMoveAnalysis.dice.dice)}
              </p>
              <p className={styles.meta}>
                Committed: {record.chosenMove === null ? "Pass" : formatMove(record.chosenMove)}
              </p>
              <p className={styles.meta}>Chosen move score: {getChosenMoveDetail(record)}</p>
              <p className={styles.meta}>Coverage: {record.rankedMoveAnalysis.coverage}</p>
              <p className={styles.meta}>
                Provider: {record.evaluatorProvenance.provider}{" "}
                {record.evaluatorProvenance.providerVersion}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
