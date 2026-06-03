import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClient, createApiClient, loadWorkspaceSnapshot } from "../api/client.js";
import type {
  Concept,
  ContentAsset,
  DataSource,
  GenerateCandidateRequest,
  GenerateCandidateResponse,
  InstagramConnectionStatus,
  PluginRegistration,
  PostCandidate,
  PublishJob,
  WorkspaceData
} from "../types.js";

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
const apiBaseStorageKey = "ig-manager.apiBaseUrl";
const apiTokenStorageKey = "ig-manager.apiToken";

export interface WorkspaceState {
  data?: WorkspaceData;
  source: DataSource;
  loading: boolean;
  error?: string;
  apiBaseUrl: string;
  apiToken: string;
  reload(): Promise<void>;
  updateSettings(settings: { apiBaseUrl: string; apiToken: string }): void;
  approveCandidate(id: string): Promise<void>;
  rejectCandidate(id: string, reason?: string): Promise<void>;
  requestRegeneration(id: string): Promise<void>;
  generateCandidate(input: GenerateCandidateRequest): Promise<GenerateCandidateResponse>;
  scheduleCandidate(id: string, scheduledAt: string): Promise<void>;
  retryPublishJob(id: string): Promise<void>;
  setPluginEnabled(id: string, enabled: boolean): Promise<void>;
  updateConcept(id: string, patch: Partial<Concept>): Promise<void>;
  loadInstagramConnection(accountId: string): Promise<InstagramConnectionStatus>;
  connectInstagram(accountId: string): Promise<void>;
  selectInstagramAccount(accountId: string, instagramBusinessAccountId: string): Promise<InstagramConnectionStatus>;
  disconnectInstagram(accountId: string): Promise<InstagramConnectionStatus>;
  refreshInstagramConnection(accountId: string): Promise<InstagramConnectionStatus>;
}

