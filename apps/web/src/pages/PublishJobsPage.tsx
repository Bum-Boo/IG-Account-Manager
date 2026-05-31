import { PageHeader } from "../components/PageHeader.js";
import { EmptyState } from "../components/StateBlock.js";
import { StatusPill } from "../components/StatusPill.js";
import type { WorkspaceData } from "../types.js";
import { formatDate, getAccount, getCandidate, getConcept } from "../utils.js";

export function PublishJobsPage({
  data,
  onRetry
}: {
  data: WorkspaceData;
  onRetry(id: string): Promise<void>;
}) {
  return (
    <main className="content-area">
      <PageHeader eyebrow="Publish jobs" title="Worker monitor">
        Local publish queue, retry state, and plugin execution results.
      </PageHeader>

      {data.publishJobs.length === 0 ? (
        <EmptyState title="No publish jobs" />
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
              <span></span>
            </div>
            {data.publishJobs.map((job) => {
              const candidate = getCandidate(data, job.candidateId);
              const concept = candidate ? getConcept(data, candidate.conceptId) : undefined;
              const account = getAccount(data, job.accountId);
              const plugin = data.plugins.find((item) => item.id === job.pluginRegistrationId);
              return (
                <div className="table-row" key={job.id}>
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
                  <span>
                    {job.status === "retry_scheduled" && job.attempt < job.maxAttempts ? (
                      <button className="small-button" onClick={() => void onRetry(job.id)} type="button">
                        Retry
                      </button>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
