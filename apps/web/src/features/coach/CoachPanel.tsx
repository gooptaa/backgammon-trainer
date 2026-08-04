import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ChatModel } from "@backgammon-trainer/ai-contracts";
import type { RankedLegalMoveAnalysis } from "@backgammon-trainer/backgammon-analysis";
import type { AnalysisSession } from "@backgammon-trainer/backgammon-analysis-session";
import {
  createCoachConversation,
  createLocalCoachKnowledgeRetriever,
  formatCoachContextLabel,
  submitCoachQuestion,
  type CoachContextKind,
  type CoachEvidenceBundle,
  type CoachKnowledgeExcerpt,
  type CoachKnowledgeRetriever,
  type CoachQuestionContext,
  type CoachRuntime,
  type GameReviewTurnHydrationResult
} from "@backgammon-trainer/backgammon-coach";
import type { CoachProviderStatus } from "./serverChatModel";

import styles from "./CoachPanel.module.css";

interface CoachPanelProps {
  readonly lineageKey: string;
  readonly context: CoachQuestionContext;
  readonly progressContext?: Extract<CoachQuestionContext, { kind: "progress-profile" }>;
  readonly model?: ChatModel;
  readonly runtime: CoachRuntime;
  readonly fixtureEnabled: boolean;
  readonly knowledgeRetriever?: CoachKnowledgeRetriever;
  readonly providerStatus?: CoachProviderStatus;
  readonly evaluatorConfigured?: boolean;
  readonly analysisPending?: boolean;
  readonly analysisSession?: AnalysisSession;
  readonly resolveHistoryTurnAnalysis?: (input: {
    question: string;
    context: Extract<CoachQuestionContext, { kind: "history-turn" }>;
  }) => Promise<RankedLegalMoveAnalysis | undefined>;
  readonly resolveGameReviewTurnAnalysis?: (input: {
    question: string;
    context: Extract<CoachQuestionContext, { kind: "game-review" }>;
    turnRecord: Extract<CoachQuestionContext, { kind: "history-turn" }>["turnRecord"];
  }) => Promise<GameReviewTurnHydrationResult>;
}

interface EvidenceRow {
  readonly id: string;
  readonly contextKind: CoachContextKind;
  readonly evidence: CoachEvidenceBundle;
  readonly knowledge: readonly CoachKnowledgeExcerpt[];
  readonly knowledgeWarning?: string;
}

const toFailureMessage = (reason: string, providerMessage?: string): string => {
  const normalizedProviderMessage = providerMessage?.toLowerCase() ?? "";

  if (reason === "unavailable") {
    if (
      normalizedProviderMessage.includes("config") ||
      normalizedProviderMessage.includes("disabled")
    ) {
      return "Coach provider is not configured.";
    }

    return "Coach unavailable. Try again.";
  }

  if (reason === "authentication-failed") {
    return "Coach authentication failed.";
  }

  if (reason === "rate-limited") {
    return "Coach rate limited. Try again shortly.";
  }

  if (reason === "timeout") {
    return "Coach request timed out. Try again.";
  }

  if (reason === "invalid-response") {
    return "Coach returned invalid output.";
  }

  return "Coach request failed. Try again.";
};

