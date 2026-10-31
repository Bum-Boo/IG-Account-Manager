import type { DataSource, WorkspaceData } from "../types.js";

export interface WorkspaceLoadState {
  data?: WorkspaceData;
  source?: DataSource;
  /** Last load or refresh failure. Cleared by the next successful load. */
  error?: string;
  /** ISO time of the last successful API load. */
  loadedAt?: string;
}

export type WorkspaceLoadResult =
  | { ok: true; data: WorkspaceData; at: string }
  | { ok: false; error: string };

/**
 * Applies the outcome of a workspace load.
 *
 * A failed load never replaces what the user is looking at: the previous data
 * and its source are kept and only the error is recorded. In particular, API
 * failures do not switch the dashboard to sample data.
 */
export function applyWorkspaceLoad(state: WorkspaceLoadState, result: WorkspaceLoadResult): WorkspaceLoadState {
  if (result.ok) {
    return { data: result.data, source: "api", loadedAt: result.at };
  }

  return { ...state, error: result.error };
}

/** Switches to the never-saved sample preview. Only called from an explicit user action. */
export function openSamplePreview(state: WorkspaceLoadState, sample: WorkspaceData): WorkspaceLoadState {
  return { ...state, data: structuredClone(sample), source: "sample", error: undefined };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
