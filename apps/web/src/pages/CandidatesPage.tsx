import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import { RelationshipTrail } from "../components/RelationshipTrail.js";
import { EmptyState, ErrorState } from "../components/StateBlock.js";
import { StatusPill } from "../components/StatusPill.js";
import type { ContentAsset, PostCandidate, PublishJob, WorkspaceData } from "../types.js";
import {
  accountLabel,
  boardGroups,
  conceptLabel,
  formatDate,
  getAccount,
  getConcept,
  jobsByCandidate,
  mapCandidateToBoardGroup
} from "../utils.js";

type CandidateAction = "approve" | "reject" | "regenerate" | "schedule" | "retry";

export function CandidatesPage({
  data,
  selectedCandidateId,
  onApprove,
  onReject,
  onRequestRegeneration,
  onSchedule,
  onRetryJob
}: {
  data: WorkspaceData;
  selectedCandidateId?: string;
  onApprove(id: string): Promise<void>;
  onReject(id: string, reason?: string): Promise<void>;
  onRequestRegeneration(id: string): Promise<void>;
  onSchedule(id: string, scheduledAt: string): Promise<void>;
  onRetryJob(id: string): Promise<void>;
}) {
  const [actionError, setActionError] = useState<string>();
  const [busyAction, setBusyAction] = useState<CandidateAction>();
  const selectedCandidate = selectedCandidateId ? data.candidates.find((candidate) => candidate.id === selectedCandidateId) : undefined;
  const needsReview = data.candidates.filter((candidate) => candidate.status === "ready_for_review" || candidate.status === "changes_requested");

  async function runAction(action: CandidateAction, task: () => Promise<void>) {
    setActionError(undefined);
    setBusyAction(action);

    try {
      await task();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction(undefined);
    }
  }

  return (
    <main className="content-area candidates-page">
      <PageHeader eyebrow="Candidates" title="Post pipeline">
        Review generated candidates, make a decision, schedule approved work, and inspect publish job state.
      </PageHeader>

      {actionError ? <ErrorState message={actionError} /> : null}

      {data.candidates.length === 0 ? (
        <EmptyState title="No post candidates yet" detail="Generated candidates will appear here for review before scheduling." />
      ) : (
        <section className="candidate-review-layout" aria-label="Candidate review workspace">
          <div className="candidate-review-list">
            <section className="review-queue-panel" aria-labelledby="needs-review-title">
              <div className="section-heading">
                <div>
                  <h2 id="needs-review-title">Needs review</h2>
                  <p className="muted-copy">{needsReview.length} candidate{needsReview.length === 1 ? "" : "s"} waiting for a decision</p>
                </div>
                <a className="small-link" href="#/jobs">
                  Jobs
                </a>
              </div>
              {needsReview.length === 0 ? (
                <EmptyState title="Review queue is clear" detail="Approved, scheduled, and failed items remain visible below." />
              ) : (
                <div className="mobile-review-stack">
                  {needsReview.map((candidate) => (
                    <CandidateCard candidate={candidate} data={data} key={candidate.id} selected={candidate.id === selectedCandidateId} />
                  ))}
                </div>
              )}
            </section>

            <section className="board" aria-label="Candidate board">
              {boardGroups.map((group) => {
                const candidates = data.candidates.filter((candidate) => mapCandidateToBoardGroup(candidate.status) === group.id);
                return (
                  <div className="board-column" key={group.id}>
                    <div className="board-heading">
                      <h2>{group.label}</h2>
                      <span>{candidates.length}</span>
                    </div>
                    <div className="candidate-stack">
                      {candidates.length === 0 ? (
                        <p className="empty-column">No candidates</p>
                      ) : (
                        candidates.map((candidate) => (
                          <CandidateCard candidate={candidate} data={data} key={candidate.id} selected={candidate.id === selectedCandidateId} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          <CandidateDetailPanel
            busyAction={busyAction}
            candidate={selectedCandidate}
            data={data}
            missingCandidateId={selectedCandidateId}
            onApprove={(id) => runAction("approve", () => onApprove(id))}
            onReject={(id, reason) => runAction("reject", () => onReject(id, reason))}
            onRequestRegeneration={(id) => runAction("regenerate", () => onRequestRegeneration(id))}
            onRetryJob={(id) => runAction("retry", () => onRetryJob(id))}
            onSchedule={(id, scheduledAt) => runAction("schedule", () => onSchedule(id, scheduledAt))}
          />
        </section>
      )}
    </main>
  );
}

function CandidateCard({
  candidate,
  data,
  selected
}: {
  candidate: PostCandidate;
  data: WorkspaceData;
  selected: boolean;
}) {
  const account = getAccount(data, candidate.accountId);
  const concept = getConcept(data, candidate.conceptId);
  const jobs = jobsByCandidate(data, candidate.id);

  return (
    <a
      aria-current={selected ? "page" : undefined}
      className={`candidate-card candidate-card-link${selected ? " selected" : ""}`}
      href={`#/candidates/${candidate.id}`}
    >
      <div className="card-heading">
        <RelationshipTrail account={account} concept={concept} candidate={candidate} />
        <StatusPill value={candidate.status} />
      </div>
      <p>{candidate.caption}</p>
      <div className="mini-stats">
        <span>{candidate.format}</span>
        <span>{candidate.assetIds.length} assets</span>
        <span>{formatDate(candidate.scheduledAt)}</span>
        {jobs[0] ? <span>Job {jobs[0].status.replace(/_/g, " ")}</span> : null}
      </div>
    </a>
  );
}

function CandidateDetailPanel({
  candidate,
  data,
  missingCandidateId,
  busyAction,
  onApprove,
  onReject,
  onRequestRegeneration,
  onSchedule,
  onRetryJob
}: {
  candidate?: PostCandidate;
  data: WorkspaceData;
  missingCandidateId?: string;
  busyAction?: CandidateAction;
  onApprove(id: string): void;
  onReject(id: string, reason: string): void;
  onRequestRegeneration(id: string): void;
  onSchedule(id: string, scheduledAt: string): void;
  onRetryJob(id: string): void;
}) {
  const [rejectReason, setRejectReason] = useState("Needs revision before this can be scheduled.");
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocal(defaultScheduleDate()));
  const account = candidate ? getAccount(data, candidate.accountId) : undefined;
  const concept = candidate ? getConcept(data, candidate.conceptId) : undefined;
  const jobs = candidate ? jobsByCandidate(data, candidate.id) : [];
  const candidateAssets = useMemo(() => (candidate ? assetsForCandidate(data, candidate) : []), [candidate, data]);
  const selectedAssets = useMemo(() => (candidate ? selectedAssetsForCandidate(data, candidate) : []), [candidate, data]);
  const hashtags = candidate ? extractHashtags(candidate) : [];
  const canApprove = candidate?.status === "ready_for_review" || candidate?.status === "changes_requested";
  const canReject = candidate?.status === "ready_for_review" || candidate?.status === "approved" || candidate?.status === "changes_requested";
  const canRequestRegeneration = candidate?.status === "ready_for_review" || candidate?.status === "changes_requested";
  const canSchedule = candidate?.status === "approved";

  if (!candidate) {
    return (
      <aside className="candidate-detail-panel empty-detail" aria-label="Candidate detail">
        {missingCandidateId ? (
          <EmptyState title="Candidate not found" detail="Return to the candidate board and choose another item." />
        ) : (
          <EmptyState title="Select a candidate" detail="Tap a review item to inspect media, copy, assets, and job status." />
        )}
      </aside>
    );
  }

  const currentCandidate = candidate;
  const primaryJob = jobs[0];
  const retryableJob = jobs.find((job) => job.status === "retry_scheduled" && job.attempt < job.maxAttempts);
  const scheduleHint =
    currentCandidate.status === "approved"
      ? "Choose a publish time, then schedule this approved candidate."
      : currentCandidate.status === "scheduled"
        ? `Scheduled for ${formatDate(currentCandidate.scheduledAt)}.`
        : currentCandidate.status === "published"
          ? "This candidate has already been published."
          : currentCandidate.status === "publish_failed"
            ? "Resolve or retry the publish job before scheduling again."
            : "Approve this candidate before scheduling.";

  function scheduleCandidate() {
    const parsed = new Date(scheduledAt);

    if (!Number.isNaN(parsed.getTime())) {
      onSchedule(currentCandidate.id, parsed.toISOString());
    }
  }

  return (
    <aside className="candidate-detail-panel" aria-label={`Review candidate ${currentCandidate.id}`}>
      <div className="detail-header">
        <div>
          <a className="small-link" href="#/candidates">
            Back to board
          </a>
          <h2>{conceptLabel(concept)}</h2>
          <p className="muted-copy">{accountLabel(account)}</p>
        </div>
        <StatusPill value={candidate.status} />
      </div>

      <CandidateMedia assets={candidateAssets} candidate={candidate} />

      <section className="detail-section">
        <h3>Caption</h3>
        <p className="caption-preview">{candidate.caption}</p>
      </section>

      <section className="detail-section detail-grid">
        <div>
          <h3>Hashtags</h3>
          {hashtags.length === 0 ? (
            <p className="muted-copy">No hashtags detected.</p>
          ) : (
            <div className="tag-row">
              {hashtags.map((tag) => (
                <span className="tag" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3>First comment</h3>
          <p className="muted-copy">{candidate.firstComment?.text ?? "No first comment."}</p>
        </div>
      </section>

      <section className="detail-section">
        <h3>Concept</h3>
        <p className="muted-copy">{concept?.description ?? "Concept not found."}</p>
        {concept ? (
          <div className="tag-row">
            {concept.pillars.map((pillar) => (
              <span className="tag" key={pillar}>
                {pillar}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="detail-section">
        <h3>Selected assets</h3>
        {selectedAssets.length === 0 ? (
          <p className="muted-copy">No selected asset metadata was found.</p>
        ) : (
          <div className="asset-chip-list">
            {selectedAssets.map((asset) => (
              <AssetChip asset={asset} key={asset.id} />
            ))}
          </div>
        )}
      </section>

      <section className="detail-section">
        <h3>Review actions</h3>
        <div className="action-row review-actions">
          <button className="small-button" disabled={!canApprove || busyAction === "approve"} onClick={() => onApprove(candidate.id)} type="button">
            Approve
          </button>
          <button
            className="small-button danger"
            disabled={!canReject || busyAction === "reject"}
            onClick={() => onReject(candidate.id, rejectReason)}
            type="button"
          >
            Reject
          </button>
          <button
            className="small-button secondary"
            disabled={!canRequestRegeneration || busyAction === "regenerate"}
            onClick={() => onRequestRegeneration(candidate.id)}
            type="button"
          >
            Regenerate
          </button>
        </div>
        <label>
          Review note
          <textarea onChange={(event) => setRejectReason(event.target.value)} value={rejectReason} />
        </label>
      </section>

      <section className="detail-section">
        <h3>Schedule</h3>
        <div className="schedule-picker">
          <label>
            Publish time
            <input
              min={toDateTimeLocal(new Date())}
              onChange={(event) => setScheduledAt(event.target.value)}
              type="datetime-local"
              value={scheduledAt}
            />
          </label>
          <button className="primary-button" disabled={!canSchedule || busyAction === "schedule"} onClick={scheduleCandidate} type="button">
            Schedule approved
          </button>
        </div>
        <p className="muted-copy">{scheduleHint}</p>
      </section>

      <section className="detail-section">
        <h3>Job status</h3>
        {jobs.length === 0 ? (
          <p className="muted-copy">No publish job has been created yet.</p>
        ) : (
          <div className="job-stack">
            {jobs.map((job) => (
              <JobSummary job={job} key={job.id} onRetryJob={onRetryJob} retryable={job.id === retryableJob?.id} />
            ))}
          </div>
        )}
        {primaryJob?.lastError ? <p className="error-copy">{primaryJob.lastError.message}</p> : null}
      </section>
    </aside>
  );
}

function CandidateMedia({ candidate, assets }: { candidate: PostCandidate; assets: ContentAsset[] }) {
  const media = assets.find((asset) => asset.type === "image" && /^(https?:\/\/|data:image\/)/.test(asset.uri));
  const label = assets[0]?.title ?? candidate.format;

  return (
    <figure className="candidate-media">
      {media ? <img alt={media.title} src={media.uri} /> : <div className="media-placeholder">{label}</div>}
      <figcaption>
        {assets.length} asset{assets.length === 1 ? "" : "s"} / {candidate.format}
      </figcaption>
    </figure>
  );
}

function AssetChip({ asset }: { asset: ContentAsset }) {
  return (
    <div className="asset-chip">
      <strong>{asset.title}</strong>
      <span>
        {asset.type} / {asset.rights.usage}
      </span>
    </div>
  );
}

function JobSummary({
  job,
  retryable,
  onRetryJob
}: {
  job: PublishJob;
  retryable: boolean;
  onRetryJob(id: string): void;
}) {
  return (
    <div className="job-summary">
      <div>
        <strong>{job.id}</strong>
        <span>
          {formatDate(job.scheduledAt)} / attempt {job.attempt} of {job.maxAttempts}
        </span>
      </div>
      <StatusPill value={job.status} />
      {retryable ? (
        <button className="small-button" onClick={() => onRetryJob(job.id)} type="button">
          Retry
        </button>
      ) : null}
    </div>
  );
}

function assetsForCandidate(data: WorkspaceData, candidate: PostCandidate): ContentAsset[] {
  return candidate.assetIds.flatMap((assetId) => {
    const asset = data.assets.find((item) => item.id === assetId);
    return asset ? [asset] : [];
  });
}

function selectedAssetsForCandidate(data: WorkspaceData, candidate: PostCandidate): ContentAsset[] {
  const metadata = asRecord(candidate.metadata.aiContentFactory);
  const selectedAssetIds = Array.isArray(metadata?.selectedAssetIds)
    ? metadata.selectedAssetIds.filter((assetId): assetId is string => typeof assetId === "string")
    : candidate.provenance.sourceAssetIds.length > 0
      ? candidate.provenance.sourceAssetIds
      : candidate.assetIds;

  return selectedAssetIds.flatMap((assetId) => {
    const asset = data.assets.find((item) => item.id === assetId);
    return asset ? [asset] : [];
  });
}

function extractHashtags(candidate: PostCandidate): string[] {
  const metadata = asRecord(candidate.metadata.aiContentFactory);
  const metadataHashtags = Array.isArray(metadata?.hashtags)
    ? metadata.hashtags.filter((tag): tag is string => typeof tag === "string")
    : [];
  const captionHashtags = [...candidate.caption.matchAll(/#([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
  const seen = new Set<string>();

  return [...metadataHashtags, ...captionHashtags].flatMap((tag) => {
    const clean = tag.replace(/^#/, "").trim();
    const key = clean.toLowerCase();

    if (!clean || seen.has(key)) {
      return [];
    }

    seen.add(key);
    return [clean];
  });
}

function defaultScheduleDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date;
}

function toDateTimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
