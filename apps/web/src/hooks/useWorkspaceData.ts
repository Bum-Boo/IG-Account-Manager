import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiClient, createApiClient, loadWorkspaceData } from "../api/client.js";
import { sampleWorkspaceData } from "../api/sampleData.js";
import type { Concept, DataSource, NewCandidateInput, PostCandidate, PublishJob, WorkspaceData } from "../types.js";
import { applyWorkspaceLoad, errorMessage, openSamplePreview, type WorkspaceLoadState } from "./workspaceState.js";

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
const apiBaseStorageKey = "ig-manager.apiBaseUrl";
const apiTokenStorageKey = "ig-manager.apiToken";
const samplePreviewOnly = "This action needs the local API. The sample preview is never saved.";

export interface WorkspaceState {
  data?: WorkspaceData;
  source?: DataSource;
  /** True only for the very first load, before any data is available. */
  loading: boolean;
  refreshing: boolean;
  error?: string;
  loadedAt?: string;
  apiBaseUrl: string;
  apiToken: string;
  reload(): Promise<void>;
  openSample(): void;
  updateSettings(settings: { apiBaseUrl: string; apiToken: string }): void;
  seedWorkspace(): Promise<void>;
  createCandidate(input: NewCandidateInput): Promise<void>;
  approveCandidate(id: string): Promise<void>;
  rejectCandidate(id: string, reason?: string): Promise<void>;
  requestRegeneration(id: string): Promise<void>;
  scheduleCandidate(id: string, scheduledAt: string): Promise<void>;
  requestPublishJobRun(id: string): Promise<void>;
  setPluginEnabled(id: string, enabled: boolean): Promise<void>;
  updateConcept(id: string, patch: Partial<Concept>): Promise<void>;
}

