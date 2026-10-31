import { AuditLogList, sortAuditLogs } from "../components/AuditLogList.js";
import { PageHeader } from "../components/PageHeader.js";
import { EmptyState, ErrorState } from "../components/StateBlock.js";
import { StatusPill } from "../components/StatusPill.js";
import { useAction } from "../hooks/useAction.js";
import type { WorkspaceData } from "../types.js";
import { canRunJob, formatDate, getAccount, getCandidate, getConcept, jobResultText } from "../utils.js";

export function PublishJobsPage({
  data,
  refreshing,
  onRunJob,
  onRefresh
}: {
  data: WorkspaceData;
  refreshing: boolean;
  onRunJob(id: string): Promise<void>;
  onRefresh(): Promise<void>;
}) {
  const action = useAction();
  const auditLogs = sortAuditLogs(data.auditLogs).slice(0, 40);

  return (
    <main className="content-area">
      <PageHeader
        eyebrow="Publish jobs"
        title="Worker monitor"
        actions={
          <button className="primary-button" disabled={refreshing} onClick={() => void action.run("refresh", onRefresh)} type="button">
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        }
      >
        Local publish queue, run requests, results and the audit log.
      </PageHeader>

      <p className="muted-copy worker-hint">
        <strong>Run now</strong> hands a job to the local worker, which publishes with the mock publisher (no external calls). The worker
        runs with <code>pnpm dev</code> and polls every 30 seconds, or run <code>pnpm worker:once</code>. Then press Refresh.
      </p>

      {action.error ? <ErrorState message={action.error} /> : null}

      {data.publishJobs.length === 0 ? (
        <EmptyState title="No publish jobs" detail="Schedule an approved candidate to create one." />
      ) : (
        <section className="table-panel">
          <div className="data-table jobs-table">
            <div className="table-row table-head">
              <span>Job</span>
              <span>Candidate</span>
              <span>Plugin</span>
              <span>Scheduled</span>
              <span>Status</span>
              <span>Attempts</span>
              <span>Result</span>
              <span></span>
            </div>
            {data.publishJobs.map((job) => {
              const candidate = getCandidate(data, job.candidateId);
              const concept = candidate ? getConcept(data, candidate.conceptId) : undefined;
              const account = getAccount(data, job.accountId);
              const plugin = data.plugins.find((item) => item.id === job.pluginRegistrationId);
              return (
                <div className="table-row" data-job-id={job.id} key={job.id}>
                  <strong>{job.id}</strong>
                  <div>
                    <strong>{concept?.name ?? candidate?.id ?? "Unknown candidate"}</strong>
                    <span>{account?.handle ?? "Unknown account"}</span>
                  </div>
                  <span>{plugin?.name ?? job.pluginRegistrationId}</span>
                  <span>{formatDate(job.scheduledAt)}</span>
                  <StatusPill value={job.status} />
                  <span>
                    {job.attempt}/{job.maxAttempts}
                  </span>
                  <span className="job-result">{jobResultText(job)}</span>
                  <span>
                    {canRunJob(job) ? (
                      <button
                        className="small-button"
                        disabled={action.busy === job.id}
                        onClick={() => void action.run(job.id, () => onRunJob(job.id))}
                        type="button"
                      >
                        {job.status === "retry_scheduled" ? "Retry now" : "Run now"}
                      </button>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel" aria-labelledby="audit-log-title">
        <div className="section-heading">
          <h2 id="audit-log-title">Audit log</h2>
          <span className="muted-copy">Newest first, latest {auditLogs.length}</span>
        </div>
        <AuditLogList entries={auditLogs} />
      </section>
    </main>
  );
}
