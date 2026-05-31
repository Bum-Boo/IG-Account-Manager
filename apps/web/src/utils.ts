import type { Account, BoardGroup, CandidateStatus, Concept, PostCandidate, PublishJob, WorkspaceData } from "./types.js";

export const boardGroups: Array<{ id: BoardGroup; label: string }> = [
  { id: "candidate", label: "Candidate" },
  { id: "needs_review", label: "Needs review" },
  { id: "approved", label: "Approved" },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
  { id: "failed", label: "Failed" }
];

export function mapCandidateToBoardGroup(status: CandidateStatus): BoardGroup {
  if (status === "ready_for_review") return "needs_review";
  if (status === "approved") return "approved";
  if (status === "scheduled") return "scheduled";
  if (status === "published") return "published";
  if (status === "publish_failed" || status === "rejected") return "failed";
  return "candidate";
}

export function formatDate(value?: string): string {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDay(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function accountLabel(account?: Account): string {
  if (!account) return "Unknown account";
  return account.displayName ?? account.handle;
}

export function conceptLabel(concept?: Concept): string {
  return concept?.name ?? "Unknown concept";
}

export function getAccount(data: WorkspaceData, id: string): Account | undefined {
  return data.accounts.find((account) => account.id === id);
}

export function getConcept(data: WorkspaceData, id: string): Concept | undefined {
  return data.concepts.find((concept) => concept.id === id);
}

export function getCandidate(data: WorkspaceData, id: string): PostCandidate | undefined {
  return data.candidates.find((candidate) => candidate.id === id);
}

export function scheduledCandidates(data: WorkspaceData): PostCandidate[] {
  return data.candidates
    .filter((candidate) => candidate.scheduledAt)
    .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
}

export function jobsByCandidate(data: WorkspaceData, candidateId: string): PublishJob[] {
  return data.publishJobs.filter((job) => job.candidateId === candidateId);
}

export function metadataText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function metadataBoolean(value: unknown): boolean {
  return value === true;
}
