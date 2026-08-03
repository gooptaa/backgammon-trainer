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

const SMOKE_REQUEST = {
  position: {
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
  },
  player: "white",
  dice: {
    dice: [1, 2]
  },
  legalOutcomes: [
    {
      move: {
        player: "white",
        steps: [
          {
            kind: "point-to-point",
            fromPoint: 8,
            toPoint: 7,
            dieValue: 1,
            dieIndex: 0,
            hitsBlot: false
          },
          {
            kind: "point-to-point",
            fromPoint: 7,
            toPoint: 5,
            dieValue: 2,
            dieIndex: 1,
            hitsBlot: false
          }
        ]
      },
      positionAfter: {
        points: {
          ...buildEmptyPoints(),
          5: { player: "white", checkerCount: 1 },
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
      },
      analysisAfter: {
        pointCountByPlayer: {
          white: 2,
          black: 1
        },
        pipCountByPlayer: {
          white: 11,
          black: 24
        },
        blotCountByPlayer: {
          white: 1,
          black: 1
        },
        madePointCountByPlayer: {
          white: 0,
          black: 0
        },
        highestOccupiedPointByPlayer: {
          white: 6,
          black: 24
        },
        checkerOnBarCountByPlayer: {
          white: 0,
          black: 0
        },
        borneOffCountByPlayer: {
          white: 13,
          black: 14
        },
        relationship: {
          contactStatus: "contact",
          pipCountLeader: "white",
          pipCountDifferenceWhiteMinusBlack: -13
        }
      },
      featureDelta: {
        white: {
          pipCountDelta: -3,
          blotCountDelta: 0,
          madePointCountDelta: 0,
          barCountDelta: 0,
          borneOffCountDelta: 0
        },
        black: {
          pipCountDelta: 0,
          blotCountDelta: 0,
          madePointCountDelta: 0,
          barCountDelta: 0,
          borneOffCountDelta: 0
        },
        relationship: {
          contactStatusBefore: "contact",
          contactStatusAfter: "contact",
          pipCountLeaderBefore: "white",
          pipCountLeaderAfter: "white",
          pipCountDifferenceWhiteMinusBlackDelta: -3
        }
      }
    },
    {
      move: {
        player: "white",
        steps: [
          {
            kind: "point-to-point",
            fromPoint: 8,
            toPoint: 6,
            dieValue: 2,
            dieIndex: 1,
            hitsBlot: false
          },
          {
            kind: "point-to-point",
            fromPoint: 6,
            toPoint: 5,
            dieValue: 1,
            dieIndex: 0,
            hitsBlot: false
          }
        ]
      },
      positionAfter: {
        points: {
          ...buildEmptyPoints(),
          5: { player: "white", checkerCount: 1 },
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
      },
      analysisAfter: {
        pointCountByPlayer: {
          white: 2,
          black: 1
        },
        pipCountByPlayer: {
          white: 11,
          black: 24
        },
        blotCountByPlayer: {
          white: 1,
          black: 1
        },
        madePointCountByPlayer: {
          white: 0,
          black: 0
        },
        highestOccupiedPointByPlayer: {
          white: 6,
          black: 24
        },
        checkerOnBarCountByPlayer: {
          white: 0,
          black: 0
        },
        borneOffCountByPlayer: {
          white: 13,
          black: 14
        },
        relationship: {
          contactStatus: "contact",
          pipCountLeader: "white",
          pipCountDifferenceWhiteMinusBlack: -13
        }
      },
      featureDelta: {
        white: {
          pipCountDelta: -3,
          blotCountDelta: 0,
          madePointCountDelta: 0,
          barCountDelta: 0,
          borneOffCountDelta: 0
        },
        black: {
          pipCountDelta: 0,
          blotCountDelta: 0,
          madePointCountDelta: 0,
          barCountDelta: 0,
          borneOffCountDelta: 0
        },
        relationship: {
          contactStatusBefore: "contact",
          contactStatusAfter: "contact",
          pipCountLeaderBefore: "white",
          pipCountLeaderAfter: "white",
          pipCountDifferenceWhiteMinusBlackDelta: -3
        }
      }
    }
  ],
  context: {
    gameMode: "money"
  }
};

const fail = (message) => {
  throw new Error(message);
};

const run = async () => {
  requireOptIn();
  const apiBaseUrl = readApiBaseUrl();

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
    body: JSON.stringify(SMOKE_REQUEST)
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

  const fingerprints = new Set(result.scores.map((row) => row.moveFingerprint));
  if (fingerprints.size !== result.scores.length) {
    fail("Evaluator returned duplicate move fingerprints.");
  }

  if (result.coverage !== "complete" && result.coverage !== "partial") {
    fail("Evaluator returned unsupported coverage value.");
  }

  console.log("gnubg smoke passed");
  console.log(`api base url: ${apiBaseUrl}`);
  console.log(`mode: ${status.mode}`);
  console.log(`availability: ${status.availability}`);
  console.log(`provider: ${result.provenance.provider}`);
  console.log(`provider version: ${String(result.provenance.providerVersion ?? "unknown")}`);
  console.log(`coverage: ${result.coverage}`);
  console.log(`scored moves: ${result.scores.length}`);
};

run().catch((error) => {
  console.error(`gnubg smoke failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
