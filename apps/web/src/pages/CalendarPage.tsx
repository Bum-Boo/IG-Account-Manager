import { PageHeader } from "../components/PageHeader.js";
import { RelationshipTrail } from "../components/RelationshipTrail.js";
import { EmptyState } from "../components/StateBlock.js";
import { StatusPill } from "../components/StatusPill.js";
import type { PostCandidate, WorkspaceData } from "../types.js";
import { formatDate, formatDay, getAccount, getConcept, jobsByCandidate, scheduledCandidates } from "../utils.js";

export function CalendarPage({ data }: { data: WorkspaceData }) {
  const scheduled = scheduledCandidates(data);
  const groups = scheduled.reduce<Record<string, PostCandidate[]>>((accumulator, candidate) => {
    const key = candidate.scheduledAt?.slice(0, 10) ?? "unscheduled";
    accumulator[key] = [...(accumulator[key] ?? []), candidate];
    return accumulator;
  }, {});

  return (
    <main className="content-area">
      <PageHeader eyebrow="Calendar" title="Schedule view">
        Scheduled posts by account, concept, candidate, and publish job state.
      </PageHeader>

      {scheduled.length === 0 ? (
        <EmptyState title="Nothing scheduled" />
      ) : (
        <section className="calendar-grid">
          {Object.entries(groups).map(([day, candidates]) => (
            <div className="calendar-day" key={day}>
              <h2>{formatDay(`${day}T00:00:00.000Z`)}</h2>
              <div className="list-stack">
                {candidates.map((candidate) => {
                  const job = jobsByCandidate(data, candidate.id)[0];
                  return (
                    <article className="schedule-item" key={candidate.id}>
                      <RelationshipTrail
                        account={getAccount(data, candidate.accountId)}
                        concept={getConcept(data, candidate.conceptId)}
                        candidate={candidate}
                      />
                      <strong>{formatDate(candidate.scheduledAt)}</strong>
                      <p>{candidate.caption}</p>
                      {job ? <StatusPill value={job.status} /> : <StatusPill value={candidate.status} />}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
