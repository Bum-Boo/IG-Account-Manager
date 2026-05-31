import type { DomainEvent } from "@ig-manager/domain";
import type { IgManagerDatabase } from "@ig-manager/db";
import { workflowEvents } from "@ig-manager/db";

export function createSqliteEventPublisher(db: IgManagerDatabase) {
  return {
    emit(event: DomainEvent): void {
      const entity = resolveEventEntity(event);

      db.insert(workflowEvents)
        .values({
          id: event.id,
          type: event.type,
          entityType: entity.type,
          entityId: entity.id,
          data: event.data as Record<string, unknown>,
          actorId: event.actorId,
          metadata: event.metadata,
          occurredAt: event.occurredAt
        })
        .run();
    }
  };
}

function resolveEventEntity(event: DomainEvent): { type: string; id: string } {
  const data = event.data as Record<string, unknown>;

  if (typeof data.publishJobId === "string") return { type: "publish_job", id: data.publishJobId };
  if (typeof data.candidateId === "string") return { type: "candidate", id: data.candidateId };
  if (typeof data.conceptId === "string") return { type: "concept", id: data.conceptId };
  if (typeof data.assetId === "string") return { type: "asset", id: data.assetId };
  if (typeof data.accountId === "string") return { type: "account", id: data.accountId };

  return { type: "workflow", id: event.type };
}
