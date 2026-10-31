import { useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import type { DataSource } from "../types.js";

export function SettingsPage({
  apiBaseUrl,
  apiToken,
  source,
  onSave,
  onReload
}: {
  apiBaseUrl: string;
  apiToken: string;
  source?: DataSource;
  onSave(settings: { apiBaseUrl: string; apiToken: string }): void;
  onReload(): Promise<void>;
}) {
  const [draft, setDraft] = useState({ apiBaseUrl, apiToken });

  return (
    <main className="content-area">
      <PageHeader
        eyebrow="Settings"
        title="Local API settings"
        actions={
          <button className="primary-button" onClick={() => void onReload()} type="button">
            Reload data
          </button>
        }
      >
        Current source: {source === "api" ? "local API" : source === "sample" ? "sample preview (not saved)" : "not connected"}
      </PageHeader>

      <section className="editor-grid narrow">
        <div className="panel">
          <h2>Connection</h2>
          <label>
            API base URL
            <input value={draft.apiBaseUrl} onChange={(event) => setDraft({ ...draft, apiBaseUrl: event.target.value })} />
          </label>
          <label>
            Local token
            <input
              type="password"
              value={draft.apiToken}
              onChange={(event) => setDraft({ ...draft, apiToken: event.target.value })}
            />
          </label>
          <div className="action-row">
            <button className="primary-button" onClick={() => onSave(draft)} type="button">
              Save settings
            </button>
          </div>
        </div>

        <div className="panel">
          <h2>PWA</h2>
          <div className="policy-readout">
            <span>Install mode</span>
            <strong>Enabled in production build</strong>
          </div>
          <div className="policy-readout">
            <span>Offline fallback</span>
            <strong>Static shell</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
