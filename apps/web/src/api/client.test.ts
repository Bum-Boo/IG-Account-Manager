import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, createApiClient, loadWorkspaceData } from "./client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("throws instead of returning sample data when the API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const client = createApiClient({ baseUrl: "/api" });

    await expect(loadWorkspaceData(client)).rejects.toBeInstanceOf(ApiRequestError);
    await expect(loadWorkspaceData(client)).rejects.toThrow(/Could not reach the local API/);
  });

  it("surfaces the API error message and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response(JSON.stringify({ error: { code: "x", message: "Database is locked." } }), { status: 500 }))
    );

    await expect(loadWorkspaceData(createApiClient({ baseUrl: "/api" }))).rejects.toMatchObject({
      message: "Database is locked.",
      status: 500
    });
  });

  it("sends a JSON content-type only when there is a body", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: { id: "p1" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createApiClient({ baseUrl: "/api", token: "t" });

    // Regression: plugin toggles sent content-type JSON with no body and the API rejected them.
    await client.setPluginEnabled("p1", false);
    await client.requestPublishJobRun("job_1");

    const [toggleUrl, toggleInit] = fetchMock.mock.calls[0]!;
    expect(toggleUrl).toBe("/api/plugins/p1/disable");
    expect(toggleInit.headers).toEqual({ authorization: "Bearer t" });

    const [runUrl, runInit] = fetchMock.mock.calls[1]!;
    expect(runUrl).toBe("/api/publish-jobs/job_1/run");
    expect(runInit.headers).toMatchObject({ "content-type": "application/json" });
  });
});
