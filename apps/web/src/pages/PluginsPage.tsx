import { PageHeader } from "../components/PageHeader.js";
import { EmptyState, ErrorState } from "../components/StateBlock.js";
import { StatusPill } from "../components/StatusPill.js";
import { useAction } from "../hooks/useAction.js";
import type { WorkspaceData } from "../types.js";

export function PluginsPage({
  data,
  onToggle
}: {
  data: WorkspaceData;
  onToggle(id: string, enabled: boolean): Promise<void>;
}) {
  const action = useAction();

  return (
    <main className="content-area">
      <PageHeader eyebrow="Plugins" title="Plugin registry">
        Publisher, analytics, importer, generator, validator, and workflow extensions.
      </PageHeader>

      {action.error ? <ErrorState message={action.error} /> : null}

      {data.plugins.length === 0 ? (
        <EmptyState title="No plugins registered" />
      ) : (
        <section className="entity-grid">
          {data.plugins.map((plugin) => (
            <article className="entity-card" key={plugin.id}>
              <div className="card-heading">
                <div>
                  <strong>{plugin.name}</strong>
                  <span>{plugin.pluginId}</span>
                </div>
                <StatusPill value={plugin.enabled ? "enabled" : "disabled"} />
              </div>
              <div className="plugin-meta">
                <StatusPill value={plugin.type} />
                <span>v{plugin.version}</span>
                <span>{plugin.officialApiOnly ? "Official API only" : "Not publish-safe"}</span>
              </div>
              <div className="tag-row">
                {plugin.capabilities.map((capability) => (
                  <span className="tag" key={capability}>
                    {capability}
                  </span>
                ))}
              </div>
              <div className="action-row">
                <button
                  className="small-button"
                  disabled={action.busy === plugin.id}
                  onClick={() => void action.run(plugin.id, () => onToggle(plugin.id, !plugin.enabled))}
                  type="button"
                >
                  {plugin.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
