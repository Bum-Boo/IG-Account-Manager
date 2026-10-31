// 독립 리뷰용 재현 테스트 (2026-10-31). 모든 데이터는 합성 데이터이며 네트워크 호출이 없다.
// 각 테스트는 "현재 동작"을 단언한다. 수정이 들어가면 해당 단언이 실패하는 것이 정상이다.
import { describe, expect, it } from "vitest";
import { createApiServer } from "../apps/api/src/server.ts";
import { createDatabase, createRepositories, runMigrations } from "../packages/db/dist/index.js";
import { createPluginRegistration } from "../packages/domain/dist/index.js";
import { WorkflowEngine } from "../packages/workflow-engine/dist/index.js";
import {
  InMemoryJobLock,
  SchedulerService,
  createMockPublisherPlugin
} from "../packages/scheduler-core/dist/index.js";

const AUTH = { authorization: "Bearer synthetic-token" };

function setup(options: { apiToken?: string | null } = {}) {
  const handle = createDatabase();
  runMigrations(handle.client);
  const repositories = createRepositories(handle.db);
  repositories.plugins.create(
    createPluginRegistration({
      id: "plugin_pub",
      pluginId: "synthetic.publisher",
      name: "Synthetic Publisher",
      version: "0.1.0",
      type: "publisher",
      enabled: true,
      officialApiOnly: true,
      capabilities: ["publish"],
      permissions: ["candidate:read", "publish:approved"],
      metadata: { publicLabel: "safe", settings: { accessToken: "SYNTHETIC-NESTED-SECRET" } },
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z"
    })
  );
  const server = createApiServer({
    logger: false,
    databaseHandle: handle,
    applyMigrations: false,
    closeDatabaseOnClose: true,
    apiToken: options.apiToken === null ? undefined : options.apiToken ?? "synthetic-token",
    actorId: "review-api"
  });

  const call = async (method: "GET" | "POST" | "PUT", url: string, payload?: unknown, headers = AUTH) => {
    const res = await server.inject({ method, url, payload: payload as object, headers });
    return { status: res.statusCode, body: res.json() };
  };

  // apps/worker/src/runtime.ts 와 같은 조합으로 워커를 구성한다.
  const worker = (trigger: "manual" | "auto", nowMs: number, publishCalls: string[]) => {
    const workflow = new WorkflowEngine({
      repositories,
      events: { emit: () => undefined },
      publisherPlugins: { getPublisher: async () => publisher }
    });
    const base = createMockPublisherPlugin({ id: "synthetic.publisher" });
    const publisher = {
      ...base,
      publish: async (req: Parameters<typeof base.publish>[0], ctx: Parameters<typeof base.publish>[1]) => {
        publishCalls.push(`${req.job.id}:${req.candidate.id}`);
        return base.publish(req, ctx);
      }
    };
    const clock = { now: () => new Date(nowMs), sleep: async () => undefined };
    return {
      workflow,
      scheduler: new SchedulerService({
        workflow,
        publishers: { getPublisher: async () => publisher },
        jobLock: new InMemoryJobLock(clock),
        clock,
        trigger
      })
    };
  };

  return { handle, repositories, server, call, worker };
}

async function seedAccountAndConcept(
  call: ReturnType<typeof setup>["call"],
  accountPolicy: Record<string, unknown> = {}
) {
  const account = await call("POST", "/accounts", {
    id: "acc",
    platform: { id: "local", displayName: "Local" },
    handle: "synthetic_handle",
    status: "connected",
    automationPolicy: accountPolicy,
    schedulePolicy: { timezone: "UTC", minLeadTimeMinutes: 0, requireApprovedCandidate: true }
  });
  expect(account.status).toBe(201);
  const concept = await call("POST", "/concepts", {
    id: "con",
    accountId: "acc",
    name: "Synthetic",
    description: "d",
    audience: "a",
    pillars: ["p"],
    voice: "v"
  });
  expect(concept.status).toBe(201);
}

const soon = () => new Date(Date.now() + 60_000).toISOString();
const later = () => Date.now() + 2 * 60 * 60_000;

