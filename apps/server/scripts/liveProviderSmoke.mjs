const ONE_LINE_PROMPT = "Reply with exactly: smoke check ok";

const requireOptIn = () => {
  if (process.env.ALLOW_LIVE_PROVIDER_SMOKE !== "true") {
    throw new Error(
      "Live provider smoke test is opt-in. Set ALLOW_LIVE_PROVIDER_SMOKE=true and run again."
    );
  }
};

const readApiBaseUrl = () => {
  const raw = process.env.SMOKE_API_BASE_URL ?? process.env.VITE_API_BASE_URL;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return "http://localhost:3001";
  }

  return raw.trim().replace(/\/$/, "");
};

const fail = (message) => {
  throw new Error(message);
};

const run = async () => {
  requireOptIn();
  const apiBaseUrl = readApiBaseUrl();

  const statusResponse = await fetch(`${apiBaseUrl}/api/coach/status`, { method: "GET" });
  if (!statusResponse.ok) {
    fail(`Coach status request failed with HTTP ${statusResponse.status}.`);
  }

  const statusBody = await statusResponse.json();
  const providerStatus = statusBody?.data?.coachProvider;

  if (!providerStatus || typeof providerStatus !== "object") {
    fail("Coach status response is missing provider information.");
  }

  if (providerStatus.configured !== true) {
    fail(`Coach provider is not configured: ${providerStatus.message ?? "unknown reason"}`);
  }

  if (providerStatus.mode !== "production") {
    fail(
      `Coach provider mode must be production for live smoke, received \"${providerStatus.mode}\".`
    );
  }

  if (providerStatus.providerFamily === "none" || providerStatus.providerFamily === "mock") {
    fail(
      `Coach provider family must be a real provider for live smoke, received \"${providerStatus.providerFamily}\".`
    );
  }

  const requestId = `live-smoke-${Date.now()}`;
  const completionResponse = await fetch(`${apiBaseUrl}/api/coach/complete`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      requestId,
      systemInstruction: "You are a smoke-test responder.",
      developerInstructions: ["Return one short sentence only."],
      messages: [{ role: "user", text: ONE_LINE_PROMPT }],
      evidence: {
        contextKind: "smoke-check"
      },
      settings: {
        maxOutputChars: 120
      }
    })
  });

  const completionBody = await completionResponse.json().catch(() => ({}));

  if (!completionResponse.ok) {
    const message = completionBody?.error?.message;
    const code = completionBody?.error?.code;
    fail(
      `Coach completion request failed with HTTP ${completionResponse.status}${code ? ` (${code})` : ""}${message ? `: ${message}` : "."}`
    );
  }

  const result = completionBody?.data?.result;
  if (!result || typeof result !== "object" || result.ok !== true) {
    fail("Coach completion response did not return success output.");
  }

  const text = typeof result.text === "string" ? result.text.trim() : "";
  if (text.length === 0) {
    fail("Coach completion response text was empty.");
  }

  const modelProvider = result?.model?.provider;
  const modelName = result?.model?.model;

  console.log("live provider smoke passed");
  console.log(`api base url: ${apiBaseUrl}`);
  console.log(`provider: ${String(modelProvider ?? "unknown")}`);
  console.log(`model: ${String(modelName ?? "unknown")}`);
  console.log(`response chars: ${text.length}`);
  console.log(`request id: ${requestId}`);
};

run().catch((error) => {
  console.error(
    `live provider smoke failed: ${error instanceof Error ? error.message : "unknown error"}`
  );
  process.exitCode = 1;
});
