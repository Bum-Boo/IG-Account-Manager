import type {
  Account,
  AuditLog,
  Concept,
  ContentAsset,
  ContentRecipe,
  NewCandidateInput,
  PluginRegistration,
  PostCandidate,
  PublishJob,
  SeedResult,
  WorkspaceData
} from "../types.js";

interface ApiResponse<TData> {
  data: TData;
}

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
}

export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  async listAccounts(): Promise<Account[]> {
    return this.get<Account[]>("/accounts");
  }

  async listConcepts(accounts: Account[]): Promise<Concept[]> {
    const nested = await Promise.all(accounts.map((account) => this.get<Concept[]>(`/accounts/${account.id}/concepts`)));
    return nested.flat();
  }

  async updateConcept(id: string, patch: Partial<Concept>): Promise<Concept> {
    return this.request<Concept>(`/concepts/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    });
  }

  async listAssets(): Promise<ContentAsset[]> {
    return this.get<ContentAsset[]>("/assets");
  }

  async listRecipes(): Promise<ContentRecipe[]> {
    return this.get<ContentRecipe[]>("/recipes");
  }

  async listCandidates(): Promise<PostCandidate[]> {
    return this.get<PostCandidate[]>("/candidates");
  }

  async createCandidate(input: NewCandidateInput): Promise<PostCandidate> {
    return this.request<PostCandidate>("/candidates", {
      method: "POST",
      body: JSON.stringify({ ...input, status: "ready_for_review" })
    });
  }

  async seedWorkspace(): Promise<SeedResult> {
    return this.request<SeedResult>("/workspace/seed", {
      method: "POST",
      body: JSON.stringify({})
    });
  }

  async approveCandidate(id: string): Promise<PostCandidate> {
    return this.request<PostCandidate>(`/candidates/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({})
    });
  }

  async rejectCandidate(id: string, reason: string): Promise<PostCandidate> {
    return this.request<PostCandidate>(`/candidates/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  }

  async scheduleCandidate(id: string, publisherPluginId: string, scheduledAt: string): Promise<{
    candidate: PostCandidate;
    publishJob: PublishJob;
  }> {
    return this.request<{ candidate: PostCandidate; publishJob: PublishJob }>(`/candidates/${id}/schedule`, {
      method: "POST",
      body: JSON.stringify({ publisherPluginId, scheduledAt })
    });
  }

  async listPublishJobs(): Promise<PublishJob[]> {
    return this.get<PublishJob[]>("/publish-jobs");
  }

  /** Asks the local worker to run this job now. The API itself never publishes. */
  async requestPublishJobRun(id: string, action: "run" | "retry" = "run"): Promise<PublishJob> {
    return this.request<PublishJob>(`/publish-jobs/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify({})
    });
  }

  async listPlugins(): Promise<PluginRegistration[]> {
    return this.get<PluginRegistration[]>("/plugins");
  }

  async setPluginEnabled(id: string, enabled: boolean): Promise<PluginRegistration> {
    return this.request<PluginRegistration>(`/plugins/${id}/${enabled ? "enable" : "disable"}`, {
      method: "POST"
    });
  }

  async listAuditLogs(): Promise<AuditLog[]> {
    return this.get<AuditLog[]>("/audit-logs");
  }

  private async get<TData>(path: string): Promise<TData> {
    return this.request<TData>(path, { method: "GET" });
  }

  private async request<TData>(path: string, init: RequestInit): Promise<TData> {
    let response: Response;

    try {
      response = await fetch(`${this.options.baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
          ...(this.options.token ? { authorization: `Bearer ${this.options.token}` } : {}),
          ...init.headers
        }
      });
    } catch (error) {
      throw new ApiRequestError(
        `Could not reach the local API at ${this.options.baseUrl || "/"} (${error instanceof Error ? error.message : String(error)}).`
      );
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => undefined);
      const message = payload?.error?.message ?? `Local API request ${path} failed with HTTP ${response.status}.`;
      throw new ApiRequestError(message, response.status);
    }

    const payload = (await response.json()) as ApiResponse<TData>;
    return payload.data;
  }
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}

/**
 * Loads the whole workspace from the local API. Failures are thrown to the
 * caller; this function never substitutes sample data for the user's workspace.
 */
export async function loadWorkspaceData(client: ApiClient): Promise<WorkspaceData> {
  const accounts = await client.listAccounts();
  const [concepts, assets, recipes, candidates, publishJobs, plugins, auditLogs] = await Promise.all([
    client.listConcepts(accounts),
    client.listAssets(),
    client.listRecipes(),
    client.listCandidates(),
    client.listPublishJobs(),
    client.listPlugins(),
    client.listAuditLogs()
  ]);

  return { accounts, concepts, assets, recipes, candidates, publishJobs, plugins, auditLogs };
}
