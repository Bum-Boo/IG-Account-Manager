import { useState } from "react";
import { formatDate } from "../utils.js";

/** Shown when the first load failed: there is no workspace data to keep. */
export function ConnectionProblem({
  error,
  retrying,
  onRetry,
  onOpenSample
}: {
  error?: string;
  retrying: boolean;
  onRetry(): Promise<void>;
  onOpenSample(): void;
}) {
  return (
    <main className="content-area">
      <section className="panel notice-panel error" role="alert" aria-labelledby="connection-problem-title">
        <h2 id="connection-problem-title">The local API is not reachable</h2>
        <p>{error ?? "No response from the local API yet."}</p>
        <p className="muted-copy">
          Start the app with <code>pnpm dev</code> (API, dashboard and worker) or check the API address on the Settings page. Nothing was
          changed in your workspace.
        </p>
        <div className="action-row">
          <button className="primary-button" disabled={retrying} onClick={() => void onRetry()} type="button">
            {retrying ? "Retrying..." : "Retry"}
          </button>
          <a className="utility-link" href="#/settings">
            API settings
          </a>
          <button className="small-button secondary" onClick={onOpenSample} type="button">
            Open sample preview
          </button>
        </div>
        <p className="muted-copy">The sample preview uses built-in example data in this browser only. Nothing in it is saved.</p>
      </section>
    </main>
  );
}

/** Shown above the page when a refresh failed but earlier data is still on screen. */
export function StaleDataNotice({
  error,
  loadedAt,
  retrying,
  onRetry
}: {
  error: string;
  loadedAt?: string;
  retrying: boolean;
  onRetry(): Promise<void>;
}) {
  return (
    <div className="content-area notice-strip">
      <div className="state-block error" role="alert">
        <strong>Could not refresh from the local API</strong>
        <span>{error}</span>
        <span>
          {loadedAt
            ? `You are still looking at your workspace as loaded at ${formatDate(loadedAt)}. Nothing was replaced.`
            : "Your current view was kept. Nothing was replaced."}
        </span>
        <div className="action-row">
          <button className="small-button" disabled={retrying} onClick={() => void onRetry()} type="button">
            {retrying ? "Retrying..." : "Retry"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SampleBanner({ retrying, onConnect }: { retrying: boolean; onConnect(): Promise<void> }) {
  return (
    <div className="content-area notice-strip">
      <div className="state-block sample" role="status">
        <strong>Sample preview: example data, not saved</strong>
        <span>Changes here stay in this browser tab. Workers, seeding and publishing need the local API.</span>
        <div className="action-row">
          <button className="small-button" disabled={retrying} onClick={() => void onConnect()} type="button">
            {retrying ? "Connecting..." : "Connect to local API"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Onboarding for a connected but empty workspace. */
export function EmptyWorkspacePanel({ onSeed }: { onSeed(): Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function seed() {
    setBusy(true);
    setError(undefined);

    try {
      await onSeed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content-area notice-strip">
      <section className="panel notice-panel" aria-labelledby="empty-workspace-title">
        <h2 id="empty-workspace-title">Your workspace is empty</h2>
        <p>
          Load the starter seed to get one synthetic account, two concepts, three candidates ready for review and a mock publisher. It is
          saved in your local workspace and marked as seed data. No external service is contacted.
        </p>
        {error ? <p className="error-copy">{error}</p> : null}
        <div className="action-row">
          <button className="primary-button" disabled={busy} onClick={() => void seed()} type="button">
            {busy ? "Loading seed..." : "Load starter seed"}
          </button>
        </div>
      </section>
    </div>
  );
}
