import type { DatabaseHandle } from "@ig-manager/db";
import type { WorkflowEngine } from "@ig-manager/workflow-engine";
import type { createRepositories } from "@ig-manager/db";
import type { InstagramConnectionService } from "@ig-manager/instagram-integration";
import type { CandidateGenerationProvider } from "./generation.js";

export type ApiRepositories = ReturnType<typeof createRepositories>;

export interface ApiContext {
  database: DatabaseHandle;
  repositories: ApiRepositories;
  workflow: WorkflowEngine;
  candidateGenerationProvider?: CandidateGenerationProvider;
  instagramConnectionService?: InstagramConnectionService;
  apiToken?: string;
  actorId: string;
  ownsDatabase: boolean;
}

export interface ApiDataResponse<TData> {
  data: TData;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
