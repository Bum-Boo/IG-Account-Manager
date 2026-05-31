import { eq } from "drizzle-orm";
import type { Account } from "@ig-manager/domain";
import type { IgManagerDatabase } from "../database.js";
import { accounts } from "../schema.js";
import { fromAccountRow, toAccountRow } from "../mappers.js";

export class AccountRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  create(account: Account): Account {
    this.db.insert(accounts).values(toAccountRow(account)).run();
    return account;
  }

  getById(id: string): Account | undefined {
    const row = this.db.select().from(accounts).where(eq(accounts.id, id)).get();
    return row ? fromAccountRow(row) : undefined;
  }

  list(): Account[] {
    return this.db.select().from(accounts).all().map(fromAccountRow);
  }

  update(account: Account): Account {
    this.db.update(accounts).set(toAccountRow(account)).where(eq(accounts.id, account.id)).run();
    return account;
  }

  delete(id: string): void {
    this.db.delete(accounts).where(eq(accounts.id, id)).run();
  }
}

