import { createDatabase } from "./database.js";
import { runMigrations } from "./migrations.js";
import { defaultDatabaseFilename, ensureDatabaseDirectory, resolveDatabaseFilename } from "./paths.js";

const filename = process.env.DATABASE_URL ? resolveDatabaseFilename(process.env.DATABASE_URL) : defaultDatabaseFilename();
ensureDatabaseDirectory(filename);

const handle = createDatabase(filename);

try {
  const applied = runMigrations(handle.client);
  console.info(`Applied ${applied.length} migration(s).`);
} finally {
  handle.close();
}

