# Web Sandbox

## Purpose

The web app is a development sandbox for deterministic backgammon gameplay, factual legal-move inspection, fixture-backed analysis-capture orchestration, and text-first coaching conversation flow.

## Coach panel behavior

- Coach chat is text-only and in-memory.
- A single conversation is scoped to one active game lineage.
- New game and imported lineage replacement start a fresh empty conversation.
- Browser reload restores deterministic game snapshot but starts an empty conversation.
- One pending coach request is allowed at a time; gameplay stays enabled while pending.
- Fixture warning is explicit: `Development fixture coach - responses are not strategic advice.`
- No microphone, voice capture, speech synthesis, or audio-agent behavior is implemented.
- Coach failures are concise and non-fatal; gameplay and deterministic analysis remain available.

## Current analysis capture behavior

This milestone adds development-only in-memory `AnalysisSession` capture.

Lifecycle:

1. identify the live decision with a deterministic decision key
2. run fixture-ranked move analysis for that decision
3. store completed analysis as pending decision state
4. wait for canonical committed `TurnRecord`
5. build and append record through `@backgammon-trainer/backgammon-analysis-session`
6. render factual inspection in the `Analysis Session` panel

## Policy and constraints

- Committed turn history is authoritative.
- Capture is sparse by design: turns without completed analysis are omitted.
- If commit occurs before analysis completion, the move still commits and no late record is appended.
- Evaluator failures do not block gameplay and do not create placeholder records.
- Fixture warning is explicit: `Development fixture scores - not strategic evaluation.`
- No strategic labels or coaching verdicts are shown.

## Session lifecycle

- One in-memory session per active game lineage.
- New game and imported different game snapshot create fresh empty sessions.
- Browser startup restore creates a fresh empty in-memory session for restored lineage.
- Historical restored turns are not automatically analyzed.

## Persistence boundary

Not implemented in this milestone:

- analysis-session local storage
- analysis-session import/export
- backend analysis-session persistence

`GameSnapshot` persistence remains independent and unchanged.

## Evaluator/runtime boundary

- Browser uses no evaluator or explicit fixture evaluator only.
- Browser does not import `@backgammon-trainer/backgammon-evaluator-gnubg`.
- No Node polyfills are added.
