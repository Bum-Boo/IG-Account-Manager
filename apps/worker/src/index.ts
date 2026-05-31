import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startWorker } from "./runtime.js";

export * from "./config.js";
export * from "./events.js";
export * from "./publisher-registry.js";
export * from "./runtime.js";

if (isMainModule()) {
  const runtime = startWorker();

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
