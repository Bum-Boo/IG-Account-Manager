import { asc, eq } from "drizzle-orm";
import type { CandidateStatus, PostCandidate } from "@ig-manager/domain";
import type { IgManagerDatabase } from "../database.js";
import { postCandidates } from "../schema.js";
import { fromPostCandidateRow, toPostCandidateRow } from "../mappers.js";

export class CandidateRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  create(candidate: PostCandidate): PostCandidate {
    this.db.insert(postCandidates).values(toPostCandidateRow(candidate)).run();
    return candidate;
  }

  getById(id: string): PostCandidate | undefined {
    const row = this.db.select().from(postCandidates).where(eq(postCandidates.id, id)).get();
    return row ? fromPostCandidateRow(row) : undefined;
  }

  list(): PostCandidate[] {
    return this.db
      .select()
      .from(postCandidates)
      .orderBy(asc(postCandidates.createdAt))
      .all()
      .map(fromPostCandidateRow);
  }

  getByStatus(status: CandidateStatus): PostCandidate[] {
    return this.db
      .select()
      .from(postCandidates)
      .where(eq(postCandidates.status, status))
      .orderBy(asc(postCandidates.createdAt))
      .all()
      .map(fromPostCandidateRow);
  }

  getByConcept(conceptId: string): PostCandidate[] {
    return this.db
      .select()
      .from(postCandidates)
      .where(eq(postCandidates.conceptId, conceptId))
      .orderBy(asc(postCandidates.createdAt))
      .all()
      .map(fromPostCandidateRow);
  }

  update(candidate: PostCandidate): PostCandidate {
    this.db
      .update(postCandidates)
      .set(toPostCandidateRow(candidate))
      .where(eq(postCandidates.id, candidate.id))
      .run();
    return candidate;
  }

  delete(id: string): void {
    this.db.delete(postCandidates).where(eq(postCandidates.id, id)).run();
  }
}
