import { randomUUID } from "node:crypto";
import type { Account } from "@ig-manager/domain";
import type { AccountConnectionRecord, AccountConnectionRepository, AccountRepository } from "@ig-manager/db";
import type { InstagramIntegrationConfig } from "./config.js";
import { assertOAuthConfigured } from "./config.js";
import { InstagramIntegrationError } from "./errors.js";
import type { EligibleInstagramAccount } from "./instagram-graph-client.js";
import { InstagramGraphHttpClient } from "./instagram-graph-client.js";
import { createInstagramOAuthState, verifyInstagramOAuthState } from "./oauth-state.js";
import type { EncryptedTokenVault, InstagramStoredTokenPayload } from "./token-vault.js";

export interface InstagramConnectionServiceOptions {
  accounts: AccountRepository;
  connections: AccountConnectionRepository;
  vault: EncryptedTokenVault;
  graphClient: InstagramGraphHttpClient;
  config: InstagramIntegrationConfig;
  now?: () => Date;
}

export interface PublicInstagramAccountOption {
  instagramBusinessAccountId: string;
  username: string;
  name?: string;
  pageId: string;
  pageName: string;
}

export interface InstagramConnectionStatus {
  accountId: string;
  provider: "instagram";
  status: "not_connected" | AccountConnectionRecord["status"];
  externalAccountId?: string;
  handle?: string;
  scopes: string[];
  expiresAt?: string;
  connectedAt?: string;
  availableAccounts?: PublicInstagramAccountOption[];
  metadata: Record<string, unknown>;
}

export interface StartInstagramConnectionResult {
  authorizationUrl: string;
  stateExpiresAt: string;
  scopes: string[];
}

export interface CompleteInstagramOAuthResult {
  status: InstagramConnectionStatus["status"];
  accountId: string;
  redirectUrl: string;
  connection: InstagramConnectionStatus;
}

export class InstagramConnectionService {
  private readonly now: () => Date;

