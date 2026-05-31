import type Database from "better-sqlite3";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = resolve(currentDir, "..", "migrations");

export interface MigrationRecord {
  id: string;
  appliedAt: string;
}

export function runMigrations(
  client: Database.Database,
  migrationsDir = defaultMigrationsDir
): MigrationRecord[] {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  client.exec(`
    CREATE TABLE IF NOT EXISTS _ig_manager_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    client
      .prepare("SELECT id FROM _ig_manager_migrations")
      .all()
      .map((row) => (row as { id: string }).id)
  );

  const records: MigrationRecord[] = [];
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      continue;
    }

    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    const appliedAt = new Date().toISOString();

    client.transaction(() => {
      client.exec(sql);
      client
        .prepare("INSERT INTO _ig_manager_migrations (id, applied_at) VALUES (?, ?)")
        .run(file, appliedAt);
    })();

    records.push({ id: file, appliedAt });
  }

  return records;
}

