import type { PublisherPlugin } from "@ig-manager/plugin-sdk";
import {
  createInstagramPublisherPlugin,
  type InstagramPublisherConfigInput
} from "@ig-manager/plugin-official-instagram-publisher";
import type { AccountConnectionRepository, AccountRepository, SecretVaultRepository } from "@ig-manager/db";
import { readInstagramIntegrationConfig, type InstagramIntegrationConfig } from "./config.js";
import { InstagramConnectionService } from "./instagram-connection-service.js";
import { InstagramGraphHttpClient, type FetchLike } from "./instagram-graph-client.js";
import { VaultInstagramTokenProvider } from "./instagram-token-provider.js";
import { EncryptedTokenVault } from "./token-vault.js";

export interface InstagramRepositorySet {
  accounts: AccountRepository;
  accountConnections: AccountConnectionRepository;
  secretVault: SecretVaultRepository;
}

export interface CreateInstagramIntegrationOptions {
  repositories: InstagramRepositorySet;
  env?: NodeJS.ProcessEnv;
  config?: InstagramIntegrationConfig;
  fetch?: FetchLike;
  now?: () => Date;
}

export interface InstagramIntegration {
  config: InstagramIntegrationConfig;
  graphClient: InstagramGraphHttpClient;
  vault?: EncryptedTokenVault;
  tokenProvider?: VaultInstagramTokenProvider;
  connectionService?: InstagramConnectionService;
  createPublisher(config?: Partial<InstagramPublisherConfigInput>): PublisherPlugin;
}

export function createInstagramIntegration(options: CreateInstagramIntegrationOptions): InstagramIntegration {
  const config = options.config ?? readInstagramIntegrationConfig(options.env);
  const graphClient = new InstagramGraphHttpClient({
    fetch: options.fetch,
    config
  });
  const vault = config.tokenVaultKey
    ? new EncryptedTokenVault({
        repository: options.repositories.secretVault,
        key: config.tokenVaultKey,
        now: options.now
      })
    : undefined;
  const tokenProvider = vault
    ? new VaultInstagramTokenProvider({
        connections: options.repositories.accountConnections,
        vault,
        now: options.now
      })
    : undefined;
  const connectionService = vault
    ? new InstagramConnectionService({
        accounts: options.repositories.accounts,
        connections: options.repositories.accountConnections,
        vault,
        graphClient,
        config,
        now: options.now
      })
    : undefined;

  return {
    config,
    graphClient,
    vault,
    tokenProvider,
    connectionService,
    createPublisher: (publisherConfig) =>
      createInstagramPublisherPlugin({
        config: {
          mode: config.publishMode,
          graphApiBaseUrl: config.graphApiBaseUrl,
          graphApiVersion: config.graphApiVersion,
          requiredScopes: config.requiredScopes,
          ...publisherConfig
        },
        tokenProvider,
        apiClient: graphClient
      })
  };
}