describe("R1 POST /candidates 의 status 필드로 리뷰 단계를 건너뛸 수 있다", () => {
  it("approve 호출 없이 status=approved 로 생성 → 예약 → 워커가 게시한다", async () => {
    const { call, worker, server } = setup();
    await seedAccountAndConcept(call);

    const created = await call("POST", "/candidates", {
      id: "cand_skip",
      accountId: "acc",
      conceptId: "con",
      status: "approved",
      format: "feed_image",
      caption: "synthetic caption"
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("approved");
    expect(created.body.data.approvedAt).toBeUndefined();

    const scheduled = await call("POST", "/candidates/cand_skip/schedule", {
      scheduledAt: soon(),
      publisherPluginId: "plugin_pub",
      publishJobId: "job_skip"
    });
    expect(scheduled.status).toBe(200);

    const calls: string[] = [];
    const result = await worker("manual", later(), calls).scheduler.pollOnce();
    expect(result.results).toEqual([{ jobId: "job_skip", status: "succeeded" }]);
    expect(calls).toEqual(["job_skip:cand_skip"]);

    const audit = await call("GET", "/audit-logs?entityType=candidate&entityId=cand_skip");
    const actions = audit.body.data.map((a: { action: string }) => a.action);
    expect(actions).not.toContain("candidate.approved");
    await server.close();
  });

  it("status=published 같은 종결 상태로도 생성된다", async () => {
    const { call, server } = setup();
    await seedAccountAndConcept(call);
    const created = await call("POST", "/candidates", {
      accountId: "acc",
      conceptId: "con",
      status: "published",
      format: "feed_image",
      caption: "synthetic"
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("published");
    await server.close();
  });
});

describe("R2 concept.metadata.workflowPolicy 가 계정 정책을 덮어쓴다", () => {
  it("draft 를 리뷰 없이 예약하고 auto 워커가 게시한다 (계정 allowAutoPublishing=false, requireApprovedCandidate=true)", async () => {
    const { call, worker, server } = setup();
    await seedAccountAndConcept(call, { allowAutoPublishing: false, allowAutoScheduling: false });

    const put = await call("PUT", "/concepts/con", {
      metadata: { workflowPolicy: { autoSchedule: true, autoPublish: true } }
    });
    expect(put.status).toBe(200);

    await call("POST", "/candidates", {
      id: "cand_draft",
      accountId: "acc",
      conceptId: "con",
      format: "feed_image",
      caption: "never reviewed"
    });
    const scheduled = await call("POST", "/candidates/cand_draft/schedule", {
      scheduledAt: soon(),
      publisherPluginId: "plugin_pub",
      publishJobId: "job_draft",
      autoPublish: true
    });
    expect(scheduled.status).toBe(200);
    expect(scheduled.body.data.candidate.status).toBe("scheduled");

    const calls: string[] = [];
    const result = await worker("auto", later(), calls).scheduler.pollOnce();
    expect(result.results).toEqual([{ jobId: "job_draft", status: "succeeded" }]);

    // 정책을 바꾼 concept 변경은 감사 로그에 남지 않는다.
    const conceptAudit = await call("GET", "/audit-logs?entityType=concept&entityId=con");
    expect(conceptAudit.body.data).toEqual([]);
    await server.close();
  });
});

describe("R3 scheduled → approved 재승인 후 재예약 시 이전 publish job 이 남는다", () => {
  it("구 job 이 이전 시각에 게시하고, 신규 job 은 queued 상태로 매 폴링마다 실패한다", async () => {
    const { call, worker, repositories, server } = setup();
    await seedAccountAndConcept(call);
    await call("POST", "/candidates", {
      id: "cand_re",
      accountId: "acc",
      conceptId: "con",
      status: "ready_for_review",
      format: "feed_image",
      caption: "synthetic"
    });
    await call("POST", "/candidates/cand_re/approve", {});
    const t1 = soon();
    await call("POST", "/candidates/cand_re/schedule", { scheduledAt: t1, publisherPluginId: "plugin_pub", publishJobId: "job_old" });

    // 일정 취소 경로가 없으므로 approve 가 scheduled → approved 로 되돌린다 (전이표상 허용).
    const reapproved = await call("POST", "/candidates/cand_re/approve", {});
    expect(reapproved.status).toBe(200);
    expect(reapproved.body.data.status).toBe("approved");
    expect(repositories.publishJobs.getById("job_old")?.status).toBe("queued");

    const t2 = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    await call("POST", "/candidates/cand_re/schedule", { scheduledAt: t2, publisherPluginId: "plugin_pub", publishJobId: "job_new" });

    // 사용자는 t2 로 미뤘지만, 구 job 이 t1 기준으로 게시된다.
    const calls: string[] = [];
    const first = await worker("manual", later(), calls).scheduler.pollOnce();
    expect(first.results).toEqual([{ jobId: "job_old", status: "succeeded" }]);

    // t2 이후: 신규 job 은 후보가 published 라 실패하지만 queued 로 남아 재선택된다.
    const after = Date.now() + 48 * 60 * 60_000;
    for (let i = 0; i < 2; i += 1) {
      const poll = await worker("manual", after, calls).scheduler.pollOnce();
      expect(poll.results[0]?.jobId).toBe("job_new");
      expect(poll.results[0]?.status).toBe("failed");
    }
    expect(repositories.publishJobs.getById("job_new")?.status).toBe("queued");
    expect(calls).toEqual(["job_old:cand_re"]);
    await server.close();
  });
});

describe("R4 외부 게시 성공 후 로컬 기록 실패 시 재시도로 중복 게시된다 (결함 주입)", () => {
  it("markPublishSucceeded 1회 실패 → retry_scheduled → 다음 폴링에서 publish 재호출", async () => {
    const { call, worker, repositories, server } = setup();
    await seedAccountAndConcept(call);
    await call("POST", "/candidates", {
      id: "cand_dup", accountId: "acc", conceptId: "con", status: "ready_for_review", format: "feed_image", caption: "s"
    });
    await call("POST", "/candidates/cand_dup/approve", {});
    await call("POST", "/candidates/cand_dup/schedule", { scheduledAt: soon(), publisherPluginId: "plugin_pub", publishJobId: "job_dup" });

    const calls: string[] = [];
    const w1 = worker("manual", later(), calls);
    const original = w1.workflow.markPublishSucceeded.bind(w1.workflow);
    let injected = false;
    w1.workflow.markPublishSucceeded = async (cmd) => {
      if (!injected) {
        injected = true;
        throw new Error("synthetic sqlite busy");
      }
      return original(cmd);
    };
    const r1 = await w1.scheduler.pollOnce();
    expect(r1.results[0]?.status).toBe("failed");
    expect(repositories.publishJobs.getById("job_dup")?.status).toBe("retry_scheduled");

    const r2 = await worker("manual", later() + 60 * 60_000, calls).scheduler.pollOnce();
    expect(r2.results[0]?.status).toBe("succeeded");
    expect(calls).toEqual(["job_dup:cand_dup", "job_dup:cand_dup"]);
    await server.close();
  });
});

describe("R5 IG_MANAGER_LOCAL_TOKEN 미설정 시 인증 없이 상태 변경 가능", () => {
  it("Authorization 헤더 없이 승인 요청이 통과한다", async () => {
    const { call, server } = setup({ apiToken: null });
    await seedAccountAndConcept(call);
    await call("POST", "/candidates", {
      id: "cand_open", accountId: "acc", conceptId: "con", status: "ready_for_review", format: "feed_image", caption: "s"
    });
    const res = await call("POST", "/candidates/cand_open/approve", {}, {} as typeof AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
    await server.close();
  });
});

describe("R6 plugin metadata 의 비밀값 제거는 최상위 키만 처리한다", () => {
  it("중첩된 accessToken 이 GET /plugins 로 노출된다", async () => {
    const { call, server } = setup();
    const res = await call("GET", "/plugins");
    expect(res.body.data[0].metadata.token).toBeUndefined();
    expect(res.body.data[0].metadata.settings).toEqual({ accessToken: "SYNTHETIC-NESTED-SECRET" });
    await server.close();
  });
});

describe("이미 막혀 있는 경로 (회귀 기준선)", () => {
  it("draft 는 approve 할 수 없고, 계정 기본 정책에서 draft 예약은 거부된다", async () => {
    const { call, server } = setup();
    await seedAccountAndConcept(call);
    await call("POST", "/candidates", { id: "cand_d", accountId: "acc", conceptId: "con", format: "feed_image", caption: "s" });
    const approve = await call("POST", "/candidates/cand_d/approve", {});
    expect(approve.status).toBeGreaterThanOrEqual(400);
    const schedule = await call("POST", "/candidates/cand_d/schedule", { scheduledAt: soon(), publisherPluginId: "plugin_pub" });
    expect(schedule.status).toBeGreaterThanOrEqual(400);
    await server.close();
  });

  it("autoPublish=false job 은 auto 워커가 건너뛴다", async () => {
    const { call, worker, server } = setup();
    await seedAccountAndConcept(call);
    await call("POST", "/candidates", { id: "cand_m", accountId: "acc", conceptId: "con", status: "ready_for_review", format: "feed_image", caption: "s" });
    await call("POST", "/candidates/cand_m/approve", {});
    await call("POST", "/candidates/cand_m/schedule", { scheduledAt: soon(), publisherPluginId: "plugin_pub", publishJobId: "job_m" });
    const calls: string[] = [];
    const r = await worker("auto", later(), calls).scheduler.pollOnce();
    expect(r.selected).toBe(0);
    expect(calls).toEqual([]);
    await server.close();
  });
});