export function useWorkspaceData(): WorkspaceState {
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem(apiBaseStorageKey) ?? defaultApiBaseUrl);
  const [apiToken, setApiToken] = useState(() => localStorage.getItem(apiTokenStorageKey) ?? "");
  const [data, setData] = useState<WorkspaceData>();
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const client = useMemo(() => createApiClient({ baseUrl: apiBaseUrl, token: apiToken || undefined }), [apiBaseUrl, apiToken]);

  const reload = useCallback(async () => {
    setLoading(true);
    const snapshot = await loadWorkspaceSnapshot(client);
    setData(snapshot.data);
    setSource(snapshot.source);
    setError(snapshot.error);
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateSettings = useCallback((settings: { apiBaseUrl: string; apiToken: string }) => {
    const nextBaseUrl = settings.apiBaseUrl.trim() || defaultApiBaseUrl;
    const nextToken = settings.apiToken.trim();
    localStorage.setItem(apiBaseStorageKey, nextBaseUrl);
    localStorage.setItem(apiTokenStorageKey, nextToken);
    setApiBaseUrl(nextBaseUrl);
    setApiToken(nextToken);
  }, []);

  const runCandidateMutation = useCallback(
    async (id: string, mutateApi: (client: ApiClient) => Promise<PostCandidate>, mutateLocal: (candidate: PostCandidate) => PostCandidate) => {
      if (source === "api") {
        const updated = await mutateApi(client);
        setData((current) =>
          current ? { ...current, candidates: current.candidates.map((candidate) => (candidate.id === id ? updated : candidate)) } : current
        );
        return;
      }

      setData((current) =>
        current
          ? {
              ...current,
              candidates: current.candidates.map((candidate) => (candidate.id === id ? mutateLocal(candidate) : candidate))
            }
          : current
      );
    },
    [client, source]
  );

  const approveCandidate = useCallback(
    (id: string) =>
      runCandidateMutation(
        id,
        (api) => api.approveCandidate(id),
        (candidate) => ({
          ...candidate,
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedBy: "local-reviewer",
          updatedAt: new Date().toISOString()
        })
      ),
    [runCandidateMutation]
  );

  const rejectCandidate = useCallback(
    (id: string, reason = "Rejected from dashboard.") =>
      runCandidateMutation(
        id,
        (api) => api.rejectCandidate(id, reason),
        (candidate) => ({
          ...candidate,
          status: "rejected",
          rejectionReason: reason,
          rejectedAt: new Date().toISOString(),
          rejectedBy: "local-reviewer",
          updatedAt: new Date().toISOString()
        })
      ),
    [runCandidateMutation]
  );

  const requestRegeneration = useCallback(
    async (id: string) => {
      if (source === "api") {
        setError("API gap: request regeneration is not implemented by the local API yet.");
        return;
      }

      setData((current) =>
        current
          ? {
              ...current,
              candidates: current.candidates.map((candidate) =>
                candidate.id === id
                  ? {
                      ...candidate,
                      status: "changes_requested",
                      internalNotes: [candidate.internalNotes, "Regeneration requested from mobile review."]
                        .filter(Boolean)
                        .join("\n"),
                      updatedAt: new Date().toISOString()
                    }
                  : candidate
              )
            }
          : current
      );
    },
    [source]
  );

  const generateCandidate = useCallback(
    async (input: GenerateCandidateRequest): Promise<GenerateCandidateResponse> => {
      if (source === "api") {
        const generated = await client.generateCandidate(input);
        setData((current) =>
          current
            ? {
                ...current,
                assets: upsertById(current.assets, generated.generatedAsset),
                candidates: upsertById(current.candidates, generated.candidate)
              }
            : current
        );
        return generated;
      }

      if (!data) {
        throw new Error("Workspace data is not loaded.");
      }

      const generated = createMockGeneratedCandidate(data, input);
      setData({
        ...data,
        assets: upsertById(data.assets, generated.generatedAsset),
        candidates: upsertById(data.candidates, generated.candidate),
        auditLogs: [
          ...data.auditLogs,
          {
            id: `audit_${generated.metadata.requestId}`,
            action: "generation.candidate_created",
            actorId: "local-ui",
            entityType: "generation",
            entityId: generated.metadata.requestId,
            metadata: generated.metadata,
            createdAt: new Date().toISOString()
          }
        ]
      });
      return generated;
    },
    [client, data, source]
  );

  const scheduleCandidate = useCallback(
    async (id: string, scheduledAt: string) => {
      if (!data) return;
      const publisher = data.plugins.find((plugin) => plugin.type === "publisher" && plugin.enabled);
      if (!publisher) {
        setError("No enabled publisher plugin is available.");
        return;
      }

      if (source === "api") {
        const scheduled = await client.scheduleCandidate(id, publisher.id, scheduledAt);
        setData((current) =>
          current
            ? {
                ...current,
                candidates: current.candidates.map((candidate) => (candidate.id === id ? scheduled.candidate : candidate)),
                publishJobs: [...current.publishJobs.filter((job) => job.id !== scheduled.publishJob.id), scheduled.publishJob]
              }
            : current
        );
        return;
      }

      const candidate = data.candidates.find((item) => item.id === id);
      if (!candidate) return;
      const publishJob: PublishJob = {
        id: `job_${id}`,
        candidateId: id,
        accountId: candidate.accountId,
        pluginRegistrationId: publisher.id,
        status: "queued",
        scheduledAt,
        attempt: 0,
        maxAttempts: 3,
        metadata: { autoPublish: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setData({
        ...data,
        candidates: data.candidates.map((item) =>
          item.id === id ? { ...item, status: "scheduled", scheduledAt, updatedAt: new Date().toISOString() } : item
        ),
        publishJobs: [...data.publishJobs.filter((job) => job.id !== publishJob.id), publishJob]
      });
    },
    [client, data, source]
  );

  const retryPublishJob = useCallback(
    async (id: string) => {
      if (source === "api") {
        const retried = await client.retryPublishJob(id);
        setData((current) =>
          current ? { ...current, publishJobs: current.publishJobs.map((job) => (job.id === id ? retried : job)) } : current
        );
        return;
      }

      setData((current) =>
        current
          ? {
              ...current,
              publishJobs: current.publishJobs.map((job) =>
                job.id === id
                  ? { ...job, status: "running", attempt: job.attempt + 1, retryAfter: undefined, updatedAt: new Date().toISOString() }
                  : job
              )
            }
          : current
      );
    },
    [client, source]
  );

  const setPluginEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      let updated: PluginRegistration | undefined;

      if (source === "api") {
        updated = await client.setPluginEnabled(id, enabled);
      }

      setData((current) =>
        current
          ? {
              ...current,
              plugins: current.plugins.map((plugin) =>
                plugin.id === id ? (updated ?? { ...plugin, enabled, updatedAt: new Date().toISOString() }) : plugin
              )
            }
          : current
      );
    },
    [client, source]
  );

  const updateConcept = useCallback(
    async (id: string, patch: Partial<Concept>) => {
      let updated: Concept | undefined;

      if (source === "api") {
        updated = await client.updateConcept(id, patch);
      }

      setData((current) =>
        current
          ? {
              ...current,
              concepts: current.concepts.map((concept) =>
                concept.id === id ? (updated ?? { ...concept, ...patch, updatedAt: new Date().toISOString() }) : concept
              )
            }
          : current
      );
    },
    [client, source]
  );

  const loadInstagramConnection = useCallback(
    async (accountId: string): Promise<InstagramConnectionStatus> => {
      if (source !== "api") {
        return {
          accountId,
          provider: "instagram",
          status: "not_connected",
          scopes: [],
          metadata: {}
        };
      }

      return client.getInstagramConnection(accountId);
    },
    [client, source]
  );

  const connectInstagram = useCallback(
    async (accountId: string) => {
      if (source !== "api") {
        setError("Instagram connection requires the local API.");
        return;
      }

      const result = await client.startInstagramConnection(accountId);
      window.location.href = result.authorizationUrl;
    },
    [client, source]
  );

  const selectInstagramAccount = useCallback(
    async (accountId: string, instagramBusinessAccountId: string): Promise<InstagramConnectionStatus> => {
      if (source !== "api") {
        throw new Error("Instagram connection requires the local API.");
      }

      const result = await client.selectInstagramAccount(accountId, instagramBusinessAccountId);
      await reload();
      return result;
    },
    [client, reload, source]
  );

  const disconnectInstagram = useCallback(
    async (accountId: string): Promise<InstagramConnectionStatus> => {
      if (source !== "api") {
        throw new Error("Instagram connection requires the local API.");
      }

      const result = await client.disconnectInstagram(accountId);
      await reload();
      return result;
    },
    [client, reload, source]
  );

  const refreshInstagramConnection = useCallback(
    async (accountId: string): Promise<InstagramConnectionStatus> => {
      if (source !== "api") {
        throw new Error("Instagram connection requires the local API.");
      }

      const result = await client.refreshInstagramConnection(accountId);
      await reload();
      return result;
    },
    [client, reload, source]
  );

  return {
    data,
    source,
    loading,
    error,
    apiBaseUrl,
    apiToken,
    reload,
    updateSettings,
    approveCandidate,
    rejectCandidate,
    requestRegeneration,
    generateCandidate,
    scheduleCandidate,
    retryPublishJob,
    setPluginEnabled,
    updateConcept,
    loadInstagramConnection,
    connectInstagram,
    selectInstagramAccount,
    disconnectInstagram,
    refreshInstagramConnection
  };
}

function createMockGeneratedCandidate(data: WorkspaceData, input: GenerateCandidateRequest): GenerateCandidateResponse {
  const concept = data.concepts.find((item) => item.id === input.conceptId);
  const recipe = data.recipes.find((item) => item.id === input.recipeId);

  if (!concept) {
    throw new Error(`Concept '${input.conceptId}' was not found.`);
  }

  if (!recipe) {
    throw new Error(`Recipe '${input.recipeId}' was not found.`);
  }

  const requestId = `generation_mock_${Date.now()}`;
  const selectedAssets = data.assets
    .filter((asset) => asset.conceptIds.includes(concept.id) || asset.accountIds.includes(input.accountId))
    .slice(0, 2);
  const selectedAssetIds = selectedAssets.map((asset) => asset.id);
  const generatedAsset: ContentAsset = {
    id: `asset_generated_${requestId}`,
    type: "image",
    uri: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 900'%3E%3Crect width='900' height='900' fill='%23e4ece4'/%3E%3Crect x='170' y='150' width='560' height='600' rx='28' fill='%23fbfcfa'/%3E%3Ctext x='450' y='430' text-anchor='middle' font-family='Arial' font-size='42' fill='%232d6c54'%3EGenerated%3C/text%3E%3Ctext x='450' y='490' text-anchor='middle' font-family='Arial' font-size='32' fill='%2347534c'%3ECandidate%3C/text%3E%3C/svg%3E",
    title: `Generated media for ${concept.name}`,
    description: "Mock generated visual from the local UI fallback.",
    tags: ["generated", "mock"],
    accountIds: [input.accountId],
    conceptIds: [concept.id],
    rights: { usage: "owned", source: "mock-ui" },
    metadata: {
      aiContentFactory: {
        provider: "mock",
        dryRun: input.dryRun === true
      }
    },
    importedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const hashtags = concept.pillars.slice(0, 4).map((pillar) => pillar.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()).filter(Boolean);
  const candidate: PostCandidate = {
    id: `candidate_${requestId}`,
    accountId: input.accountId,
    conceptId: concept.id,
    recipeId: recipe.id,
    assetIds: [...selectedAssetIds, generatedAsset.id],
    status: "ready_for_review",
    format: recipe.format,
    caption: `${concept.name}: ${selectedAssets.map((asset) => asset.title).join(", ") || "generated direction"}.\n\n${hashtags.map((tag) => `#${tag}`).join(" ")}`.trim(),
    firstComment: {
      text: `Selected assets: ${selectedAssets.map((asset) => asset.title).join(", ") || "none"}.`,
      createdBy: "private.ai-content-factory",
      createdAt: new Date().toISOString()
    },
    provenance: {
      source: "plugin",
      pluginRegistrationId: "private.ai-content-factory",
      sourceAssetIds: selectedAssetIds,
      sourceReferenceIds: []
    },
    metadata: {
      aiContentFactory: {
        statusLabel: "needs_review",
        requestId,
        provider: "mock",
        dryRun: input.dryRun === true,
        selectedAssetIds,
        generatedAssetId: generatedAsset.id,
        generatedMediaUri: generatedAsset.uri,
        hashtags,
        selectionExplanation: {
          selectedAssets: selectedAssets.map((asset) => ({ assetId: asset.id, title: asset.title }))
        }
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return {
    candidateId: candidate.id,
    candidate,
    generatedAsset,
    selectedAssetIds,
    metadata: {
      requestId,
      provider: "mock",
      dryRun: input.dryRun === true,
      accountId: input.accountId,
      conceptId: concept.id,
      recipeId: recipe.id,
      selectedAssetIds,
      generatedAssetId: generatedAsset.id,
      generatedMediaUri: generatedAsset.uri
    },
    auditLogIds: [`audit_${requestId}`]
  };
}

function upsertById<T extends { id: string }>(items: readonly T[], item: T): T[] {
  return [...items.filter((current) => current.id !== item.id), item];
}
