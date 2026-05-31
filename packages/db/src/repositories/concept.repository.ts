import { asc, eq } from "drizzle-orm";
import type { Concept } from "@ig-manager/domain";
import type { IgManagerDatabase } from "../database.js";
import { concepts } from "../schema.js";
import { fromConceptRow, toConceptRow } from "../mappers.js";

export class ConceptRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  create(concept: Concept): Concept {
    this.db.insert(concepts).values(toConceptRow(concept)).run();
    return concept;
  }

  getById(id: string): Concept | undefined {
    const row = this.db.select().from(concepts).where(eq(concepts.id, id)).get();
    return row ? fromConceptRow(row) : undefined;
  }

  getByAccount(accountId: string): Concept[] {
    return this.db
      .select()
      .from(concepts)
      .where(eq(concepts.accountId, accountId))
      .orderBy(asc(concepts.name))
      .all()
      .map(fromConceptRow);
  }

  update(concept: Concept): Concept {
    this.db.update(concepts).set(toConceptRow(concept)).where(eq(concepts.id, concept.id)).run();
    return concept;
  }

  delete(id: string): void {
    this.db.delete(concepts).where(eq(concepts.id, id)).run();
  }
}

