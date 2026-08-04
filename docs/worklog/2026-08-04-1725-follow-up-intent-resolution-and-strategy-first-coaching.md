# Follow-Up Intent Resolution and Strategy-First Coaching

Date: 2026-08-04

Branch: main

Starting commit: efb628d

## Root cause

The coach resolved follow-up referents (for example, selecting history-turn context for "that move") but did not carry an explicit per-turn coaching operation through retrieval planning and prompt composition. As a result, retrieval and prompt instructions could remain biased toward move-review behavior from prior turns.

## Architectural decisions

1. Immediate coaching intent is now resolved as a provider-neutral orchestration artifact per user turn.
2. Subject resolution remains context-aware (conversation plus structured game state), while requested operation is resolved from current message wording.
3. Retrieval planning consumes resolved operation and subject metadata without exposing lexical internals to orchestration.
4. Prompt composition receives explicit intent and evidence-priority metadata so authority hierarchy is deterministic and inspectable.
5. Dependency direction remains unchanged: coach orchestrates, knowledge retrieves, evaluator provides move-quality evidence.

## Implementation decisions

1. Extended provider-neutral retrieval intent taxonomy to represent operations:
- move-evaluation
- strategic-concept-explanation
- position-specific-explanation
- candidate-comparison
- rules-legality
- definition
- counterfactual-analysis
- learning-focus
- progress-count
- unsupported-topic

2. Added deterministic intent precedence and subject resolution in coach retrieval planning:
- explicit current wording outranks prior response mode
- comparison cues outrank generic strategy
- legality cues outrank strategy when comparison cues are absent
- definition cues remain definition-focused even with rich context
- pronouns inherit subject from context, not task mode

3. Updated intent-aware concept and preferred-track planning:
- strategic concept and position-specific explanations avoid default move-review weighting
- candidate comparison and move evaluation keep move-review weighting
- legality and definition remain board-vision/glossary oriented

4. Added developer-facing operation diagnostics in evidence:
- resolved subject
- resolved intent
- evidence priority
- evaluator role
- retrieval intent/concepts/tracks/query terms

5. Added intent-specific prompt instructions:
- reassess intent every turn
- strategy-first mechanism explanations for concept questions
- explicit no circular evaluator-attribution guidance
- assumption-first counterfactual guidance
- direct candidate comparison guidance

6. Preserved no-match and retriever-failure behavior.

## Retrieval and ranking changes

1. Knowledge query intent model now supports expanded operation intents.
2. Deterministic lexical scoring updated with operation-aware boosts/penalties:
- stronger move-review preference for evaluation/comparison
- stronger board-vision/legal concept preference for legality
- explicit move-review penalties for strategic/position-specific/counterfactual explanations

## Prompt and coaching behavior changes

1. Prompt now carries explicit operation and retrieval plan metadata.
2. Prompt instructions now enforce operation-first response ordering rather than always using evaluation-first ordering.
3. Strategic concept answers are constrained to begin with causal mechanism and treat evaluator ranking as secondary support.

## Tests

Added deterministic regression coverage in:
- packages/backgammon-coach/test/coach.test.ts
- packages/backgammon-knowledge/test/knowledge.test.ts

Coverage includes:
- move-review to strategic-concept intent switch
- explicit comparison intent preservation
- definition-focus preservation
- strategy back to evaluation intent switching
- counterfactual intent classification and prompt guidance
- point-value retrieval preference over move-review templates
- legality retrieval focus

## Future extension points

1. Hybrid/semantic retrievers can consume the same resolved operation and subject plan boundary.
2. Learner-level weighting can be increased without changing orchestration contracts.
3. Additional context-specific subject extraction can be layered on current deterministic resolver.

## Deviations

No architectural deviation from existing retrieval boundary model.
No new package or semantic retrieval introduced.

## Remaining limitations

1. Subject extraction remains deterministic and text-pattern based.
2. Causal attribution remains evidence-constrained; exact feature attribution from evaluator remains unavailable by design.
3. Retrieval remains lexical and metadata-dependent.
