import { PageHeader } from "../components/PageHeader.js";
import { EmptyState } from "../components/StateBlock.js";
import { StatusPill } from "../components/StatusPill.js";
import type { WorkspaceData } from "../types.js";
import { accountLabel, conceptLabel, getAccount, getConcept } from "../utils.js";

export function AssetsPage({ data }: { data: WorkspaceData }) {
  return (
    <main className="content-area">
      <PageHeader eyebrow="Assets" title="Content asset library">
        Owned media, templates, references, and reusable inputs linked to accounts and concepts.
      </PageHeader>

      {data.assets.length === 0 ? (
        <EmptyState title="No assets yet" />
      ) : (
        <section className="table-panel">
          <div className="data-table asset-table">
            <div className="table-row table-head">
              <span>Asset</span>
              <span>Type</span>
              <span>Linked account</span>
              <span>Linked concept</span>
              <span>Rights</span>
            </div>
            {data.assets.map((asset) => (
              <div className="table-row" key={asset.id}>
                <div>
                  <strong>{asset.title}</strong>
                  <span>{asset.tags.join(", ") || asset.uri}</span>
                </div>
                <StatusPill value={asset.type} />
                <span>{accountLabel(getAccount(data, asset.accountIds[0] ?? ""))}</span>
                <span>{conceptLabel(getConcept(data, asset.conceptIds[0] ?? ""))}</span>
                <span>{asset.rights.usage.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
