import { MetricTile } from "../components/MetricTile.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusPill } from "../components/StatusPill.js";
import type { WorkspaceData } from "../types.js";
import { accountLabel, boardGroups, formatDate, getAccount, getConcept, mapCandidateToBoardGroup, scheduledCandidates } from "../utils.js";

export function DashboardPage({ data }: { data: WorkspaceData }) {
  const dueJobs = data.publishJobs.filter((job) => job.status === "queued" || job.status === "retry_scheduled");
  const reviewCount = data.candidates.filter((candidate) => mapCandidateToBoardGroup(candidate.status) === "needs_review").length;
  const nextScheduled = scheduledCandidates(data).slice(0, 5);

  return (
    <main className="content-area">
      <PageHeader eyebrow="Overview" title="Content operations">
        Account, concept, candidate, schedule, and publish state in one local workspace.
      </PageHeader>

      <section className="metrics-grid" aria-label="Workspace metrics">
        <MetricTile label="Accounts" value={data.accounts.length} detail={`${data.accounts.filter((account) => account.status === "connected").length} connected`} />
        <MetricTile label="Concepts" value={data.concepts.length} detail="Creative profiles" />
        <MetricTile label="Needs review" value={reviewCount} detail="Ready for decision" />
        <MetricTile label="Publish jobs" value={dueJobs.length} detail="Queued or retrying" />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <h2>Pipeline</h2>
            <a href="#/candidates">Open board</a>
          </div>
          <div className="status-summary">
            {boardGroups.map((group) => (
              <div key={group.id}>
                <span>{group.label}</span>
                <strong>{data.candidates.filter((candidate) => mapCandidateToBoardGroup(candidate.status) === group.id).length}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <h2>Next scheduled</h2>
            <a href="#/calendar">Open calendar</a>
          </div>
          <div className="list-stack">
            {nextScheduled.map((candidate) => {
              const account = getAccount(data, candidate.accountId);
              const concept = getConcept(data, candidate.conceptId);
              return (
                <article className="list-row" key={candidate.id}>
                  <div>
                    <strong>{concept?.name}</strong>
                    <span>
                      {accountLabel(account)} / {formatDate(candidate.scheduledAt)}
                    </span>
                  </div>
                  <StatusPill value={candidate.status} />
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
