import { asc, eq, and } from "drizzle-orm";
import type { AuditLog } from "@ig-manager/domain";
import type { IgManagerDatabase } from "../database.js";
import { auditLogs } from "../schema.js";
import { fromAuditLogRow, toAuditLogRow } from "../mappers.js";

export class AuditLogRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  append(entry: AuditLog): AuditLog {
    this.db.insert(auditLogs).values(toAuditLogRow(entry)).run();
    return entry;
  }

  create(entry: AuditLog): AuditLog {
    return this.append(entry);
  }

  getById(id: string): AuditLog | undefined {
    const row = this.db.select().from(auditLogs).where(eq(auditLogs.id, id)).get();
    return row ? fromAuditLogRow(row) : undefined;
  }

  list(): AuditLog[] {
    return this.db.select().from(auditLogs).orderBy(asc(auditLogs.createdAt)).all().map(fromAuditLogRow);
  }

  listForEntity(entityType: string, entityId: string): AuditLog[] {
    return this.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(asc(auditLogs.createdAt))
      .all()
      .map(fromAuditLogRow);
  }
}
