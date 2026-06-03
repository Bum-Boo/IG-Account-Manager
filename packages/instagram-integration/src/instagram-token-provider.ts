import type {
  InstagramAccessToken,
  InstagramTokenProvider,
  InstagramTokenRequest
} from "@ig-manager/plugin-official-instagram-publisher";
import type { AccountConnectionRepository } from "@ig-manager/db";
import type { EncryptedTokenVault } from "./token-vault.js";

export interface VaultInstagramTokenProviderOptions {
  connections: AccountConnectionRepository;
  vault: EncryptedTokenVault;
  now?: () => Date;
}

export class VaultInstagramTokenProvider implements InstagramTokenProvider {
  private readonly now: () => Date;

  constructor(private readonly options: VaultInstagramTokenProviderOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async getAccessToken(request: InstagramTokenRequest): Promise<InstagramAccessToken | undefined> {
    const connection = this.options.connections.getByAccountProvider(request.accountId, "instagram");

    if (!connection || connection.status !== "connected" || !connection.tokenRef) {
      return undefined;
    }

    if (request.externalAccountId && connection.externalAccountId !== request.externalAccountId) {
      return undefined;
    }

    if (!hasRequiredScopes(connection.scopes, request.requiredScopes)) {
      return undefined;
    }

    const token = this.options.vault.read(connection.tokenRef);

    if (!token) {
      return undefined;
    }

    if (token.expiresAt && Date.parse(token.expiresAt) <= this.now().getTime()) {
      return undefined;
    }

    return {
      accessToken: token.pageAccessToken ?? token.accessToken,
      expiresAt: token.expiresAt,
      scopes: token.scopes ?? connection.scopes
    };
  }
}

function hasRequiredScopes(granted: readonly string[], required: readonly string[]): boolean {
  const grantedSet = new Set(granted.map((scope) => scope.toLowerCase()));
  return required.every((scope) => grantedSet.has(scope.toLowerCase()));
}
