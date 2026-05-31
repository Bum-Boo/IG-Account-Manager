import { PageHeader } from "../components/PageHeader.js";
import { EmptyState } from "../components/StateBlock.js";
import type { WorkspaceData } from "../types.js";
import { accountLabel, getAccount } from "../utils.js";

export function ConceptsPage({ data }: { data: WorkspaceData }) {
  return (
    <main className="content-area">
      <PageHeader eyebrow="Concepts" title="Concept profiles">
        Audience, voice, visual identity, caption identity, and workflow policy by account.
      </PageHeader>

      {data.concepts.length === 0 ? (
        <EmptyState title="No concepts yet" />
      ) : (
        <section className="entity-grid">
          {data.concepts.map((concept) => {
            const account = getAccount(data, concept.accountId);
            const candidateCount = data.candidates.filter((candidate) => candidate.conceptId === concept.id).length;
            return (
              <a className="entity-card" href={`#/concepts/${concept.id}`} key={concept.id}>
                <div className="card-heading">
                  <div>
                    <strong>{concept.name}</strong>
                    <span>{accountLabel(account)}</span>
                  </div>
                </div>
                <p>{concept.description}</p>
                <div className="tag-row">
                  {concept.pillars.map((pillar) => (
                    <span className="tag" key={pillar}>
                      {pillar}
                    </span>
                  ))}
                </div>
                <div className="mini-stats">
                  <span>{candidateCount} candidates</span>
                  <span>{concept.voice}</span>
                </div>
              </a>
            );
          })}
        </section>
      )}
    </main>
  );
}
