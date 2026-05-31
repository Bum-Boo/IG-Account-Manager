import { MetricTile } from "../components/MetricTile.js";
import { PageHeader } from "../components/PageHeader.js";
import { RelationshipTrail } from "../components/RelationshipTrail.js";
import { EmptyState } from "../components/StateBlock.js";
import { StatusPill } from "../components/StatusPill.js";
import type { WorkspaceData } from "../types.js";
import { accountLabel, formatDate, getConcept } from "../utils.js";

export function AccountDetailPage({ data, accountId }: { data: WorkspaceData; accountId: string }) {
  const account = data.accounts.find((item) => item.id === accountId);

  if (!account) {
    return (
      <main className="content-area">
        <EmptyState title="Account not found" />
      </main>
    );
  }

  const concepts = data.concepts.filter((concept) => concept.accountId === account.id);
  const candidates = data.candidates.filter((candidate) => candidate.accountId === account.id);
  const jobs = data.publishJobs.filter((job) => job.accountId === account.id);

  return (
    <main className="content-area">
      <PageHeader eyebrow="Account detail" title={accountLabel(account)} actions={<StatusPill value={account.status} />}>
        @{account.handle} / {account.platform.displayName}
      </PageHeader>

      <section className="metrics-grid">
        <MetricTile label="Concepts" value={concepts.length} detail="Profiles under this account" />
        <MetricTile label="Candidates" value={candidates.length} detail="All workflow states" />
        <MetricTile label="Queued jobs" value={jobs.filter((job) => job.status === "queued").length} detail="Waiting to publish" />
        <MetricTile label="Daily limit" value={account.schedulePolicy.maxPostsPerDay} detail={account.schedulePolicy.timezone} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <h2>Concepts</h2>
            <a href="#/concepts">All concepts</a>
          </div>
          <div className="list-stack">
            {concepts.map((concept) => (
              <a className="list-row" href={`#/concepts/${concept.id}`} key={concept.id}>
                <div>
                  <strong>{concept.name}</strong>
                  <span>{concept.pillars.join(", ")}</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <h2>Recent candidates</h2>
            <a href="#/candidates">Open board</a>
          </div>
          <div className="list-stack">
            {candidates.slice(0, 6).map((candidate) => (
              <article className="list-row" key={candidate.id}>
                <div>
                  <RelationshipTrail account={account} concept={getConcept(data, candidate.conceptId)} candidate={candidate} />
                  <span>{formatDate(candidate.scheduledAt)}</span>
                </div>
                <StatusPill value={candidate.status} />
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
