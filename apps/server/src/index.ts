import { getServerConfigIssues, readServerConfig } from "./config";
import { buildServer } from "./app";
import { loadLocalEnvironment } from "./localEnv";

const start = async (): Promise<void> => {
  await loadLocalEnvironment();

  const serverConfig = readServerConfig();
  const configIssues = getServerConfigIssues(serverConfig);
  for (const issue of configIssues) {
    console.warn(`[server-config] ${issue}`);
  }

  const app = buildServer({ config: serverConfig });

  try {
    await app.listen({
      host: serverConfig.host,
      port: serverConfig.port
    });
    console.log(`server listening on http://${serverConfig.host}:${serverConfig.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
