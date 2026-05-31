import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createDatabase } from "./database.js";
import { runMigrations } from "./migrations.js";

const filename = process.env.DATABASE_URL ?? "./data/ig-manager.sqlite";

if (filename !== ":memory:") {
  mkdirSync(dirname(filename), { recursive: true });
}

const handle = createDatabase(filename);

try {
  const applied = runMigrations(handle.client);
  console.info(`Applied ${applied.length} migration(s).`);
} finally {
  handle.close();
}

