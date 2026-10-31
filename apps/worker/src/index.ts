import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startWorker } from "./runtime.js";

export * from "./config.js";
export * from "./events.js";
export * from "./publisher-registry.js";
export * from "./runtime.js";

if (isMainModule()) {
  // `--once` processes the jobs that are due right now and exits. It is the
  // cross-platform way to run the worker without setting environment variables.
  const runtime = startWorker({
    env: process.argv.includes("--once") ? { ...process.env, WORKER_RUN_ONCE: "true" } : process.env
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.info(`worker received ${signal}, shutting down`);
    void runtime.stop().catch((error) => {
      console.error("worker shutdown failed", error);
      process.exitCode = 1;
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  runtime.done.catch((error) => {
    console.error("worker failed", error);
    process.exitCode = 1;
  });
}

function isMainModule(): boolean {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  return fileURLToPath(import.meta.url) === resolve(entry);
}
