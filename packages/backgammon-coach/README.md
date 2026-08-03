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
- Knowledge interfaces (`CoachKnowledgeRetriever`) and local/fixture/no-op retrievers.
- Submission orchestration (`submitCoachQuestion`) for host-layer integration.

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
