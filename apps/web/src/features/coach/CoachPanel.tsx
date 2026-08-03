import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ChatModel } from "@backgammon-trainer/ai-contracts";
import {
  createCoachConversation,
  createNoopCoachKnowledgeRetriever,
  formatCoachContextLabel,
  submitCoachQuestion,
  type CoachContextKind,
  type CoachEvidenceBundle,
  type CoachKnowledgeRetriever,
  type CoachQuestionContext,
  type CoachRuntime
} from "@backgammon-trainer/backgammon-coach";

import styles from "./CoachPanel.module.css";

interface CoachPanelProps {
  readonly lineageKey: string;
  readonly context: CoachQuestionContext;
  readonly model?: ChatModel;
  readonly runtime: CoachRuntime;
  readonly fixtureEnabled: boolean;
  readonly knowledgeRetriever?: CoachKnowledgeRetriever;
}

interface EvidenceRow {
  readonly id: string;
  readonly contextKind: CoachContextKind;
  readonly evidence: CoachEvidenceBundle;
}

const toFailureMessage = (reason: string): string => {
  if (reason === "unavailable") {
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

  if (row.evidence.legalMoveEvidence !== undefined) {
    details.push(`Legal move rows: ${row.evidence.legalMoveEvidence.length}`);
  }

  if (row.evidence.evaluatorProvenance !== undefined) {
    details.push(`Evaluator provider: ${row.evidence.evaluatorProvenance.provider}`);
    details.push(`Evaluator coverage: ${row.evidence.evaluatorCoverage ?? "unknown"}`);
  }

  if (row.evidence.evaluatorProvenance?.provider.includes("fixture")) {
    details.push("Fixture evaluator detected.");
  }

  return details;
};

export function CoachPanel({
  lineageKey,
  context,
  model,
  runtime,
  fixtureEnabled,
  knowledgeRetriever
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

  const onSubmit = (): void => {
    if (pending) {
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

    const retriever = knowledgeRetriever ?? createNoopCoachKnowledgeRetriever();

    void submitCoachQuestion({
      model,
      knowledgeRetriever: retriever,
      runtime,
      conversation,
      question: draft,
      context,
      pending: false
    })
      .then((result) => {
        if (requestLineageVersion !== lineageVersionRef.current) {
          return;
        }

        if (!result.ok) {
          setConversation(result.conversation);
          if (result.response?.ok === false) {
            setFailure(toFailureMessage(result.response.reason));
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
            evidence: result.evidence
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
      <p className={styles.context} data-testid="coach-context-label">
        {contextLabel}
      </p>

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
          <button type="submit" disabled={pending || !hasModel || draft.trim().length === 0}>
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
                {summarizeEvidence(row).map((detail) => (
                  <li key={`${row.id}-${detail}`}>{detail}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </details>
    </section>
  );
}
