import type {
  EvaluateLegalMovesResult,
  EvaluationScoreScale,
  AnalyzeLegalMoveOutcomesResult,
  LegalMoveOutcome
} from "@backgammon-trainer/backgammon-analysis";
import { POINT_INDEXES, type Player } from "@backgammon-trainer/backgammon-domain";

import { formatMove } from "./formatMove";
import { getMoveFingerprint } from "./moveFingerprint";
import styles from "./LegalMoveOutcomesPanel.module.css";

interface LegalMoveOutcomesPanelProps {
  openingRollPhase: "waiting" | "tied" | "resolved";
  gameComplete: boolean;
  turnDiceAssigned: boolean;
  isInspectingHistory: boolean;
  analysisResult: AnalyzeLegalMoveOutcomesResult | null;
  evaluatorConfigured: boolean;
  evaluatorPending: boolean;
  evaluationResult: EvaluateLegalMovesResult | null;
  selectedOutcomeKey: string | null;
  previewActive: boolean;
  onSelectOutcome: (outcomeKey: string) => void;
  onReturnToCurrentGame: () => void;
}

const getPlayerLabel = (player: Player): string => {
  return player === "white" ? "White" : "Black";
};

const getOpponent = (player: Player): Player => {
  return player === "white" ? "black" : "white";
};

const formatDelta = (value: number): string => {
  return value > 0 ? `+${value}` : String(value);
};

const formatStepMetadata = (outcome: LegalMoveOutcome): readonly string[] => {
  return outcome.move.steps.map((step, index) => {
    const hitText = step.hit === undefined ? "" : `; hit ${step.hit.player} at ${step.hit.point}`;
    return `${index + 1}. ${step.kind}; ${step.fromPoint} -> ${step.toPoint}; die ${step.dieValue}; die index ${step.dieIndex}; hits blot ${step.hitsBlot}${hitText}`;
  });
};

const getOccupiedPointRows = (outcome: LegalMoveOutcome): readonly string[] => {
  return POINT_INDEXES.flatMap((point) => {
    const occupancy = outcome.positionAfter.points[point];

    if (occupancy === null) {
      return [];
    }

    return [`${point}: ${occupancy.player} x${occupancy.checkerCount}`];
  });
};

const formatEvaluationFailureMessage = (result: EvaluateLegalMovesResult): string => {
  if (result.ok) {
    return "";
  }

  if (result.reason === "factual-analysis-failed") {
    return "Evaluator contract preview unavailable because factual outcome analysis failed.";
  }

  if (result.reason === "unavailable") {
    return "Evaluator unavailable for this environment.";
  }

  if (result.reason === "unsupported-position") {
    return "Evaluator does not support this position.";
  }

  if (result.reason === "timeout") {
    return "Evaluator timed out.";
  }

  if (result.reason === "invalid-provider-result") {
    return "Evaluator returned invalid data.";
  }

  return "Evaluator failed for this turn.";
};

const formatScaleLabel = (scale: EvaluationScoreScale): string => {
  if (scale.kind === "relative") {
    return "relative";
  }

  if (scale.kind === "equity") {
    return "equity (points)";
  }

  return `probability [${scale.range[0]}, ${scale.range[1]}]`;
};

