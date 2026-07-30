import { serverConfig } from "./config";
import { buildServer } from "./app";

const start = async (): Promise<void> => {
  const app = buildServer();

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
