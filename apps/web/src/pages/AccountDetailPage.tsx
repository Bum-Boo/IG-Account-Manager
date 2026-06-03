import { useEffect, useState } from "react";
import { MetricTile } from "../components/MetricTile.js";
import { PageHeader } from "../components/PageHeader.js";
import { RelationshipTrail } from "../components/RelationshipTrail.js";
import { EmptyState } from "../components/StateBlock.js";
import { StatusPill } from "../components/StatusPill.js";
import type { DataSource, InstagramConnectionStatus, WorkspaceData } from "../types.js";
import { accountLabel, formatDate, getConcept } from "../utils.js";

export function AccountDetailPage({
  data,
  accountId,
  source,
  onLoadInstagramConnection,
  onConnectInstagram,
  onSelectInstagramAccount,
  onDisconnectInstagram,
  onRefreshInstagramConnection
}: {
  data: WorkspaceData;
  accountId: string;
  source: DataSource;
  onLoadInstagramConnection(accountId: string): Promise<InstagramConnectionStatus>;
  onConnectInstagram(accountId: string): Promise<void>;
  onSelectInstagramAccount(accountId: string, instagramBusinessAccountId: string): Promise<InstagramConnectionStatus>;
  onDisconnectInstagram(accountId: string): Promise<InstagramConnectionStatus>;
  onRefreshInstagramConnection(accountId: string): Promise<InstagramConnectionStatus>;
}) {
  const account = data.accounts.find((item) => item.id === accountId);
  const [connection, setConnection] = useState<InstagramConnectionStatus>();
  const [connectionError, setConnectionError] = useState<string>();
  const [busyAction, setBusyAction] = useState<string>();
  const callbackStatus = getInstagramConnectionCallbackStatus();

  useEffect(() => {
    if (!account) {
      return;
    }

    let cancelled = false;
    setConnectionError(undefined);
    void onLoadInstagramConnection(account.id)
      .then((status) => {
        if (!cancelled) setConnection(status);
      })
      .catch((error) => {
        if (!cancelled) setConnectionError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [account, onLoadInstagramConnection]);

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

        <InstagramConnectionPanel
          busyAction={busyAction}
          callbackStatus={callbackStatus}
          connection={connection}
          disabled={source !== "api"}
          error={connectionError}
          onConnect={async () => {
            setBusyAction("connect");
            setConnectionError(undefined);
            try {
              await onConnectInstagram(account.id);
            } catch (error) {
              setConnectionError(error instanceof Error ? error.message : String(error));
            } finally {
              setBusyAction(undefined);
            }
          }}
          onDisconnect={async () => {
            setBusyAction("disconnect");
            setConnectionError(undefined);
            try {
              setConnection(await onDisconnectInstagram(account.id));
            } catch (error) {
              setConnectionError(error instanceof Error ? error.message : String(error));
            } finally {
              setBusyAction(undefined);
            }
          }}
          onRefresh={async () => {
            setBusyAction("refresh");
            setConnectionError(undefined);
            try {
              setConnection(await onRefreshInstagramConnection(account.id));
            } catch (error) {
              setConnectionError(error instanceof Error ? error.message : String(error));
            } finally {
              setBusyAction(undefined);
            }
          }}
          onSelect={async (instagramBusinessAccountId) => {
            setBusyAction(`select:${instagramBusinessAccountId}`);
            setConnectionError(undefined);
            try {
              setConnection(await onSelectInstagramAccount(account.id, instagramBusinessAccountId));
            } catch (error) {
              setConnectionError(error instanceof Error ? error.message : String(error));
            } finally {
              setBusyAction(undefined);
            }
          }}
        />
      </section>
    </main>
  );
}

function InstagramConnectionPanel({
  busyAction,
  callbackStatus,
  connection,
  disabled,
  error,
  onConnect,
  onDisconnect,
  onRefresh,
  onSelect
}: {
  busyAction?: string;
  callbackStatus?: string;
  connection?: InstagramConnectionStatus;
  disabled: boolean;
  error?: string;
  onConnect(): Promise<void>;
  onDisconnect(): Promise<void>;
  onRefresh(): Promise<void>;
  onSelect(instagramBusinessAccountId: string): Promise<void>;
}) {
  const status = connection?.status ?? "not_connected";
  const availableAccounts = connection?.availableAccounts ?? [];
  const callbackMessage = callbackStatus ? instagramCallbackMessage(status === "connected" ? "connected" : callbackStatus) : undefined;

  return (
    <div className="panel instagram-connection-panel">
      <div className="section-heading">
        <h2>Instagram connection</h2>
        <StatusPill value={status} />
      </div>

      {callbackMessage ? <p className={`connection-notice status-${callbackStatus}`}>{callbackMessage}</p> : null}

      <div className="metadata-grid">
        <div>
          <span>Handle</span>
          <strong>{connection?.handle ? `@${connection.handle}` : "Not linked"}</strong>
        </div>
        <div>
          <span>Business account</span>
          <strong>{connection?.externalAccountId ?? "Not selected"}</strong>
        </div>
        <div>
          <span>Token expiry</span>
          <strong>{formatDate(connection?.expiresAt)}</strong>
        </div>
      </div>

      {availableAccounts.length > 0 ? (
        <div className="connection-choice-list">
          {availableAccounts.map((option) => (
            <button
              className="choice-button"
              disabled={disabled || busyAction === `select:${option.instagramBusinessAccountId}`}
              key={option.instagramBusinessAccountId}
              onClick={() => onSelect(option.instagramBusinessAccountId)}
              type="button"
            >
              <strong>@{option.username}</strong>
              <span>{option.pageName}</span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {disabled ? <p className="muted-copy">Connect through the local API source.</p> : null}

      <div className="button-row">
        <button className="small-button" disabled={disabled || busyAction === "connect"} onClick={onConnect} type="button">
          {status === "connected" ? "Reconnect" : "Connect Instagram"}
        </button>
        <button className="small-button" disabled={disabled || status !== "connected" || busyAction === "refresh"} onClick={onRefresh} type="button">
          Refresh token
        </button>
        <button className="small-button danger" disabled={disabled || status === "not_connected" || busyAction === "disconnect"} onClick={onDisconnect} type="button">
          Disconnect
        </button>
      </div>
    </div>
  );
}

function getInstagramConnectionCallbackStatus(): string | undefined {
  const query = window.location.hash.split("?")[1];

  if (!query) {
    return undefined;
  }

  return new URLSearchParams(query).get("instagramConnection") ?? undefined;
}

function instagramCallbackMessage(status: string): string {
  if (status === "connected") return "Instagram connection is ready.";
  if (status === "pending_selection") return "Select the matching business account.";
  if (status === "failed") return "Instagram connection needs attention.";
  return "Instagram connection updated.";
}
