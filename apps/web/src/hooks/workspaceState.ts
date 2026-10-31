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

/**
 * Hands out load tickets so only the newest load may update state. An older,
 * slower response (or one from previous API settings) is ignored.
 */
export function createLoadSequencer() {
  let latest = 0;

  return {
    next(): number {
      latest += 1;
      return latest;
    },
    isLatest(ticket: number): boolean {
      return ticket === latest;
    },
    /** Invalidates every load in flight, e.g. when the API settings change. */
    invalidate(): void {
      latest += 1;
    }
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
