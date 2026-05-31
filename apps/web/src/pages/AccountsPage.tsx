import { EmptyState } from "../components/StateBlock.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusPill } from "../components/StatusPill.js";
import type { WorkspaceData } from "../types.js";
import { accountLabel } from "../utils.js";

export function AccountsPage({ data }: { data: WorkspaceData }) {
  return (
    <main className="content-area">
      <PageHeader eyebrow="Accounts" title="Managed accounts">
        Each account owns concepts, assets, candidates, schedule policy, and publisher connections.
      </PageHeader>

      {data.accounts.length === 0 ? (
        <EmptyState title="No accounts yet" detail="Create an account through the local API or seed the workspace." />
      ) : (
        <section className="entity-grid">
          {data.accounts.map((account) => {
            const concepts = data.concepts.filter((concept) => concept.accountId === account.id);
            const candidates = data.candidates.filter((candidate) => candidate.accountId === account.id);
            return (
              <a className="entity-card" href={`#/accounts/${account.id}`} key={account.id}>
                <div className="card-heading">
                  <div>
                    <strong>{accountLabel(account)}</strong>
                    <span>@{account.handle}</span>
                  </div>
                  <StatusPill value={account.status} />
                </div>
                <div className="mini-stats">
                  <span>{concepts.length} concepts</span>
                  <span>{candidates.length} candidates</span>
                  <span>{account.schedulePolicy.timezone}</span>
                </div>
              </a>
            );
          })}
        </section>
      )}
    </main>
  );
}
