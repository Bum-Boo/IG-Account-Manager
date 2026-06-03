import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/StateBlock.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusPill } from "../components/StatusPill.js";
import type { Account, DataSource, InstagramConnectionStatus, WorkspaceData } from "../types.js";
import { accountLabel, formatDate } from "../utils.js";

type ConnectionMap = Record<string, InstagramConnectionStatus>;

export function AccountsPage({
  data,
  source,
  onLoadInstagramConnection,
  onConnectInstagram,
  onSelectInstagramAccount,
  onRefreshInstagramConnection
}: {
  data: WorkspaceData;
  source: DataSource;
  onLoadInstagramConnection(accountId: string): Promise<InstagramConnectionStatus>;
  onConnectInstagram(accountId: string): Promise<void>;
  onSelectInstagramAccount(accountId: string, instagramBusinessAccountId: string): Promise<InstagramConnectionStatus>;
  onRefreshInstagramConnection(accountId: string): Promise<InstagramConnectionStatus>;
}) {
  const [connections, setConnections] = useState<ConnectionMap>({});
  const [connectionError, setConnectionError] = useState<string>();
  const [busyAction, setBusyAction] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setConnectionError(undefined);

    if (source !== "api") {
      setConnections(Object.fromEntries(data.accounts.map((account) => [account.id, connectionFromAccount(account)])));
      return () => {
        cancelled = true;
      };
    }

    void Promise.all(
      data.accounts.map(async (account) => {
        try {
          return [account.id, await onLoadInstagramConnection(account.id)] as const;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return [account.id, { ...connectionFromAccount(account), status: "failed", metadata: { reason: message } }] as const;
        }
      })
    )
      .then((items) => {
        if (!cancelled) setConnections(Object.fromEntries(items));
      })
      .catch((error) => {
        if (!cancelled) setConnectionError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [data.accounts, onLoadInstagramConnection, source]);

  const accountConnections = useMemo(
    () => data.accounts.map((account) => ({ account, connection: connections[account.id] ?? connectionFromAccount(account) })),
    [connections, data.accounts]
  );

  const connectAccount = async (accountId: string) => {
    setBusyAction(`connect:${accountId}`);
    setConnectionError(undefined);
    try {
      await onConnectInstagram(accountId);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : String(error));
      setBusyAction(undefined);
    }
  };

  const selectAccount = async (accountId: string, instagramBusinessAccountId: string) => {
    setBusyAction(`select:${accountId}:${instagramBusinessAccountId}`);
    setConnectionError(undefined);
    try {
      const updated = await onSelectInstagramAccount(accountId, instagramBusinessAccountId);
      setConnections((current) => ({ ...current, [accountId]: updated }));
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction(undefined);
    }
  };

  const refreshAccount = async (accountId: string) => {
    setBusyAction(`refresh:${accountId}`);
    setConnectionError(undefined);
    try {
      const updated = await onRefreshInstagramConnection(accountId);
      setConnections((current) => ({ ...current, [accountId]: updated }));
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction(undefined);
    }
  };

  return (
    <main className="content-area">
      <PageHeader
        eyebrow="Accounts"
        title="Managed accounts"
        actions={
          <button
            className="primary-button"
            disabled={source !== "api" || !nextConnectableAccount(accountConnections) || Boolean(busyAction)}
            onClick={() => {
              const next = nextConnectableAccount(accountConnections);
              if (next) void connectAccount(next.account.id);
            }}
            type="button"
          >
            Connect next
          </button>
        }
      >
        Account setup, publishing access, and connection health in one workspace.
      </PageHeader>

      {data.accounts.length === 0 ? (
        <EmptyState title="No accounts yet" detail="Create an account through the local API or seed the workspace." />
      ) : (
        <>
          <InstagramConnectionHub
            accountConnections={accountConnections}
            busyAction={busyAction}
            connectionError={connectionError}
            disabled={source !== "api"}
            onConnect={connectAccount}
            onRefresh={refreshAccount}
            onSelect={selectAccount}
          />

          <section className="entity-grid">
            {data.accounts.map((account) => {
              const concepts = data.concepts.filter((concept) => concept.accountId === account.id);
              const candidates = data.candidates.filter((candidate) => candidate.accountId === account.id);
              const connection = connections[account.id] ?? connectionFromAccount(account);
              return (
                <a className="entity-card" href={`#/accounts/${account.id}`} key={account.id}>
                  <div className="card-heading">
                    <div>
                      <strong>{accountLabel(account)}</strong>
                      <span>@{connection.handle ?? account.handle}</span>
                    </div>
                    <StatusPill value={connection.status} />
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
        </>
      )}
    </main>
  );
}

function InstagramConnectionHub({
  accountConnections,
  busyAction,
  connectionError,
  disabled,
  onConnect,
  onRefresh,
  onSelect
}: {
  accountConnections: Array<{ account: Account; connection: InstagramConnectionStatus }>;
  busyAction?: string;
  connectionError?: string;
  disabled: boolean;
  onConnect(accountId: string): Promise<void>;
  onRefresh(accountId: string): Promise<void>;
  onSelect(accountId: string, instagramBusinessAccountId: string): Promise<void>;
}) {
  const summary = summarizeConnections(accountConnections);
  const connectedPercent = accountConnections.length === 0 ? 0 : Math.round((summary.connected / accountConnections.length) * 100);

  return (
    <section className="panel connection-hub">
      <div className="section-heading">
        <div>
          <h2>Instagram setup</h2>
          <p className="muted-copy">{summary.connected} of {accountConnections.length} ready for publishing</p>
        </div>
        <StatusPill value={summary.attention > 0 ? "attention" : summary.pending > 0 ? "pending_selection" : "ready"} />
      </div>

      <div className="connection-progress" aria-label={`${connectedPercent}% connected`}>
        <span style={{ width: `${connectedPercent}%` }} />
      </div>

      <div className="connection-summary-grid">
        <SummaryTile label="Connected" value={summary.connected} />
        <SummaryTile label="Needs setup" value={summary.needsSetup} />
        <SummaryTile label="Selection" value={summary.pending} />
        <SummaryTile label="Attention" value={summary.attention} />
      </div>

      {connectionError ? <p className="form-error">{connectionError}</p> : null}
      {disabled ? <p className="muted-copy">Local API source required.</p> : null}

      <div className="connection-account-list">
        {accountConnections.map(({ account, connection }) => (
          <ConnectionAccountRow
            account={account}
            busyAction={busyAction}
            connection={connection}
            disabled={disabled}
            key={account.id}
            onConnect={onConnect}
            onRefresh={onRefresh}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ConnectionAccountRow({
  account,
  busyAction,
  connection,
  disabled,
  onConnect,
  onRefresh,
  onSelect
}: {
  account: Account;
  busyAction?: string;
  connection: InstagramConnectionStatus;
  disabled: boolean;
  onConnect(accountId: string): Promise<void>;
  onRefresh(accountId: string): Promise<void>;
  onSelect(accountId: string, instagramBusinessAccountId: string): Promise<void>;
}) {
  const availableAccounts = connection.availableAccounts ?? [];
  const canRefresh = connection.status === "connected";
  const isBusy = Boolean(busyAction?.startsWith(`connect:${account.id}`) || busyAction?.startsWith(`refresh:${account.id}`));

  return (
    <article className="connection-account-row">
      <div className="connection-account-main">
        <div className="connection-account-title">
          <strong>{accountLabel(account)}</strong>
          <span>@{connection.handle ?? account.handle}</span>
        </div>
        <StatusPill value={connection.status} />
      </div>

      <div className="connection-account-meta">
        <span>{connection.externalAccountId ?? "No business account"}</span>
        <span>{connection.expiresAt ? formatDate(connection.expiresAt) : "No token"}</span>
      </div>

      {availableAccounts.length > 0 ? (
        <div className="connection-choice-list compact">
          {availableAccounts.map((option) => {
            const selectAction = `select:${account.id}:${option.instagramBusinessAccountId}`;
            return (
              <button
                className="choice-button"
                disabled={disabled || Boolean(busyAction)}
                key={option.instagramBusinessAccountId}
                onClick={() => onSelect(account.id, option.instagramBusinessAccountId)}
                type="button"
              >
                <strong>@{option.username}</strong>
                <span>{option.pageName}</span>
                {busyAction === selectAction ? <small>Saving</small> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="connection-account-actions">
        <button className="small-button" disabled={disabled || Boolean(busyAction)} onClick={() => onConnect(account.id)} type="button">
          {connection.status === "connected" ? "Reconnect" : "Connect"}
        </button>
        <button className="small-button secondary" disabled={disabled || !canRefresh || isBusy} onClick={() => onRefresh(account.id)} type="button">
          Refresh
        </button>
        <a className="small-button secondary link-button" href={`#/accounts/${account.id}`}>
          Details
        </a>
      </div>
    </article>
  );
}

function summarizeConnections(accountConnections: Array<{ connection: InstagramConnectionStatus }>) {
  return accountConnections.reduce(
    (summary, { connection }) => {
      if (connection.status === "connected") summary.connected += 1;
      else if (connection.status === "pending_selection") summary.pending += 1;
      else if (connection.status === "failed") summary.attention += 1;
      else summary.needsSetup += 1;
      return summary;
    },
    { connected: 0, needsSetup: 0, pending: 0, attention: 0 }
  );
}

function nextConnectableAccount(accountConnections: Array<{ account: Account; connection: InstagramConnectionStatus }>) {
  return accountConnections.find(({ connection }) =>
    connection.status === "not_connected" || connection.status === "disconnected" || connection.status === "failed"
  );
}

function connectionFromAccount(account: Account): InstagramConnectionStatus {
  const status =
    account.status === "connected" && account.externalAccountId
      ? "connected"
      : account.status === "disconnected"
        ? "disconnected"
        : "not_connected";

  return {
    accountId: account.id,
    provider: "instagram",
    status,
    externalAccountId: account.externalAccountId,
    handle: account.handle,
    scopes: [],
    connectedAt: account.connectedAt,
    metadata: {}
  };
}
