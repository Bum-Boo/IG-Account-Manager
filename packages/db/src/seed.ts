import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { createDatabase } from "./database.js";
import type { IgManagerDatabase } from "./database.js";
import { createDemoData } from "./demo-data.js";
import { runMigrations } from "./migrations.js";
import { createRepositories } from "./repositories/index.js";

export function seedDatabase(db: IgManagerDatabase): void {
  const repos = createRepositories(db);
  const demo = createDemoData();

  for (const account of demo.accounts) repos.accounts.create(account);
  for (const concept of demo.concepts) repos.concepts.create(concept);
  for (const asset of demo.assets) repos.assets.create(asset);
  for (const recipe of demo.recipes) repos.recipes.create(recipe);
  for (const candidate of demo.candidates) repos.candidates.create(candidate);
  for (const plugin of demo.plugins) repos.plugins.create(plugin);
  for (const publishJob of demo.publishJobs) repos.publishJobs.create(publishJob);
  for (const auditLog of demo.auditLogs) repos.auditLogs.append(auditLog);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const filename = process.env.DATABASE_URL ?? "./data/ig-manager.sqlite";

  if (filename !== ":memory:") {
    mkdirSync(dirname(filename), { recursive: true });
  }

  const handle = createDatabase(filename);

  try {
    runMigrations(handle.client);
    seedDatabase(handle.db);
    console.info("Seeded demo data.");
  } finally {
    handle.close();
  }
}
