import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClient, createApiClient, loadWorkspaceSnapshot } from "../api/client.js";
import type { Concept, DataSource, PluginRegistration, PostCandidate, PublishJob, WorkspaceData } from "../types.js";

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
  scheduleCandidate(id: string, scheduledAt: string): Promise<void>;
  retryPublishJob(id: string): Promise<void>;
  setPluginEnabled(id: string, enabled: boolean): Promise<void>;
  updateConcept(id: string, patch: Partial<Concept>): Promise<void>;
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
    scheduleCandidate,
    retryPublishJob,
    setPluginEnabled,
    updateConcept
  };
}