const summarizeEvidence = (row: EvidenceRow): readonly string[] => {
  const details: string[] = [
    `Context kind: ${row.contextKind}`,
    `Warnings: ${row.evidence.warnings.length}`
  ];

  if (row.evidence.positionFacts !== undefined) {
    details.push(
      `Pip diff (white-black): ${row.evidence.positionFacts.relationship.pipCountDifferenceWhiteMinusBlack}`
    );
  }

  if (row.evidence.legalMoveSelection !== undefined) {
    details.push(`Legal moves total: ${row.evidence.legalMoveSelection.totalLegalMoves}`);
    details.push(`Selected move rows: ${row.evidence.legalMoveSelection.selectedLegalMoves}`);
    details.push(`Omitted legal moves: ${row.evidence.legalMoveSelection.omittedLegalMoves}`);
    details.push(
      `Coach evidence coverage: ${row.evidence.legalMoveSelection.coachEvidenceCoverage}`
    );

    for (const reference of row.evidence.legalMoveSelection.questionMoveReferences) {
      details.push(`Question move reference ${reference.notation}: ${reference.resolution}`);
    }
  } else if (row.evidence.legalMoveEvidence !== undefined) {
    details.push(`Selected move rows: ${row.evidence.legalMoveEvidence.length}`);
  }

  if (row.evidence.committedTurnEvidence !== undefined) {
    details.push(`Committed turn: ${row.evidence.committedTurnEvidence.turnNumber}`);
    details.push(`Committed turn player: ${row.evidence.committedTurnEvidence.player}`);
    details.push(
      `Committed turn dice: ${row.evidence.committedTurnEvidence.dice[0]}-${row.evidence.committedTurnEvidence.dice[1]}`
    );
    details.push(`Played move: ${row.evidence.committedTurnEvidence.outcome}`);
    details.push(`Has analysis record: ${row.evidence.committedTurnEvidence.hasAnalysisRecord}`);

    const chosen = row.evidence.committedTurnEvidence.evaluatedChosenMove;
    if (chosen?.evaluatorRank !== undefined) {
      details.push(`Played move rank: ${chosen.evaluatorRank}`);
    }
    if (chosen?.normalizedScore !== undefined) {
      details.push(`Played move normalized score: ${chosen.normalizedScore}`);
    }
    if (chosen?.lossFromTopScoredMove !== undefined) {
      details.push(`Played move loss from best: ${chosen.lossFromTopScoredMove}`);
    }

    const committedClassification = row.evidence.committedTurnEvidence.moveClassification;
    if (committedClassification?.status === "classified") {
      details.push(`Move classification: ${committedClassification.label}`);
      details.push(
        `Move classification loss from best: ${committedClassification.normalizedLossFromBest.toFixed(3)}`
      );
      details.push(`Move classification policy: ${committedClassification.policyVersion}`);
    } else if (committedClassification?.status === "unclassified") {
      details.push(`Move classification: unclassified (${committedClassification.reason})`);
      details.push(`Move classification policy: ${committedClassification.policyVersion}`);
    }
  }

  if (row.evidence.historicalReviewEvidence !== undefined) {
    details.push(`Review target source: ${row.evidence.historicalReviewEvidence.selectionSource}`);
    details.push(`Review turn: ${row.evidence.historicalReviewEvidence.turnNumber}`);
    details.push(`Review played move: ${row.evidence.historicalReviewEvidence.playedMove}`);
    details.push(
      `Played move evaluated: ${row.evidence.historicalReviewEvidence.playedMoveEvaluated}`
    );

    if (row.evidence.historicalReviewEvidence.evaluatedLegalMoveCount !== undefined) {
      details.push(
        `Evaluated legal moves: ${row.evidence.historicalReviewEvidence.evaluatedLegalMoveCount}`
      );
    }
    if (row.evidence.historicalReviewEvidence.unevaluatedLegalMoveCount !== undefined) {
      details.push(
        `Unevaluated legal moves: ${row.evidence.historicalReviewEvidence.unevaluatedLegalMoveCount}`
      );
    }

    if (row.evidence.historicalReviewEvidence.bestEvaluatedMove !== undefined) {
      const best = row.evidence.historicalReviewEvidence.bestEvaluatedMove;
      details.push(`Best evaluated move: ${best.moveLabel}`);
      details.push(`Best evaluated rank: ${best.evaluatorRank}`);
      details.push(`Best evaluated normalized score: ${best.normalizedScore}`);
    }

    if (row.evidence.historicalReviewEvidence.moveClassification?.status === "classified") {
      const historicalClassification = row.evidence.historicalReviewEvidence.moveClassification;
      details.push(`Historical classification: ${historicalClassification.label}`);
      details.push(
        `Historical loss from best: ${historicalClassification.normalizedLossFromBest.toFixed(3)}`
      );
      details.push(`Historical classification policy: ${historicalClassification.policyVersion}`);
    } else if (
      row.evidence.historicalReviewEvidence.moveClassification?.status === "unclassified"
    ) {
      const historicalClassification = row.evidence.historicalReviewEvidence.moveClassification;
      details.push(`Historical classification: unclassified (${historicalClassification.reason})`);
      details.push(`Historical classification policy: ${historicalClassification.policyVersion}`);
    }

    for (const limitation of row.evidence.historicalReviewEvidence.limitations) {
      details.push(`Review limitation: ${limitation}`);
    }
  }

  if (row.evidence.gameReviewEvidence !== undefined) {
    const review = row.evidence.gameReviewEvidence;
    details.push(`Review scope: ${review.reviewScope}`);
    details.push(`Review source: ${review.selectionSource}`);
    details.push(`Committed turn boundary: ${review.committedTurnBoundary}`);
    details.push(`Reviewed player scope: ${review.reviewedPlayerScope}`);
    details.push(`Ownership status: ${review.ownershipStatus}`);
    details.push(`Committed turns considered: ${review.committedTurnCount}`);
    details.push(`Supported checker-play decisions: ${review.supportedCheckerPlayDecisionCount}`);
    details.push(`Unsupported decisions: ${review.unsupportedDecisionCount}`);
    details.push(`Evaluated played moves: ${review.evaluatedChosenMoveCount}`);
    details.push(`Unevaluated played moves: ${review.unevaluatedChosenMoveCount}`);
    details.push(`Classified best count: ${review.bestCount}`);
    details.push(`Classified reasonable count: ${review.reasonableCount}`);
    details.push(`Classified mistake count: ${review.mistakeCount}`);
    details.push(`Classified major mistake count: ${review.majorMistakeCount}`);
    details.push(`Unclassified count: ${review.unclassifiedCount}`);
    details.push(`Complete coverage count: ${review.completeCoverageCount}`);
    details.push(`Partial coverage count: ${review.partialCoverageCount}`);
    details.push(`Missing coverage count: ${review.missingCoverageCount}`);
    details.push(`Fixture coverage count: ${review.fixtureCoverageCount}`);
    details.push(`Failed coverage count: ${review.failedCoverageCount}`);
    details.push(`Unavailable coverage count: ${review.unavailableCoverageCount}`);

    for (const keyDecision of review.keyDecisions) {
      details.push(`Key decision turn ${keyDecision.turnNumber}: ${keyDecision.playedMove}`);
      if (keyDecision.moveClassification.status === "classified") {
        details.push(`Key decision classification: ${keyDecision.moveClassification.label}`);
      } else {
        details.push(
          `Key decision classification: unclassified (${keyDecision.moveClassification.reason})`
        );
      }
      if (keyDecision.normalizedScoreDifference !== undefined) {
        details.push(
          `Key decision score difference: ${keyDecision.normalizedScoreDifference.toFixed(3)}`
        );
      }
      if (keyDecision.strongestAlternative !== undefined) {
        details.push(
          `Key decision strongest alternative: ${keyDecision.strongestAlternative.moveLabel}`
        );
      }
      details.push(`Key decision note: ${keyDecision.note}`);
    }

    for (const limitation of review.limitations) {
      details.push(`Review limitation: ${limitation}`);
    }
  }

  if (row.evidence.progressEvidence !== undefined) {
    const progress = row.evidence.progressEvidence;
    details.push(`Progress policy: ${progress.policyId} ${progress.policyVersion}`);
    details.push(`Recent window size: ${progress.recentWindowSize}`);
    details.push(`Recent best/reasonable: ${progress.counts.recentWindow.bestOrReasonable}`);
    details.push(`Recent mistakes: ${progress.counts.recentWindow.mistake}`);
    details.push(`Recent major mistakes: ${progress.counts.recentWindow.majorMistake}`);
    details.push(`Recent unclassified: ${progress.counts.recentWindow.unclassified}`);
    details.push(`Recent eligible decisions: ${progress.counts.recentWindow.totalEligible}`);
    details.push(`Recent classified decisions: ${progress.counts.recentWindow.totalClassified}`);
    details.push(`Recent games represented: ${progress.gamesRepresented.recentWindow}`);
    details.push(`Trend status: ${progress.trend.status}`);
    for (const limitation of progress.limitations) {
      details.push(`Progress limitation: ${limitation}`);
    }
  }

  if (row.evidence.evaluatorProvenance !== undefined) {
    details.push(`Evaluator provider: ${row.evidence.evaluatorProvenance.provider}`);
    details.push(`Evaluator coverage: ${row.evidence.evaluatorCoverage ?? "unknown"}`);
  }

  if (row.evidence.moveClassificationPolicy !== undefined) {
    details.push(
      `Classification policy: ${row.evidence.moveClassificationPolicy.id} ${row.evidence.moveClassificationPolicy.version}`
    );
  }

  if (row.knowledge.length > 0) {
    details.push(`Curated knowledge entries: ${row.knowledge.length}`);
    for (const entry of row.knowledge) {
      details.push(`Knowledge: ${entry.id} - ${entry.title}`);
      details.push(
        `Knowledge reasons: ${(entry.selectionReasons ?? []).map((reason) => `${reason.kind}:${reason.value}`).join(", ")}`
      );
    }
  } else {
    details.push("Curated knowledge entries: 0");
  }

  if (row.knowledgeWarning !== undefined) {
    details.push(`Knowledge warning: ${row.knowledgeWarning}`);
  }

  if (row.evidence.evaluatorProvenance?.provider.includes("fixture")) {
    details.push("Fixture evaluator detected.");
  }

  return details;
};

