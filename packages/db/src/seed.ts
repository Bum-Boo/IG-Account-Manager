import { pathToFileURL } from "node:url";
import { createDatabase } from "./database.js";
import { runMigrations } from "./migrations.js";
import { defaultDatabaseFilename, ensureDatabaseDirectory, resolveDatabaseFilename } from "./paths.js";
import { seedStarterWorkspace, WorkspaceNotEmptyError } from "./seed-data.js";

export { seedStarterWorkspace as seedDatabase } from "./seed-data.js";

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const filename = process.env.DATABASE_URL ? resolveDatabaseFilename(process.env.DATABASE_URL) : defaultDatabaseFilename();
  ensureDatabaseDirectory(filename);

  const handle = createDatabase(filename);

  try {
    runMigrations(handle.client);
    seedStarterWorkspace(handle, { actorId: "seed-script" });
    console.info(`Seeded the starter workspace into ${filename}.`);
  } catch (error) {
    if (error instanceof WorkspaceNotEmptyError) {
      console.info(`${error.message} (${filename})`);
    } else {
      throw error;
    }
  } finally {
    handle.close();
  }
}
