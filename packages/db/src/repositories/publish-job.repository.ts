import { asc, and, eq, lte, or } from "drizzle-orm";
import type { PublishJob } from "@ig-manager/domain";
import type { IgManagerDatabase } from "../database.js";
import { publishJobs } from "../schema.js";
import { fromPublishJobRow, toPublishJobRow } from "../mappers.js";

export class PublishJobRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  create(job: PublishJob): PublishJob {
    this.db.insert(publishJobs).values(toPublishJobRow(job)).run();
    return job;
  }

  getById(id: string): PublishJob | undefined {
    const row = this.db.select().from(publishJobs).where(eq(publishJobs.id, id)).get();
    return row ? fromPublishJobRow(row) : undefined;
  }

  list(): PublishJob[] {
    return this.db
      .select()
      .from(publishJobs)
      .orderBy(asc(publishJobs.scheduledAt))
      .all()
      .map(fromPublishJobRow);
  }

  getScheduledJobsDueBefore(timestamp: string): PublishJob[] {
    return this.db
      .select()
      .from(publishJobs)
      .where(
        or(
          and(eq(publishJobs.status, "queued"), lte(publishJobs.scheduledAt, timestamp)),
          and(eq(publishJobs.status, "retry_scheduled"), lte(publishJobs.retryAfter, timestamp))
        )
      )
      .orderBy(asc(publishJobs.scheduledAt))
      .all()
      .map(fromPublishJobRow);
  }

  update(job: PublishJob): PublishJob {
    this.db.update(publishJobs).set(toPublishJobRow(job)).where(eq(publishJobs.id, job.id)).run();
    return job;
  }

  delete(id: string): void {
    this.db.delete(publishJobs).where(eq(publishJobs.id, id)).run();
  }
}
