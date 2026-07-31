import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { parseGnuBgEvaluationOutput } from "../src/parser";

const readFixture = (name: string): string => {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
};

describe("parseGnuBgEvaluationOutput", () => {
  it("parses successful output, provider ranks, settings, and benign surrounding lines", () => {
    const result = parseGnuBgEvaluationOutput(readFixture("success-white-complete.txt"), {
      playerOnRoll: "white"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.evaluation.providerVersion).toBe("1.08.003");
    expect(result.evaluation.coverage).toBe("complete");
    expect(result.evaluation.scoreScale).toEqual({ kind: "equity", unit: "points" });
    expect(result.evaluation.settings).toEqual({ depth: 2, noise: "off" });
    expect(result.evaluation.rows[0]).toEqual(
      expect.objectContaining({
        notation: "8/7 7/5",
        sourceScore: 0.125,
        normalizedScore: 0.125,
        providerRank: 1
      })
    );
    expect(result.evaluation.rows[1]).toEqual(
      expect.objectContaining({
        notation: "8/6 6/5",
        sourceScore: 0.1,
        normalizedScore: 0.1,
        providerRank: 2
      })
    );
  });

  it("handles Windows line endings and black-on-roll notation correctly", () => {
    const result = parseGnuBgEvaluationOutput(
      readFixture("success-black-complete.txt").replace(/\n/g, "\r\n"),
      { playerOnRoll: "black" }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.evaluation.rows[0]?.parsedMove.steps[0]).toEqual(
      expect.objectContaining({ fromPoint: 1, toPoint: 3 })
    );
    expect(result.evaluation.rows[1]?.parsedMove.steps[0]).toEqual(
      expect.objectContaining({ fromPoint: 1, toPoint: 2 })
    );
  });

  it("normalizes score perspective explicitly when the source perspective is the opponent", () => {
    const result = parseGnuBgEvaluationOutput(readFixture("success-opponent-perspective.txt"), {
      playerOnRoll: "white"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.evaluation.rows[0]?.normalizedScore).toBe(-0.125);
  });

  it("supports partial candidate output and no-legal-move output", () => {
    const partial = parseGnuBgEvaluationOutput(readFixture("success-partial.txt"), {
      playerOnRoll: "white"
    });
    const noMoves = parseGnuBgEvaluationOutput(readFixture("no-legal-moves.txt"), {
      playerOnRoll: "white"
    });

    expect(partial.ok).toBe(true);
    if (partial.ok) {
      expect(partial.evaluation.coverage).toBe("partial");
      expect(partial.evaluation.warnings).toEqual(["provider returned only top candidates"]);
    }

    expect(noMoves.ok).toBe(true);
    if (noMoves.ok) {
      expect(noMoves.evaluation.coverage).toBe("complete");
      expect(noMoves.evaluation.rows).toEqual([]);
    }
  });

  it("rejects malformed, non-finite, duplicate, empty, and unknown-format output", () => {
    expect(
      parseGnuBgEvaluationOutput(readFixture("malformed-row.txt"), { playerOnRoll: "white" })
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      parseGnuBgEvaluationOutput(readFixture("non-finite.txt"), { playerOnRoll: "white" })
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      parseGnuBgEvaluationOutput(readFixture("duplicate-move.txt"), { playerOnRoll: "white" })
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(parseGnuBgEvaluationOutput("", { playerOnRoll: "white" })).toEqual(
      expect.objectContaining({ ok: false })
    );
    expect(
      parseGnuBgEvaluationOutput(readFixture("unknown-format.txt"), { playerOnRoll: "white" })
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("is deterministic", () => {
    const text = readFixture("success-tied.txt");
    const first = parseGnuBgEvaluationOutput(text, { playerOnRoll: "white" });
    const second = parseGnuBgEvaluationOutput(text, { playerOnRoll: "white" });

    expect(first).toEqual(second);
  });
});
