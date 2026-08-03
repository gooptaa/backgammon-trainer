# Backgammon Coach

## Purpose

Provide deterministic, provider-neutral coaching conversation orchestration that composes existing engine, analysis, and analysis-session evidence without changing rule authority.

## Responsibilities

- Define immutable in-memory coaching conversation/message contracts.
- Resolve explicit coaching question context from application state.
- Build bounded deterministic evidence bundles from trusted game and analysis data.
- Select bounded question-relevant legal move evidence without introducing strategic verdicts.
- Resolve recommendation-support authority from evaluator evidence before model generation.
- Define knowledge-retriever boundary with no-op, fixture, and local curated-content implementations.
- Build provider-neutral chat-model requests from conversation + evidence.
- Orchestrate single-request coaching submission flow with explicit failure handling.
- Resolve evidence-backed historical review targets for "last move" questions without replacing explicit history selection.
- Preserve immutable historical-review context per submission even if current gameplay continues.

## Allowed Dependencies

- `@backgammon-trainer/ai-contracts`
- `@backgammon-trainer/backgammon-engine`
- `@backgammon-trainer/backgammon-analysis`
- `@backgammon-trainer/backgammon-analysis-session`
- `@backgammon-trainer/backgammon-knowledge`

## Forbidden Dependencies

- `@backgammon-trainer/web`
- `@backgammon-trainer/server`
- Provider SDKs, browser storage adapters, or Node process adapters

## Public API

- Conversation model helpers (`createCoachConversation`, append message helpers).
- Context model + resolver (`resolveCoachQuestionContext`, `deriveCurrentTurnContext`).
- Evidence builder (`buildCoachEvidence`) with bounded deterministic output.
- Prompt builder (`buildCoachModelRequest`) for `ChatModel`.
- Recommendation-support evidence (`recommendationSupport`) for current-position claims.
- Historical review evidence (`historicalReviewEvidence`) with deterministic played-move coverage limits.
- Knowledge interfaces (`CoachKnowledgeRetriever`) and local/fixture/no-op retrievers.
- Submission orchestration (`submitCoachQuestion`) for host-layer integration, including optional on-demand history-turn ranked-analysis hydration.

## Last Move Review Behavior

- Explicit selected history turn remains highest precedence for historical review.
- If no history turn is selected and the question asks about the last move, submission resolves to the latest committed checker-play turn in the same lineage.
- Staged/uncommitted moves are never treated as historical review targets.
- Historical review uses committed turn `positionBefore` and `dice` as the decision-time authority.
- Played-move rank/loss claims are emitted only when the played move is evaluator-covered.
- Partial evaluator coverage is surfaced explicitly and never upgraded to authoritative best-move claims.

## Non-goals

- Legal move generation or board transitions.
- Evaluator process integration.
- Conversation persistence.
- Real provider adapters, credentials, or OAuth.
- Voice or audio orchestration.

## Future Roadmap

- Add additional server-hosted adapters using the same `ChatModel` contract (first OpenAI-compatible slice is now implemented in `apps/server`).
- Add independent conversation persistence boundary.
- Add richer knowledge retrieval and response-quality controls.
