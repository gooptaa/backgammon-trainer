const parsePort = (raw: string | undefined): number => {
  const fallbackPort = 3001;

  if (!raw) {
    return fallbackPort;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallbackPort;
};

export const serverConfig = {
  host: process.env.SERVER_HOST ?? "0.0.0.0",
  port: parsePort(process.env.SERVER_PORT),
  modelProvider: process.env.MODEL_PROVIDER ?? "mock"
};