export function CoachPanel({
  lineageKey,
  context,
  progressContext,
  model,
  runtime,
  fixtureEnabled,
  knowledgeRetriever,
  providerStatus,
  evaluatorConfigured = false,
  analysisPending = false,
  analysisSession,
  resolveHistoryTurnAnalysis,
  resolveGameReviewTurnAnalysis
}: CoachPanelProps): JSX.Element {
  const [conversation, setConversation] = useState(() =>
    createCoachConversation({ id: runtime.createId(), createdAt: runtime.now() })
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [evidenceRows, setEvidenceRows] = useState<readonly EvidenceRow[]>([]);
  const lineageVersionRef = useRef(0);

  useEffect(() => {
    lineageVersionRef.current += 1;
    setConversation(createCoachConversation({ id: runtime.createId(), createdAt: runtime.now() }));
    setDraft("");
    setPending(false);
    setFailure(null);
    setStatusText(null);
    setEvidenceRows([]);
  }, [lineageKey, runtime]);

  const contextLabel = useMemo(() => formatCoachContextLabel(context), [context]);
  const hasModel = model !== undefined;
  const currentPositionAnalysisPending =
    context.kind === "current-position" && evaluatorConfigured && analysisPending;

  const onSubmit = (): void => {
    if (pending) {
      return;
    }

    if (currentPositionAnalysisPending) {
      setFailure("Position analysis is still running. Submit once analysis is ready.");
      return;
    }

    if (!hasModel) {
      setFailure("No coach model configured.");
      return;
    }

    const requestLineageVersion = lineageVersionRef.current;
    setPending(true);
    setFailure(null);
    setStatusText("Sending coach request...");

    const retriever = knowledgeRetriever ?? createLocalCoachKnowledgeRetriever();

    void submitCoachQuestion({
      model,
      knowledgeRetriever: retriever,
      runtime,
      conversation,
      question: draft,
      context,
      ...(progressContext === undefined ? {} : { progressContext }),
      ...(analysisSession === undefined ? {} : { analysisSession }),
      ...(resolveHistoryTurnAnalysis === undefined ? {} : { resolveHistoryTurnAnalysis }),
      ...(resolveGameReviewTurnAnalysis === undefined ? {} : { resolveGameReviewTurnAnalysis }),
      pending: false
    })
      .then((result) => {
        if (requestLineageVersion !== lineageVersionRef.current) {
          return;
        }

        if (!result.ok) {
          setConversation(result.conversation);
          if (result.response?.ok === false) {
            setFailure(toFailureMessage(result.response.reason, result.response.message));
          } else {
            setFailure(result.message);
          }
          setStatusText(null);
          setPending(false);
          return;
        }

        setConversation(result.conversation);
        setEvidenceRows((current) => [
          ...current,
          {
            id: result.requestId,
            contextKind: result.context.kind,
            evidence: result.evidence,
            knowledge: result.knowledge,
            ...(result.knowledgeWarning === undefined
              ? {}
              : { knowledgeWarning: result.knowledgeWarning })
          }
        ]);
        setDraft("");
        setStatusText("Coach response received.");
        setPending(false);
      })
      .catch(() => {
        if (requestLineageVersion !== lineageVersionRef.current) {
          return;
        }

        setFailure("Coach request failed. Try again.");
        setStatusText(null);
        setPending(false);
      });
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="coach-title" data-testid="coach-panel">
      <h2 id="coach-title">Coach</h2>
      {fixtureEnabled ? (
        <p className={styles.warning} data-testid="coach-fixture-warning">
          Development fixture coach - responses are not strategic advice.
        </p>
      ) : null}
      {!hasModel ? (
        <p className={styles.warning} data-testid="coach-no-model-message">
          No coach model configured.
        </p>
      ) : null}
      {providerStatus !== undefined ? (
        <p className={styles.context} data-testid="coach-provider-status">
          Coach provider: {providerStatus.providerLabel}
          {providerStatus.model === null ? "" : ` (${providerStatus.model})`}
          {providerStatus.configured ? "" : " - not configured"}
        </p>
      ) : null}
      {providerStatus?.mode === "production" && providerStatus.configured ? (
        <p className={styles.status} data-testid="coach-provider-transparency">
          Asking the coach sends bounded conversation context, deterministic evidence, and curated
          knowledge excerpts to the configured provider.
        </p>
      ) : null}
      <p className={styles.context} data-testid="coach-context-label">
        {contextLabel}
      </p>
      {currentPositionAnalysisPending ? (
        <p className={styles.status} data-testid="coach-analysis-pending-status" aria-live="polite">
          Position analysis pending...
        </p>
      ) : null}

      <div className={styles.messages} aria-label="Coach conversation" data-testid="coach-messages">
        {conversation.messages.length === 0 ? (
          <p className={styles.message}>No messages yet.</p>
        ) : (
          conversation.messages.map((message) => (
            <p key={message.id} className={styles.message}>
              <span className={message.role === "user" ? styles.userLabel : styles.coachLabel}>
                {message.role === "user" ? "You" : "Coach"}
              </span>
              {message.text}
              {message.role === "coach" && message.model !== undefined ? (
                <span className={styles.modelMeta}>
                  via {message.model.provider} / {message.model.model}
                </span>
              ) : null}
            </p>
          ))
        )}
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="coach-question">Ask the coach</label>
        <textarea
          id="coach-question"
          className={styles.textarea}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={onInputKeyDown}
          disabled={pending}
        />
        <div className={styles.actions}>
          <button
            type="submit"
            disabled={
              pending || !hasModel || draft.trim().length === 0 || currentPositionAnalysisPending
            }
          >
            Send
          </button>
        </div>
      </form>

      <p className={styles.status} aria-live="polite" data-testid="coach-pending-status">
        {pending ? "Coach request pending..." : (statusText ?? "")}
      </p>
      <p
        className={styles.failure}
        role="status"
        aria-live="polite"
        data-testid="coach-failure-status"
      >
        {failure ?? ""}
      </p>

      <details className={styles.disclosure}>
        <summary>Evidence details</summary>
        {evidenceRows.length === 0 ? (
          <p className={styles.status}>No response evidence yet.</p>
        ) : (
          evidenceRows.map((row) => (
            <div key={row.id} data-testid="coach-evidence-row">
              <p className={styles.status}>Request {row.id}</p>
              <ul className={styles.detailList}>
                {summarizeEvidence(row).map((detail, detailIndex) => (
                  <li key={`${row.id}-${detailIndex}-${detail}`}>{detail}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </details>
    </section>
  );
}
