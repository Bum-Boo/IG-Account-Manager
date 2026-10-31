import type { AuditLog } from "../types.js";
import { formatDate } from "../utils.js";

export function AuditLogList({ entries, emptyText = "No audit entries yet." }: { entries: AuditLog[]; emptyText?: string }) {
  if (entries.length === 0) {
    return <p className="muted-copy">{emptyText}</p>;
  }

  return (
    <ol className="audit-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <strong>{entry.action}</strong>
          <span>
            {entry.entityType} {entry.entityId}
          </span>
          <span>
            {entry.actorId ?? "unknown actor"} / {formatDate(entry.createdAt)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Newest first. */
export function sortAuditLogs(entries: AuditLog[]): AuditLog[] {
  return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
