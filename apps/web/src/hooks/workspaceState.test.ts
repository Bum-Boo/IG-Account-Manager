import { describe, expect, it } from "vitest";
import { sampleWorkspaceData } from "../api/sampleData.js";
import type { WorkspaceData } from "../types.js";
import { applyWorkspaceLoad, openSamplePreview } from "./workspaceState.js";

const realWorkspace: WorkspaceData = {
  accounts: [],
  concepts: [],
  assets: [],
  recipes: [],
  candidates: [],
  publishJobs: [],
  plugins: [],
  auditLogs: [{ id: "audit_real", action: "candidate.approved", entityType: "candidate", entityId: "c1", metadata: {}, createdAt: "2026-10-31T00:00:00.000Z" }]
};

describe("workspace load state", () => {
  it("keeps the user's workspace and records the error when a refresh fails", () => {
    const loaded = applyWorkspaceLoad({}, { ok: true, data: realWorkspace, at: "2026-10-31T01:00:00.000Z" });
    const failed = applyWorkspaceLoad(loaded, { ok: false, error: "Could not reach the local API." });

    // Regression: API failures used to replace the board with sample data.
    expect(failed.data).toBe(realWorkspace);
    expect(failed.source).toBe("api");
    expect(failed.loadedAt).toBe("2026-10-31T01:00:00.000Z");
    expect(failed.error).toBe("Could not reach the local API.");
  });

  it("does not invent any data when the first load fails", () => {
    const failed = applyWorkspaceLoad({}, { ok: false, error: "HTTP 500" });

    expect(failed.data).toBeUndefined();
    expect(failed.source).toBeUndefined();
    expect(failed.error).toBe("HTTP 500");
  });

  it("clears the error once the API answers again", () => {
    const failed = applyWorkspaceLoad({}, { ok: false, error: "HTTP 500" });
    const recovered = applyWorkspaceLoad(failed, { ok: true, data: realWorkspace, at: "2026-10-31T02:00:00.000Z" });

    expect(recovered).toEqual({ data: realWorkspace, source: "api", loadedAt: "2026-10-31T02:00:00.000Z" });
  });

  it("opens the sample preview only on request and labels it as sample", () => {
    const preview = openSamplePreview({ error: "HTTP 500" }, sampleWorkspaceData);

    expect(preview.source).toBe("sample");
    expect(preview.error).toBeUndefined();
    expect(preview.data).toEqual(sampleWorkspaceData);
    expect(preview.data).not.toBe(sampleWorkspaceData);
  });
});
