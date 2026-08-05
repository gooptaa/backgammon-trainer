import {
  getCanonicalMoveFingerprint,
  getMoveFingerprint,
  type EvaluatePositionResult,
  type EvaluationScoreScale,
  type PositionEvaluator
} from "./index";

export interface FixturePositionEvaluatorOptions {
  readonly mode?:
    | "complete"
    | "partial"
    | "unavailable"
    | "provider-failed"
    | "timeout"
    | "unsupported-position"
    | "malformed";
  readonly scoresByFingerprint?: Readonly<Record<string, number>>;
  readonly providerRanksByFingerprint?: Readonly<Record<string, number>>;
  readonly partialFingerprints?: readonly string[];
  readonly warnings?: readonly string[];
  readonly scoreScale?: EvaluationScoreScale;
  readonly delayMs?: number;
}

const DEFAULT_SCORE_SCALE: EvaluationScoreScale = {
  kind: "relative"
};

const createDeterministicScoreMap = (
  moveFingerprints: readonly string[]
): Readonly<Record<string, number>> => {
  const sorted = [...moveFingerprints].sort((left, right) => left.localeCompare(right));
  const entries = sorted.map((fingerprint, index) => [fingerprint, sorted.length - index] as const);

  return Object.fromEntries(entries);
};

const waitForDelay = async (delayMs: number): Promise<void> => {
  if (delayMs <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), delayMs);
  });
};

const createFixtureFailure = (
  reason: Extract<EvaluatePositionResult, { ok: false }>["reason"]
): Extract<EvaluatePositionResult, { ok: false }> => {
  return {
    ok: false,
    reason,
    message:
      reason === "unavailable"
        ? "Fixture evaluator is unavailable."
        : reason === "timeout"
          ? "Fixture evaluator timed out."
          : reason === "unsupported-position"
            ? "Fixture evaluator does not support this position."
            : reason === "invalid-provider-result"
              ? "Fixture evaluator returned invalid data."
              : "Fixture evaluator failed.",
    provenance: {
      provider: "fixture-position-evaluator",
      providerVersion: "0.1.0",
      adapterVersion: "0.1.0",
      settings: {
        mode: reason
      }
    }
  };
};

export const createFixturePositionEvaluator = (
  options: FixturePositionEvaluatorOptions = {}
): PositionEvaluator => {
  return {
    evaluate: async (request) => {
      const mode = options.mode ?? "complete";
      await waitForDelay(options.delayMs ?? 0);

      if (mode === "unavailable") {
        return createFixtureFailure("unavailable");
      }

      if (mode === "provider-failed") {
        return createFixtureFailure("provider-failed");
      }

      if (mode === "timeout") {
        return createFixtureFailure("timeout");
      }

      if (mode === "unsupported-position") {
        return createFixtureFailure("unsupported-position");
      }

      const canonicalRepresentativeFingerprints = (() => {
        const seenCanonicalFingerprints = new Set<string>();
        const representativeFingerprints: string[] = [];

        for (const outcome of request.legalOutcomes) {
          const canonicalFingerprint = getCanonicalMoveFingerprint(outcome);
          if (seenCanonicalFingerprints.has(canonicalFingerprint)) {
            continue;
          }

          seenCanonicalFingerprints.add(canonicalFingerprint);
          representativeFingerprints.push(getMoveFingerprint(outcome.move));
        }

        return representativeFingerprints;
      })();

      const deterministicScoreMap = createDeterministicScoreMap(
        canonicalRepresentativeFingerprints
      );
      const scoreMap = {
        ...deterministicScoreMap,
        ...(options.scoresByFingerprint ?? {})
      };
      const scoredFingerprints =
        mode === "partial"
          ? (options.partialFingerprints ?? canonicalRepresentativeFingerprints.slice(0, 1))
          : canonicalRepresentativeFingerprints;

      const scores = scoredFingerprints.map((fingerprint) => ({
        moveFingerprint: fingerprint,
        normalizedScore: scoreMap[fingerprint] ?? 0,
        ...(options.providerRanksByFingerprint?.[fingerprint] === undefined
          ? {}
          : {
              providerRank: options.providerRanksByFingerprint[fingerprint]
            })
      }));

      if (mode === "malformed") {
        return {
          ok: true,
          coverage: "complete",
          scores: [
            ...scores,
            {
              moveFingerprint: canonicalRepresentativeFingerprints[0] ?? "missing",
              normalizedScore: Number.NaN
            }
          ],
          scoreScale: options.scoreScale ?? DEFAULT_SCORE_SCALE,
          provenance: {
            provider: "fixture-position-evaluator",
            providerVersion: "0.1.0",
            adapterVersion: "0.1.0",
            settings: {
              mode: "malformed"
            }
          },
          warnings: [...(options.warnings ?? [])]
        } as const;
      }

      return {
        ok: true,
        coverage: mode === "partial" ? "partial" : "complete",
        scores,
        scoreScale: options.scoreScale ?? DEFAULT_SCORE_SCALE,
        provenance: {
          provider: "fixture-position-evaluator",
          providerVersion: "0.1.0",
          adapterVersion: "0.1.0",
          settings: {
            mode,
            gameMode: request.context?.gameMode ?? "money"
          }
        },
        warnings: [...(options.warnings ?? [])]
      } as const;
    }
  };
};
