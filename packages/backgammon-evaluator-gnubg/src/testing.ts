import type { GnuBgProcessRequest, GnuBgProcessResult, GnuBgProcessRunner } from "./evaluator.js";

export type FakeGnuBgProcessHandler = (
  request: GnuBgProcessRequest
) => GnuBgProcessResult | Promise<GnuBgProcessResult>;

export const createFakeGnuBgProcessRunner = (
  handler: FakeGnuBgProcessHandler
): GnuBgProcessRunner => {
  return {
    run: async (request) => handler(request)
  };
};

export const createQueuedFakeGnuBgProcessRunner = (
  results: readonly GnuBgProcessResult[]
): GnuBgProcessRunner => {
  let index = 0;

  return createFakeGnuBgProcessRunner(async () => {
    const result = results[index];
    index += 1;

    return (
      result ?? {
        ok: false,
        reason: "spawn-failed",
        message: "No queued GNU Backgammon process result remained."
      }
    );
  });
};