export function LegalMoveOutcomesPanel({
  openingRollPhase,
  gameComplete,
  turnDiceAssigned,
  isInspectingHistory,
  analysisResult,
  evaluatorConfigured,
  evaluatorPending,
  evaluationResult,
  selectedOutcomeKey,
  previewActive,
  onSelectOutcome,
  onReturnToCurrentGame
}: LegalMoveOutcomesPanelProps): JSX.Element {
  const evaluatorSection =
    !isInspectingHistory && openingRollPhase === "resolved" && !gameComplete && turnDiceAssigned ? (
      <section className={styles.evaluatorSection} data-testid="evaluator-contract-preview">
        <h3>Evaluator Contract Preview</h3>
        {!evaluatorConfigured ? (
          <p className={styles.meta} data-testid="evaluator-not-configured">
            No move evaluator configured.
          </p>
        ) : evaluatorPending ? (
          <p className={styles.meta} data-testid="evaluator-pending">
            Evaluator Contract Preview running...
          </p>
        ) : evaluationResult === null ? (
          <p className={styles.meta}>Evaluator Contract Preview unavailable for this turn.</p>
        ) : !evaluationResult.ok ? (
          <p className={styles.meta} data-testid="evaluator-failure">
            {formatEvaluationFailureMessage(evaluationResult)}
          </p>
        ) : evaluationResult.analysis.kind === "no-legal-moves" ? (
          <p className={styles.meta} data-testid="evaluator-no-legal-moves">
            No legal checker move. Evaluator invocation skipped.
          </p>
        ) : (
          <>
            {evaluationResult.analysis.provenance.provider.includes("fixture") ? (
              <p className={styles.warning} data-testid="evaluator-fixture-warning">
                Development fixture scores - not strategic evaluation.
              </p>
            ) : null}
            <p className={styles.meta} data-testid="evaluator-coverage">
              Coverage: {evaluationResult.analysis.coverage}
            </p>
            <p className={styles.meta} data-testid="evaluator-scale">
              Score scale: {formatScaleLabel(evaluationResult.analysis.scoreScale)}
            </p>
            <p className={styles.meta} data-testid="evaluator-provider">
              Provider: {evaluationResult.analysis.provenance.provider}
            </p>
            <p className={styles.meta} data-testid="evaluator-version">
              Provider version: {evaluationResult.analysis.provenance.providerVersion}; adapter
              version: {evaluationResult.analysis.provenance.adapterVersion}
            </p>
            <p className={styles.meta} data-testid="evaluator-unevaluated-count">
              Unevaluated legal moves: {evaluationResult.analysis.unevaluatedMoves.length}
            </p>
            {evaluationResult.analysis.warnings.length > 0 ? (
              <ul className={styles.detailList} data-testid="evaluator-warnings">
                {evaluationResult.analysis.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <ol className={styles.outcomeList} data-testid="evaluator-ranked-list">
              {evaluationResult.analysis.rankedMoves.map((rankedMove) => (
                <li key={`ranked-${rankedMove.moveFingerprint}`} className={styles.outcomeRow}>
                  <button
                    type="button"
                    className={styles.outcomeButton}
                    onClick={() => onSelectOutcome(rankedMove.moveFingerprint)}
                  >
                    Preview ranked move
                  </button>
                  <p className={styles.meta}>Fixture Rank: {rankedMove.rank}</p>
                  <p className={styles.meta}>
                    Move:{" "}
                    <span className={styles.moveText}>{formatMove(rankedMove.outcome.move)}</span>
                  </p>
                  <p className={styles.meta}>Fixture Score: {rankedMove.normalizedScore}</p>
                  <p className={styles.meta}>Fixture Loss: {rankedMove.lossFromBest}</p>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    ) : null;

  if (isInspectingHistory) {
    return (
      <section aria-labelledby="legal-move-outcomes-title" className={styles.panel}>
        <h2 id="legal-move-outcomes-title">Legal Move Outcomes</h2>
        <p className={styles.meta} data-testid="legal-outcomes-history-disabled">
          Return to the current game to inspect legal move outcomes.
        </p>
        {evaluatorSection}
      </section>
    );
  }

  if (openingRollPhase !== "resolved") {
    return (
      <section aria-labelledby="legal-move-outcomes-title" className={styles.panel}>
        <h2 id="legal-move-outcomes-title">Legal Move Outcomes</h2>
        <p className={styles.meta} data-testid="legal-outcomes-opening-unresolved">
          Opening roll must resolve before legal move outcomes are available.
        </p>
        {evaluatorSection}
      </section>
    );
  }

  if (gameComplete) {
    return (
      <section aria-labelledby="legal-move-outcomes-title" className={styles.panel}>
        <h2 id="legal-move-outcomes-title">Legal Move Outcomes</h2>
        <p className={styles.meta} data-testid="legal-outcomes-game-complete">
          Game complete. No further legal move analysis is available.
        </p>
        {evaluatorSection}
      </section>
    );
  }

  if (!turnDiceAssigned) {
    return (
      <section aria-labelledby="legal-move-outcomes-title" className={styles.panel}>
        <h2 id="legal-move-outcomes-title">Legal Move Outcomes</h2>
        <p className={styles.meta} data-testid="legal-outcomes-no-dice">
          Roll or assign dice to inspect legal move outcomes.
        </p>
        {evaluatorSection}
      </section>
    );
  }

  if (analysisResult === null) {
    return (
      <section aria-labelledby="legal-move-outcomes-title" className={styles.panel}>
        <h2 id="legal-move-outcomes-title">Legal Move Outcomes</h2>
        <p className={styles.meta}>Outcome analysis unavailable for this turn context.</p>
        {evaluatorSection}
      </section>
    );
  }

  if (!analysisResult.ok) {
    return (
      <section aria-labelledby="legal-move-outcomes-title" className={styles.panel}>
        <h2 id="legal-move-outcomes-title">Legal Move Outcomes</h2>
        <p className={styles.meta} data-testid="legal-outcomes-analysis-error">
          Move outcome analysis failed: {analysisResult.message}
        </p>
        {evaluatorSection}
      </section>
    );
  }

  const outcomes = analysisResult.analysis.outcomes;

  if (outcomes.length === 0) {
    return (
      <section aria-labelledby="legal-move-outcomes-title" className={styles.panel}>
        <h2 id="legal-move-outcomes-title">Legal Move Outcomes</h2>
        <p className={styles.meta} data-testid="legal-outcomes-no-legal-moves">
          No legal checker move.
        </p>
        {evaluatorSection}
      </section>
    );
  }

  const player = analysisResult.analysis.player;
  const opponent = getOpponent(player);
  const selectedOutcome =
    selectedOutcomeKey === null
      ? null
      : (outcomes.find((outcome) => getMoveFingerprint(outcome.move) === selectedOutcomeKey) ??
        null);

  return (
    <section aria-labelledby="legal-move-outcomes-title" className={styles.panel}>
      <h2 id="legal-move-outcomes-title">Legal Move Outcomes</h2>
      <p className={styles.meta} data-testid="legal-outcomes-count">
        Complete legal moves: {outcomes.length}. Ordering reflects engine output and is not move
        ranking.
      </p>
      {previewActive ? (
        <p className={styles.meta} data-testid="legal-outcomes-preview-active">
          Move Outcome Preview is active on the main board.
        </p>
      ) : null}

      <ol className={styles.outcomeList} data-testid="legal-outcomes-list">
        {outcomes.map((outcome) => {
          const outcomeKey = getMoveFingerprint(outcome.move);
          const selected = outcomeKey === selectedOutcomeKey;

          return (
            <li key={outcomeKey} className={styles.outcomeRow}>
              <button
                type="button"
                className={styles.outcomeButton}
                aria-pressed={selected}
                onClick={() => onSelectOutcome(outcomeKey)}
              >
                Preview move
              </button>
              <p className={styles.meta}>
                Move: <span className={styles.moveText}>{formatMove(outcome.move)}</span>
              </p>
              <p className={styles.meta}>Steps: {outcome.move.steps.length}</p>
              <p className={styles.meta}>
                {getPlayerLabel(player)} pips:{" "}
                {formatDelta(outcome.featureDelta[player].pipCountDelta)}
              </p>
              <p className={styles.meta}>
                {getPlayerLabel(player)} blots:{" "}
                {formatDelta(outcome.featureDelta[player].blotCountDelta)}
              </p>
              <p className={styles.meta}>
                {getPlayerLabel(player)} made points:{" "}
                {formatDelta(outcome.featureDelta[player].madePointCountDelta)}
              </p>
              <p className={styles.meta}>
                {getPlayerLabel(opponent)} bar:{" "}
                {formatDelta(outcome.featureDelta[opponent].barCountDelta)}
              </p>
              <p className={styles.meta}>
                Status: {outcome.featureDelta.relationship.contactStatusBefore} -&gt;{" "}
                {outcome.featureDelta.relationship.contactStatusAfter}
              </p>
            </li>
          );
        })}
      </ol>

      {selectedOutcome !== null ? (
        <section className={styles.detailPanel} data-testid="legal-outcome-details">
          <h3>Selected Outcome Details</h3>
          <p className={styles.meta} data-testid="legal-outcome-selected-move">
            Move: <span className={styles.moveText}>{formatMove(selectedOutcome.move)}</span>
          </p>
          <p className={styles.meta}>
            Relationship: {selectedOutcome.analysisAfter.relationship.contactStatus}, leader{" "}
            {selectedOutcome.analysisAfter.relationship.pipCountLeader}
          </p>
          <p className={styles.meta}>
            Pip diff (white-black):{" "}
            {selectedOutcome.analysisAfter.relationship.pipCountDifferenceWhiteMinusBlack}
          </p>

          <h4>Canonical Steps</h4>
          <ul className={styles.detailList} data-testid="legal-outcome-step-metadata">
            {formatStepMetadata(selectedOutcome).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <h4>Resulting Features</h4>
          <p className={styles.meta}>
            White pips: {selectedOutcome.analysisAfter.white.pipCount}, black pips:{" "}
            {selectedOutcome.analysisAfter.black.pipCount}
          </p>
          <p className={styles.meta}>
            White blots: {selectedOutcome.analysisAfter.white.blotCount}, black blots:{" "}
            {selectedOutcome.analysisAfter.black.blotCount}
          </p>
          <p className={styles.meta}>
            White made points: {selectedOutcome.analysisAfter.white.madePointCount}, black made
            points: {selectedOutcome.analysisAfter.black.madePointCount}
          </p>
          <p className={styles.meta}>
            White bar/off: {selectedOutcome.analysisAfter.white.checkersOnBar}/
            {selectedOutcome.analysisAfter.white.checkersBorneOff}, black bar/off:{" "}
            {selectedOutcome.analysisAfter.black.checkersOnBar}/
            {selectedOutcome.analysisAfter.black.checkersBorneOff}
          </p>

          <h4>Feature Deltas (after - before)</h4>
          <p className={styles.meta}>
            White pip delta: {formatDelta(selectedOutcome.featureDelta.white.pipCountDelta)}, black
            pip delta: {formatDelta(selectedOutcome.featureDelta.black.pipCountDelta)}
          </p>
          <p className={styles.meta}>
            White made-point delta:{" "}
            {formatDelta(selectedOutcome.featureDelta.white.madePointCountDelta)}, black made-point
            delta: {formatDelta(selectedOutcome.featureDelta.black.madePointCountDelta)}
          </p>
          <p className={styles.meta}>
            White blot delta: {formatDelta(selectedOutcome.featureDelta.white.blotCountDelta)},
            black blot delta: {formatDelta(selectedOutcome.featureDelta.black.blotCountDelta)}
          </p>

          <h4>Resulting Position Snapshot</h4>
          <ul className={styles.detailList} data-testid="legal-outcome-position-rows">
            {getOccupiedPointRows(selectedOutcome).map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
          <p className={styles.meta} data-testid="legal-outcome-bar-summary">
            Bar: white {selectedOutcome.positionAfter.bar.white}, black{" "}
            {selectedOutcome.positionAfter.bar.black}
          </p>
          <p className={styles.meta} data-testid="legal-outcome-off-summary">
            Borne off: white {selectedOutcome.positionAfter.borneOff.white}, black{" "}
            {selectedOutcome.positionAfter.borneOff.black}
          </p>

          <button type="button" onClick={onReturnToCurrentGame}>
            Return to Current Game
          </button>
        </section>
      ) : null}
      {evaluatorSection}
    </section>
  );
}
