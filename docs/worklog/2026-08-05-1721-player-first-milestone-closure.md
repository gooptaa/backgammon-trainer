# Player-First Milestone Closure

Timestamp: 2026-08-05-1721 -0400

## Scope

This closure audit verifies repository state, worklog integrity, and bounded real-GNU acceptance for the player-first shell and automatic GNU opponent milestone without starting new product work.

## Verified Git state at audit start

- Branch: `main`
- HEAD: `da4f3171d9ab1a2bdee576387ce64cfe6b3fd6bf`
- `origin/main`: `da4f3171d9ab1a2bdee576387ce64cfe6b3fd6bf`
- Working tree: clean

## Commit chronology from Git (authoritative)

1. `7ce1f462bd266aabb3bbbb5eb6a809d563a4ba79` at `2026-08-04 19:25:16 -0400`
   - `fix(server): accept bounded coach instruction sets`
   - This is the baseline commit immediately preceding the player-first/automatic-opponent milestone sequence.
2. `51507a8168f46eb7222a08cb49c26d84434e6764` at `2026-08-05 14:16:57 -0400`
   - `Stabilize automatic GNU opponent recovery`
   - Present on `origin/main`.
3. `da4f3171d9ab1a2bdee576387ce64cfe6b3fd6bf` at `2026-08-05 15:04:52 -0400`
   - `feat: complete player-first game interface`
   - Present on `origin/main`.

## Worklog integrity audit

Audited files:

- `docs/worklog/2026-08-05-1958-player-first-game-shell.md`
- `docs/worklog/2026-08-05-2205-automatic-gnu-opponent-recovery.md`
- `docs/worklog/2026-08-05-1455-player-first-ui-completion.md`

Comparison baseline:

- `51507a8168f46eb7222a08cb49c26d84434e6764..HEAD` over `docs/worklog/`
- Direct `git show` of historical files at `51507a8168f46eb7222a08cb49c26d84434e6764`

Findings:

1. `docs/worklog/2026-08-05-2205-automatic-gnu-opponent-recovery.md` is unchanged since recovery commit.
2. `docs/worklog/2026-08-05-1958-player-first-game-shell.md` differs only by terminal newline normalization (no semantic text changes).
3. `docs/worklog/2026-08-05-1455-player-first-ui-completion.md` was added in UI commit `da4f3171d9ab1a2bdee576387ce64cfe6b3fd6bf`.

Conclusion: no substantive historical rewrite was detected. No historical content restoration was required.

## Filename and timestamp consistency

Worklog filenames are not chronological authority and are inconsistent with commit times in this sequence (for example, `1455` filename committed after `1958` and `2205` files were already present). Commit metadata above is the authoritative sequence.

## Bounded real-GNU acceptance check

Environment checks:

- Server evaluator status endpoint reported configured real GNU mode:
  - mode: `gnubg`
  - provider family: `gnubg`
  - availability: `available`
- `.env.local` present and ignored (not staged).

Bounded gameplay path executed (local browser + local server):

1. Started normal `New Game` until Black opening turn occurred.
2. Verified learner ownership metadata for new lineage remained White.
3. Reached Black opening turn with dice set.
4. Verified real evaluator provenance in UI contract preview (`Provider: gnubg`, not fixture).
5. Measured legal/evaluator coverage for that Black opening decision:
   - raw canonical legal moves (engine outcomes): `28`
   - canonical-equivalent legal move classes: `16`
   - matched evaluator classes: `14`
   - evaluator coverage: `partial`
6. Verified top-ranked evaluator move fingerprint mapped to a canonical legal move fingerprint.
7. Automatic application did not proceed because complete-coverage gate failed (fail-closed behavior).
8. `Retry Computer Move` repeated evaluator call but remained partial coverage.
9. Turn did not advance to White (move not applied).
10. No learner observation was added for the computer side in this bounded run (profile observations remained unchanged).
11. Request monitoring during computer retry observed evaluator route only (`/api/evaluator/evaluate-position`) and no coach completion request (`/api/coach/complete`).

Result: real-GNU automatic-opponent acceptance is blocked in this run because coverage remained partial; complete-coverage auto-apply success path was not observed.

## Hook warning audit

`apps/web/src/App.tsx` currently reports two `react-hooks/exhaustive-deps` warnings:

1. Line 1069 effect: missing `legalMovesResult.ok` and `legalMovesResult.moves.length` dependencies.
   - Responsibility: refresh evaluator analysis when current turn is evaluable.
   - Disposition: low-to-moderate stale-read risk; currently behavior is stable because legal-move derivation follows position/dice dependencies already present, but this is technical debt.
2. Line 2189 effect: missing callback dependencies `onApplyMove`, `onPassTurn`, `onRollDice`.
   - Responsibility: automatic Black-turn lifecycle orchestration.
   - Disposition: intentional guard against dependency churn from non-memoized callbacks; adding them directly would cause unnecessary reruns. Safer future correction is extracting callback-independent transition helpers or memoizing callbacks with explicit stable inputs.

No warning-only refactor was applied in closure scope.

## Final closure status

- Recovery commit: present and pushed.
- UI completion commit: present and pushed.
- Historical worklogs: preserved; only formatting newline normalization detected in one prior file.
- Milestone acceptance status: blocked on real-GNU complete-coverage auto-apply path.
- Remaining limitations:
  - live GNU opening decision can return partial canonical-class coverage, preventing automatic Black move application
  - two known `react-hooks/exhaustive-deps` warnings in `apps/web/src/App.tsx` remain documented technical debt
