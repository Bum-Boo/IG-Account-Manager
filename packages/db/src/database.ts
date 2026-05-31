import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { schema, type Schema } from "./schema.js";

export type IgManagerDatabase = BetterSQLite3Database<Schema>;

export interface DatabaseHandle {
  client: Database.Database;
  db: IgManagerDatabase;
  close(): void;
}

export function createDatabase(filename = ":memory:"): DatabaseHandle {
  const client = new Database(filename);
  client.pragma("foreign_keys = ON");

  return {
    client,
    db: drizzle(client, { schema }),
    close: () => client.close()
  };
}