export function useWorkspaceData(): WorkspaceState {
  const [apiBaseUrl, setApiBaseUrl] = useState(() => readStorage(apiBaseStorageKey) ?? defaultApiBaseUrl);
  const [apiToken, setApiToken] = useState(() => readStorage(apiTokenStorageKey) ?? "");
  const [state, setState] = useState<WorkspaceLoadState>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const client = useMemo(() => createApiClient({ baseUrl: apiBaseUrl, token: apiToken || undefined }), [apiBaseUrl, apiToken]);

  const reload = useCallback(async () => {
    setRefreshing(true);

    try {
      const data = await loadWorkspaceData(client);
      setState((current) => applyWorkspaceLoad(current, { ok: true, data, at: new Date().toISOString() }));
    } catch (error) {
      setState((current) => applyWorkspaceLoad(current, { ok: false, error: errorMessage(error) }));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openSample = useCallback(() => {
    setState((current) => openSamplePreview(current, sampleWorkspaceData));
  }, []);

  const updateSettings = useCallback((settings: { apiBaseUrl: string; apiToken: string }) => {
    const nextBaseUrl = settings.apiBaseUrl.trim() || defaultApiBaseUrl;
    const nextToken = settings.apiToken.trim();
    writeStorage(apiBaseStorageKey, nextBaseUrl);
    writeStorage(apiTokenStorageKey, nextToken);
    setApiBaseUrl(nextBaseUrl);
    setApiToken(nextToken);
  }, []);

  const isSample = () => stateRef.current.source === "sample";

  /** Runs an API mutation, then reloads so candidates, jobs and the audit log stay consistent. */
  const mutateApi = useCallback(
    async (task: (api: ApiClient) => Promise<unknown>) => {
      await task(client);
      await reload();
    },
    [client, reload]
  );

  const updateSampleData = useCallback((update: (data: WorkspaceData) => WorkspaceData) => {
    setState((current) => (current.data ? { ...current, data: update(current.data) } : current));
  }, []);

  const updateSampleCandidate = useCallback(
    (id: string, update: (candidate: PostCandidate) => PostCandidate) =>
      updateSampleData((data) => ({
        ...data,
        candidates: data.candidates.map((candidate) => (candidate.id === id ? update(candidate) : candidate))
      })),
    [updateSampleData]
  );

  const seedWorkspace = useCallback(async () => {
    if (isSample()) throw new Error(samplePreviewOnly);
    await mutateApi((api) => api.seedWorkspace());
  }, [mutateApi]);

  const createCandidate = useCallback(
    async (input: NewCandidateInput) => {
      if (!isSample()) {
        await mutateApi((api) => api.createCandidate(input));
        return;
      }

      const now = new Date().toISOString();
      updateSampleData((data) => ({
        ...data,
        candidates: [
          ...data.candidates,
          {
            id: `sample_candidate_${Date.now()}`,
            ...input,
            assetIds: [],
            status: "ready_for_review",
            provenance: { source: "manual", sourceAssetIds: [], sourceReferenceIds: [] },
            metadata: {},
            createdAt: now,
            updatedAt: now
          }
        ]
      }));
    },
    [mutateApi, updateSampleData]
  );

  const approveCandidate = useCallback(
    async (id: string) => {
      if (!isSample()) {
        await mutateApi((api) => api.approveCandidate(id));
        return;
      }

      const now = new Date().toISOString();
      updateSampleCandidate(id, (candidate) => ({ ...candidate, status: "approved", approvedAt: now, approvedBy: "sample-reviewer", updatedAt: now }));
    },
    [mutateApi, updateSampleCandidate]
  );

  const rejectCandidate = useCallback(
    async (id: string, reason = "Rejected from dashboard.") => {
      if (!isSample()) {
        await mutateApi((api) => api.rejectCandidate(id, reason));
        return;
      }

      const now = new Date().toISOString();
      updateSampleCandidate(id, (candidate) => ({
        ...candidate,
        status: "rejected",
        rejectionReason: reason,
        rejectedAt: now,
        rejectedBy: "sample-reviewer",
        updatedAt: now
      }));
    },
    [mutateApi, updateSampleCandidate]
  );

  const requestRegeneration = useCallback(
    async (id: string) => {
      if (!isSample()) {
        throw new Error("Request regeneration is not implemented by the local API yet.");
      }

      updateSampleCandidate(id, (candidate) => ({
        ...candidate,
        status: "changes_requested",
        internalNotes: [candidate.internalNotes, "Regeneration requested from mobile review."].filter(Boolean).join("\n"),
        updatedAt: new Date().toISOString()
      }));
    },
    [updateSampleCandidate]
  );

  const scheduleCandidate = useCallback(
    async (id: string, scheduledAt: string) => {
      const data = stateRef.current.data;
      if (!data) return;
      const publisher = data.plugins.find((plugin) => plugin.type === "publisher" && plugin.enabled);

      if (!publisher) {
        throw new Error("No enabled publisher plugin is available. Enable one on the Plugins page.");
      }

      if (!isSample()) {
        await mutateApi((api) => api.scheduleCandidate(id, publisher.id, scheduledAt));
        return;
      }

      const candidate = data.candidates.find((item) => item.id === id);
      if (!candidate) return;
      const now = new Date().toISOString();
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
        createdAt: now,
        updatedAt: now
      };
      updateSampleData((current) => ({
        ...current,
        candidates: current.candidates.map((item) => (item.id === id ? { ...item, status: "scheduled", scheduledAt, updatedAt: now } : item)),
        publishJobs: [...current.publishJobs.filter((job) => job.id !== publishJob.id), publishJob]
      }));
    },
    [mutateApi, updateSampleData]
  );

  const requestPublishJobRun = useCallback(
    async (id: string) => {
      if (isSample()) throw new Error(samplePreviewOnly);
      const job = stateRef.current.data?.publishJobs.find((item) => item.id === id);
      await mutateApi((api) => api.requestPublishJobRun(id, job?.status === "retry_scheduled" ? "retry" : "run"));
    },
    [mutateApi]
  );

  const setPluginEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      if (!isSample()) {
        await mutateApi((api) => api.setPluginEnabled(id, enabled));
        return;
      }

      updateSampleData((data) => ({
        ...data,
        plugins: data.plugins.map((plugin) => (plugin.id === id ? { ...plugin, enabled, updatedAt: new Date().toISOString() } : plugin))
      }));
    },
    [mutateApi, updateSampleData]
  );

  const updateConcept = useCallback(
    async (id: string, patch: Partial<Concept>) => {
      if (!isSample()) {
        await mutateApi((api) => api.updateConcept(id, patch));
        return;
      }

      updateSampleData((data) => ({
        ...data,
        concepts: data.concepts.map((concept) => (concept.id === id ? { ...concept, ...patch, updatedAt: new Date().toISOString() } : concept))
      }));
    },
    [mutateApi, updateSampleData]
  );

  return {
    data: state.data,
    source: state.source,
    loading,
    refreshing,
    error: state.error,
    loadedAt: state.loadedAt,
    apiBaseUrl,
    apiToken,
    reload,
    openSample,
    updateSettings,
    seedWorkspace,
    createCandidate,
    approveCandidate,
    rejectCandidate,
    requestRegeneration,
    scheduleCandidate,
    requestPublishJobRun,
    setPluginEnabled,
    updateConcept
  };
}

function readStorage(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Settings still apply for this session when storage is unavailable.
  }
}