  constructor(private readonly options: InstagramConnectionServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  startConnection(accountId: string): StartInstagramConnectionResult {
    this.requireAccount(accountId);
    const config = this.requireOAuthConfig();
    const stateSecret = this.stateSecret(config);
    const { state, expiresAt } = createInstagramOAuthState({
      accountId,
      secret: stateSecret,
      now: this.now()
    });

    return {
      authorizationUrl: this.options.graphClient.buildAuthorizationUrl({
        appId: config.appId,
        redirectUri: config.redirectUri,
        state,
        scopes: config.requiredScopes,
        graphApiVersion: config.graphApiVersion
      }),
      stateExpiresAt: expiresAt,
      scopes: config.requiredScopes
    };
  }

  async completeOAuthCallback(input: {
    state: string;
    code?: string;
    error?: string;
    errorDescription?: string;
    signal?: AbortSignal;
  }): Promise<CompleteInstagramOAuthResult> {
    const config = this.requireOAuthConfig();
    const payload = verifyInstagramOAuthState({
      state: input.state,
      secret: this.stateSecret(config),
      now: this.now()
    });

    if (input.error) {
      this.upsertFailedConnection(payload.accountId, input.errorDescription ?? input.error);
      throw new InstagramIntegrationError({
        code: "instagram_oauth_denied",
        message: input.errorDescription ?? "Instagram OAuth authorization was denied.",
        statusCode: 400
      });
    }

    if (!input.code) {
      this.upsertFailedConnection(payload.accountId, "OAuth callback did not include an authorization code.");
      throw new InstagramIntegrationError({
        code: "instagram_oauth_code_missing",
        message: "Instagram OAuth callback did not include an authorization code.",
        statusCode: 400
      });
    }

    const shortLived = await this.options.graphClient.exchangeCodeForAccessToken({
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: config.redirectUri,
      code: input.code,
      graphApiBaseUrl: config.graphApiBaseUrl,
      graphApiVersion: config.graphApiVersion,
      signal: input.signal
    });
    const longLived = await this.options.graphClient.exchangeForLongLivedAccessToken({
      appId: config.appId,
      appSecret: config.appSecret,
      accessToken: shortLived.accessToken,
      graphApiBaseUrl: config.graphApiBaseUrl,
      graphApiVersion: config.graphApiVersion,
      signal: input.signal
    });
    const eligibleAccounts = await this.options.graphClient.resolveEligibleInstagramAccounts({
      accessToken: longLived.accessToken,
      graphApiBaseUrl: config.graphApiBaseUrl,
      graphApiVersion: config.graphApiVersion,
      signal: input.signal
    });

    if (eligibleAccounts.length === 0) {
      this.upsertFailedConnection(payload.accountId, "No eligible Instagram professional account was found.");
      throw new InstagramIntegrationError({
        code: "instagram_professional_account_not_found",
        message: "No Instagram professional/business account connected to this Meta login was found.",
        statusCode: 409
      });
    }

    const tokenPayload = createTokenPayload({
      baseToken: longLived,
      scopes: config.requiredScopes,
      eligibleAccounts
    });
    const tokenRef = this.options.vault.store(tokenPayload, {
      provider: "instagram",
      accountId: payload.accountId,
      candidateAccountCount: eligibleAccounts.length
    });

    if (eligibleAccounts.length === 1) {
      const selected = eligibleAccounts[0] as EligibleInstagramAccount;
      const selectedPayload: InstagramStoredTokenPayload = {
        ...tokenPayload,
        pageAccessToken: selected.pageAccessToken,
        pageId: selected.pageId,
        instagramBusinessAccountId: selected.instagramBusinessAccountId,
        availableAccounts: undefined
      };
      this.options.vault.replace(tokenRef, selectedPayload, {
        provider: "instagram",
        accountId: payload.accountId,
        pageId: selected.pageId,
        instagramBusinessAccountId: selected.instagramBusinessAccountId
      });
      const connection = this.connectSelectedAccount(payload.accountId, selected, tokenRef, selectedPayload);
      return {
        status: "connected",
        accountId: payload.accountId,
        redirectUrl: this.buildRedirectUrl(payload.accountId, "connected"),
        connection: this.toStatus(connection)
      };
    }

    const connection = this.options.connections.upsert({
      id: `account_connection_${randomUUID()}`,
      accountId: payload.accountId,
      provider: "instagram",
      status: "pending_selection",
      scopes: config.requiredScopes,
      tokenRef,
      expiresAt: longLived.expiresAt,
      metadata: {
        availableAccounts: eligibleAccounts.map(toPublicAccountOption)
      },
      createdAt: this.now().toISOString(),
      updatedAt: this.now().toISOString()
    });

    return {
      status: "pending_selection",
      accountId: payload.accountId,
      redirectUrl: this.buildRedirectUrl(payload.accountId, "pending_selection"),
      connection: this.toStatus(connection)
    };
  }

  selectAccount(accountId: string, instagramBusinessAccountId: string): InstagramConnectionStatus {
    const connection = this.options.connections.getByAccountProvider(accountId, "instagram");

    if (!connection || connection.status !== "pending_selection" || !connection.tokenRef) {
      throw new InstagramIntegrationError({
        code: "instagram_connection_selection_unavailable",
        message: "No pending Instagram account selection is available for this account.",
        statusCode: 409
      });
    }

    const tokenPayload = this.options.vault.read(connection.tokenRef);
    const selected = tokenPayload?.availableAccounts?.find(
      (account) => account.instagramBusinessAccountId === instagramBusinessAccountId
    );

    if (!tokenPayload || !selected) {
      throw new InstagramIntegrationError({
        code: "instagram_connection_selection_invalid",
        message: "Selected Instagram account was not present in the pending OAuth result.",
        statusCode: 400
      });
    }

    const updatedPayload: InstagramStoredTokenPayload = {
      ...tokenPayload,
      pageAccessToken: selected.pageAccessToken,
      pageId: selected.pageId,
      instagramBusinessAccountId: selected.instagramBusinessAccountId,
      availableAccounts: undefined
    };
    this.options.vault.replace(connection.tokenRef, updatedPayload, {
      provider: "instagram",
      accountId,
      pageId: selected.pageId,
      instagramBusinessAccountId: selected.instagramBusinessAccountId
    });

    return this.toStatus(this.connectSelectedAccount(accountId, selected, connection.tokenRef, updatedPayload, connection));
  }

  getStatus(accountId: string): InstagramConnectionStatus {
    this.requireAccount(accountId);
    const connection = this.options.connections.getByAccountProvider(accountId, "instagram");

    if (!connection) {
      return {
        accountId,
        provider: "instagram",
        status: "not_connected",
        scopes: [],
        metadata: {}
      };
    }

    return this.toStatus(connection);
  }

  disconnect(accountId: string): InstagramConnectionStatus {
    const account = this.requireAccount(accountId);
    const connection = this.options.connections.getByAccountProvider(accountId, "instagram");
    const now = this.now().toISOString();

    if (!connection) {
      return {
        accountId,
        provider: "instagram",
        status: "not_connected",
        scopes: [],
        metadata: {}
      };
    }

    this.options.vault.delete(connection.tokenRef);
    const updatedConnection = this.options.connections.update({
      ...connection,
      status: "disconnected",
      tokenRef: undefined,
      expiresAt: undefined,
      metadata: {},
      updatedAt: now
    });
    this.options.accounts.update({
      ...account,
      externalAccountId: undefined,
      status: "disconnected",
      connectedAt: undefined,
      updatedAt: now
    });

    return this.toStatus(updatedConnection);
  }

  async refresh(accountId: string, signal?: AbortSignal): Promise<InstagramConnectionStatus> {
    const config = this.requireOAuthConfig();
    const connection = this.options.connections.getByAccountProvider(accountId, "instagram");

    if (!connection || connection.status !== "connected" || !connection.tokenRef) {
      throw new InstagramIntegrationError({
        code: "instagram_connection_not_connected",
        message: "Instagram account is not connected.",
        statusCode: 409
      });
    }

    const tokenPayload = this.options.vault.read(connection.tokenRef);

    if (!tokenPayload) {
      throw new InstagramIntegrationError({
        code: "instagram_token_unavailable",
        message: "Stored Instagram token was not available.",
        statusCode: 409
      });
    }

    const refreshed = await this.options.graphClient.exchangeForLongLivedAccessToken({
      appId: config.appId,
      appSecret: config.appSecret,
      accessToken: tokenPayload.accessToken,
      graphApiBaseUrl: config.graphApiBaseUrl,
      graphApiVersion: config.graphApiVersion,
      signal
    });
    const nextPayload: InstagramStoredTokenPayload = {
      ...tokenPayload,
      accessToken: refreshed.accessToken,
      tokenType: refreshed.tokenType,
      expiresAt: refreshed.expiresAt
    };
    this.options.vault.replace(connection.tokenRef, nextPayload, {
      provider: "instagram",
      accountId,
      refreshedAt: this.now().toISOString()
    });
    const updatedConnection = this.options.connections.update({
      ...connection,
      expiresAt: refreshed.expiresAt,
      updatedAt: this.now().toISOString()
    });

    return this.toStatus(updatedConnection);
  }

  private connectSelectedAccount(
    accountId: string,
    selected: EligibleInstagramAccount | PublicInstagramAccountOption,
    tokenRef: string,
    tokenPayload: InstagramStoredTokenPayload,
    existing?: AccountConnectionRecord
  ): AccountConnectionRecord {
    const account = this.requireAccount(accountId);
    const now = this.now().toISOString();
    const connection = this.options.connections.upsert({
      id: existing?.id ?? `account_connection_${randomUUID()}`,
      accountId,
      provider: "instagram",
      externalAccountId: selected.instagramBusinessAccountId,
      handle: selected.username,
      status: "connected",
      scopes: tokenPayload.scopes ?? this.options.config.requiredScopes,
      tokenRef,
      expiresAt: tokenPayload.expiresAt,
      metadata: {
        pageId: selected.pageId,
        pageName: selected.pageName
      },
      connectedAt: existing?.connectedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });

    this.options.accounts.update(toConnectedInstagramAccount(account, selected, this.options.config.graphApiBaseUrl, now));
    return connection;
  }

  private toStatus(connection: AccountConnectionRecord): InstagramConnectionStatus {
    const availableAccounts = Array.isArray(connection.metadata.availableAccounts)
      ? connection.metadata.availableAccounts.flatMap((item): PublicInstagramAccountOption[] => {
          const record = item !== null && typeof item === "object" ? (item as Record<string, unknown>) : undefined;

          if (
            typeof record?.instagramBusinessAccountId !== "string" ||
            typeof record.username !== "string" ||
            typeof record.pageId !== "string" ||
            typeof record.pageName !== "string"
          ) {
            return [];
          }

          return [
            {
              instagramBusinessAccountId: record.instagramBusinessAccountId,
              username: record.username,
              name: typeof record.name === "string" ? record.name : undefined,
              pageId: record.pageId,
              pageName: record.pageName
            }
          ];
        })
      : undefined;

    return {
      accountId: connection.accountId,
      provider: "instagram",
      status: connection.status,
      externalAccountId: connection.externalAccountId,
      handle: connection.handle,
      scopes: connection.scopes,
      expiresAt: connection.expiresAt,
      connectedAt: connection.connectedAt,
      availableAccounts,
      metadata: sanitizeConnectionMetadata(connection.metadata)
    };
  }

  private upsertFailedConnection(accountId: string, reason: string): void {
    const now = this.now().toISOString();
    const existing = this.options.connections.getByAccountProvider(accountId, "instagram");

    if (existing?.tokenRef) {
      this.options.vault.delete(existing.tokenRef);
    }

    this.options.connections.upsert({
      id: existing?.id ?? `account_connection_${randomUUID()}`,
      accountId,
      provider: "instagram",
      status: "failed",
      scopes: this.options.config.requiredScopes,
      metadata: { reason },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });
  }

  private requireAccount(accountId: string): Account {
    const account = this.options.accounts.getById(accountId);

    if (!account) {
      throw new InstagramIntegrationError({
        code: "account_not_found",
        message: `Account '${accountId}' was not found.`,
        statusCode: 404
      });
    }

    return account;
  }

  private requireOAuthConfig(): InstagramIntegrationConfig & {
    appId: string;
    appSecret: string;
    redirectUri: string;
    tokenVaultKey: string;
  } {
    try {
      assertOAuthConfigured(this.options.config);
    } catch (error) {
      throw new InstagramIntegrationError({
        code: "instagram_oauth_not_configured",
        message: error instanceof Error ? error.message : "Instagram OAuth is not configured.",
        statusCode: 503
      });
    }

    return this.options.config as InstagramIntegrationConfig & {
      appId: string;
      appSecret: string;
      redirectUri: string;
      tokenVaultKey: string;
    };
  }

  private stateSecret(config: InstagramIntegrationConfig & { tokenVaultKey: string }): string {
    return config.oauthStateSecret ?? config.tokenVaultKey;
  }

  private buildRedirectUrl(accountId: string, status: string): string {
    const base = this.options.config.webBaseUrl.replace(/\/+$/, "");
    return `${base}/#/accounts/${encodeURIComponent(accountId)}?instagramConnection=${encodeURIComponent(status)}`;
  }
}

function createTokenPayload(input: {
  baseToken: { accessToken: string; tokenType?: string; expiresAt?: string };
  scopes: string[];
  eligibleAccounts: EligibleInstagramAccount[];
}): InstagramStoredTokenPayload {
  return {
    accessToken: input.baseToken.accessToken,
    tokenType: input.baseToken.tokenType,
    expiresAt: input.baseToken.expiresAt,
    scopes: input.scopes,
    availableAccounts: input.eligibleAccounts
  };
}

function toConnectedInstagramAccount(
  account: Account,
  selected: Pick<EligibleInstagramAccount, "instagramBusinessAccountId" | "username" | "name">,
  graphApiBaseUrl: string,
  now: string
): Account {
  return {
    ...account,
    platform: {
      id: "instagram",
      displayName: "Instagram",
      officialApiBaseUrl: graphApiBaseUrl,
      metadata: account.platform.id === "instagram" ? account.platform.metadata : {}
    },
    externalAccountId: selected.instagramBusinessAccountId,
    handle: selected.username,
    displayName: selected.name ?? account.displayName,
    status: "connected",
    connectedAt: now,
    updatedAt: now
  };
}

function toPublicAccountOption(account: EligibleInstagramAccount): PublicInstagramAccountOption {
  return {
    instagramBusinessAccountId: account.instagramBusinessAccountId,
    username: account.username,
    name: account.name,
    pageId: account.pageId,
    pageName: account.pageName
  };
}

function sanitizeConnectionMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const { availableAccounts: _availableAccounts, token: _token, accessToken: _accessToken, ...rest } = metadata;
  return rest;
}
