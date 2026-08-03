import {
  analyzeLegalMoveOutcomes,
  getMoveFingerprint
} from "@backgammon-trainer/backgammon-analysis";

const requireOptIn = () => {
  if (process.env.ALLOW_GNUBG_SMOKE !== "true") {
    throw new Error("GNU evaluator smoke test is opt-in. Set ALLOW_GNUBG_SMOKE=true.");
  }
};

const readApiBaseUrl = () => {
  const raw = process.env.SMOKE_API_BASE_URL ?? process.env.VITE_API_BASE_URL;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return "http://localhost:3001";
  }

  return raw.trim().replace(/\/$/, "");
};

const buildEmptyPoints = () => {
  const entries = [];
  for (let point = 1; point <= 24; point += 1) {
    entries.push([String(point), null]);
  }

  return Object.fromEntries(entries);
};

const SMOKE_POSITION = {
  points: {
    ...buildEmptyPoints(),
    8: { player: "white", checkerCount: 1 },
    6: { player: "white", checkerCount: 1 },
    24: { player: "black", checkerCount: 1 }
  },
  bar: {
    white: 0,
    black: 0
  },
  borneOff: {
    white: 13,
    black: 14
  }
};

const SMOKE_PLAYER = "white";
const SMOKE_DICE = {
  dice: [1, 2]
};

const fail = (message) => {
  throw new Error(message);
};

const buildSmokeRequest = () => {
  const factual = analyzeLegalMoveOutcomes(SMOKE_POSITION, SMOKE_PLAYER, SMOKE_DICE);
  if (!factual.ok) {
    fail(`Failed to generate canonical legal outcomes for GNU smoke request: ${factual.message}`);
  }

  return {
    position: SMOKE_POSITION,
    player: SMOKE_PLAYER,
    dice: SMOKE_DICE,
    legalOutcomes: factual.analysis.outcomes,
    context: {
      gameMode: "money"
    }
  };
};

const run = async () => {
  requireOptIn();
  const apiBaseUrl = readApiBaseUrl();
  const smokeRequest = buildSmokeRequest();

  const statusResponse = await fetch(`${apiBaseUrl}/api/evaluator/status`, { method: "GET" });
  if (!statusResponse.ok) {
    fail(`Evaluator status request failed with HTTP ${statusResponse.status}.`);
  }

  const statusBody = await statusResponse.json();
  const status = statusBody?.data?.evaluatorProvider;
  if (!status || typeof status !== "object") {
    fail("Evaluator status payload missing evaluatorProvider data.");
  }

  if (status.mode !== "gnubg" || status.providerFamily !== "gnubg") {
    fail(
      `Expected gnubg evaluator mode, got mode=${String(status.mode)} providerFamily=${String(status.providerFamily)}.`
    );
  }

  if (status.availability !== "available") {
    fail(`GNU evaluator is not available: ${String(status.message ?? "unknown")}`);
  }

  const evaluateResponse = await fetch(`${apiBaseUrl}/api/evaluator/evaluate-position`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(smokeRequest)
  });

  const evaluateBody = await evaluateResponse.json().catch(() => ({}));
  if (!evaluateResponse.ok) {
    fail(`Evaluator request failed with HTTP ${evaluateResponse.status}.`);
  }

  const result = evaluateBody?.data?.result;
  if (!result || typeof result !== "object" || result.ok !== true) {
    fail("Evaluator response was not a successful evaluation result.");
  }

  if (!Array.isArray(result.scores) || result.scores.length === 0) {
    fail("Evaluator returned no scores.");
  }

  if (!result.provenance || result.provenance.provider !== "gnubg") {
    fail("Evaluator provenance does not identify gnubg.");
  }

  const candidateFingerprints = new Set(
    smokeRequest.legalOutcomes.map((outcome) => getMoveFingerprint(outcome.move))
  );
  const scoredFingerprints = result.scores.map((row) => row.moveFingerprint);
  if (new Set(scoredFingerprints).size !== scoredFingerprints.length) {
    fail("Evaluator returned duplicate move fingerprints.");
  }

  if (scoredFingerprints.some((fingerprint) => !candidateFingerprints.has(fingerprint))) {
    fail("Evaluator returned at least one score for a move outside canonical legal candidates.");
  }

  if (result.coverage !== "complete" && result.coverage !== "partial") {
    fail("Evaluator returned unsupported coverage value.");
  }

  if (candidateFingerprints.size === 0) {
    fail("GNU smoke request unexpectedly had no legal candidates.");
  }

  console.log("gnubg smoke passed");
  console.log(`api base url: ${apiBaseUrl}`);
  console.log(`mode: ${status.mode}`);
  console.log(`availability: ${status.availability}`);
  console.log(`provider: ${result.provenance.provider}`);
  console.log(`provider version: ${String(result.provenance.providerVersion ?? "unknown")}`);
  console.log(`coverage: ${result.coverage}`);
  console.log(`scored moves: ${result.scores.length}`);
  console.log(`legal candidates: ${smokeRequest.legalOutcomes.length}`);
};

run().catch((error) => {
  console.error(`gnubg smoke failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
