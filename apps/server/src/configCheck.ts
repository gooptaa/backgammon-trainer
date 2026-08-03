import { getServerConfigIssues, readServerConfig } from "./config";
import { loadLocalEnvironment } from "./localEnv";

const run = async (): Promise<void> => {
  await loadLocalEnvironment();
  const config = readServerConfig();
  const issues = getServerConfigIssues(config);

  const modelSummary = [
    `modelProvider=${config.modelProvider}`,
    `providerLabel=${config.openAiCompatible.providerLabel}`,
    `model=${config.openAiCompatible.model ?? "unset"}`
  ].join(" ");

  const evaluatorSummary = `evaluatorProvider=${config.evaluatorProvider}`;

  console.log(`[server-config] ${modelSummary}`);
  console.log(`[server-config] ${evaluatorSummary}`);

  if (issues.length === 0) {
    console.log("[server-config] configuration check passed.");
    return;
  }

  console.error("[server-config] configuration issues detected:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }

  process.exitCode = 1;
};

void run();
