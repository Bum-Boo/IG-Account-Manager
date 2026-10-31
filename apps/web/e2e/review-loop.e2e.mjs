// End-to-end test of the review-first loop through the real dashboard, the
// real local API and the real worker (mock publisher only, no external calls).
//
//   pnpm build && pnpm test:e2e
//
// Uses Playwright's Chromium when it can be resolved from this machine (it is
// intentionally not a workspace dependency); otherwise the test is skipped.
// Screenshots go to E2E_OUTPUT_DIR (default: apps/web/e2e/output, git-ignored).

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const webDir = resolve(here, "..");
const apiEntry = join(root, "apps/api/dist/index.js");
const workerEntry = join(root, "apps/worker/dist/index.js");
const apiPort = Number(process.env.E2E_API_PORT ?? 3197);
const webPort = Number(process.env.E2E_WEB_PORT ?? 5197);
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const outputDir = resolve(process.env.E2E_OUTPUT_DIR ?? join(here, "output"));

const chromium = loadChromium();
const skip = !chromium ? "playwright is not installed on this machine" : undefined;

let workDir;
let databaseUrl;
let apiProcess;
let webProcess;
let browser;

before(async () => {
  if (skip) return;

  for (const entry of [apiEntry, workerEntry]) {
    if (!existsSync(entry)) throw new Error(`${entry} is missing. Run "pnpm build" before "pnpm test:e2e".`);
  }

  mkdirSync(outputDir, { recursive: true });
  workDir = mkdtempSync(join(tmpdir(), "ig-manager-e2e-"));
  databaseUrl = join(workDir, "workspace.sqlite");
  apiProcess = await startApi();

  const vitePackage = createRequire(join(webDir, "package.json")).resolve("vite/package.json");
  const viteBin = join(dirname(vitePackage), "bin", "vite.js");
  webProcess = spawn(process.execPath, [viteBin, "--port", String(webPort), "--strictPort", "--host", "127.0.0.1"], {
    cwd: webDir,
    env: { ...process.env, API_PROXY_TARGET: apiUrl },
    stdio: "ignore"
  });
  await waitForUrl(`${webUrl}/`);
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await stopProcess(webProcess);
  await stopProcess(apiProcess);
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

test("prepare, review, schedule, run the mock worker and check results and audit log", { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${webUrl}/#/candidates`);
  await page.getByRole("heading", { name: "Your workspace is empty" }).waitFor();
  await page.getByRole("button", { name: "Load starter seed", exact: true }).click();
  await page.getByText("3 candidates waiting for a decision").waitFor();

  // Prepare new work from the dashboard.
  await page.locator(".prepare-panel summary").click();
  await page.getByLabel("Concept").selectOption({ label: "Palette Notes" });
  await page.getByLabel("Caption").fill("Slate blue with chalk white for quiet carousel covers. #palette");
  await page.getByRole("button", { name: "Add to review queue", exact: true }).click();
  await page.getByText("4 candidates waiting for a decision").waitFor();

  // Inspect and approve one candidate, reject another.
  await page.goto(`${webUrl}/#/candidates/candidate_starter_morning`);
  const detail = page.locator(".candidate-detail-panel");
  await detail.getByText("Clear one corner of the desk").waitFor();
  await detail.getByRole("button", { name: "Approve", exact: true }).click();
  await detail.locator(".detail-header .status-pill", { hasText: "approved" }).waitFor();

  // Schedule with the default publish time (tomorrow 10:00 local).
  await detail.getByRole("button", { name: "Schedule approved", exact: true }).click();
  await detail.locator(".detail-header .status-pill", { hasText: "scheduled" }).waitFor();
  const job = detail.locator(".job-summary");
  await job.locator(".status-pill", { hasText: "queued" }).waitFor();
  const jobId = await job.getAttribute("data-job-id");
  assert.ok(jobId, "schedule should create a publish job");

  await page.goto(`${webUrl}/#/candidates/candidate_starter_evening`);
  await detail.getByLabel("Review note").fill("Too close to the morning post.");
  await detail.getByRole("button", { name: "Reject", exact: true }).click();
  await detail.locator(".detail-header .status-pill", { hasText: "rejected" }).waitFor();

  // The polling worker in auto mode leaves review-first jobs alone.
  await runWorkerOnce();
  assert.equal((await apiGet(`/publish-jobs`)).find((item) => item.id === jobId).status, "queued");

  // Hand the job to the worker, run it once, then refresh.
  await page.goto(`${webUrl}/#/candidates/candidate_starter_morning`);
  await job.getByRole("button", { name: "Run now", exact: true }).click();
  await job.getByText("Run requested: waiting for the local worker").waitFor();
  const workerOutput = await runWorkerOnce();
  assert.match(workerOutput, /succeeded/);

  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await detail.locator(".detail-header .status-pill", { hasText: "published" }).waitFor();
  await job.locator(".status-pill", { hasText: "succeeded" }).waitFor();
  await job.getByText("Published (mock id mock_candidate_starter_morning)").waitFor();
  await detail.locator(".audit-list").getByText("publish_job.succeeded").waitFor();

  // Results and the workspace audit log on the Jobs page.
  await page.goto(`${webUrl}/#/jobs`);
  const row = page.locator(`.table-row[data-job-id="${jobId}"]`);
  await row.locator(".status-pill", { hasText: "succeeded" }).waitFor();
  const auditText = await page.locator(".audit-list").innerText();
  for (const action of [
    "workspace.seeded",
    "candidate.created",
    "candidate.approved",
    "candidate.rejected",
    "candidate.scheduled",
    "publish_job.run_requested",
    "publish_job.started",
    "publish_job.succeeded"
  ]) {
    assert.ok(auditText.includes(action), `audit log should include ${action}`);
  }
  await page.screenshot({ path: join(outputDir, "jobs-desktop.png"), fullPage: true });

  const started = (await apiGet(`/audit-logs?entityType=publish_job&entityId=${jobId}`)).find((entry) => entry.action === "publish_job.started");
  assert.equal(started.actorId, "local-worker");
  assert.equal(started.metadata.trigger, "manual");
  assert.equal(started.metadata.runRequestedBy, "local-api");
  await page.close();
});

test("390px mobile: review, schedule and run controls are on screen", { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await page.goto(`${webUrl}/#/candidates/candidate_starter_palette`);
  const detail = page.locator(".candidate-detail-panel");
  await detail.getByText("Moss green with warm sand").waitFor();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: join(outputDir, "candidate-detail-390.png"), fullPage: true });

  for (const name of ["Approve", "Reject", "Regenerate", "Schedule approved"]) {
    await assertInViewportWidth(detail.getByRole("button", { name, exact: true }), name);
  }
  await assertInViewportWidth(detail.getByLabel("Publish time"), "Publish time");

  await detail.getByRole("button", { name: "Approve", exact: true }).tap();
  await detail.locator(".detail-header .status-pill", { hasText: "approved" }).waitFor();
  await detail.getByRole("button", { name: "Schedule approved", exact: true }).tap();
  await detail.locator(".job-summary .status-pill", { hasText: "queued" }).waitFor();
  await assertInViewportWidth(detail.locator(".job-summary").getByRole("button", { name: "Run now", exact: true }), "Run now (detail)");

  for (const label of ["Overview", "Candidates", "Jobs", "Settings"]) {
    await assertInViewportWidth(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: label, exact: true }), `nav ${label}`);
  }

  await page.goto(`${webUrl}/#/jobs`);
  await page.getByRole("heading", { name: "Worker monitor" }).waitFor();
  await assertNoHorizontalOverflow(page);
  await assertInViewportWidth(page.getByRole("button", { name: "Run now", exact: true }).first(), "Run now (jobs)");
  await assertInViewportWidth(page.getByRole("button", { name: "Refresh", exact: true }), "Refresh (jobs)");
  await page.screenshot({ path: join(outputDir, "jobs-390.png"), fullPage: true });
  await page.close();
});

test("API failure keeps the user's workspace and never swaps in sample data", { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${webUrl}/#/candidates`);
  await page.getByText("Moss green with warm sand").first().waitFor();

  await stopProcess(apiProcess);
  apiProcess = undefined;

  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.getByText("Could not refresh from the local API").waitFor();
  await page.getByTestId("connection-status").getByText("API unreachable").waitFor();
  // The user's own candidates are still on screen, and nothing from the sample set appears.
  assert.ok(await page.getByText("Slate blue with chalk white").first().isVisible());
  assert.equal(await page.getByText("Sample preview").count(), 0);
  assert.equal(await page.getByText("A content queue is useful only when review state is visible.").count(), 0);
  await page.screenshot({ path: join(outputDir, "api-failure-kept-context.png"), fullPage: true });

  // A fresh load while the API is down shows the error, not sample data.
  const fresh = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await fresh.goto(`${webUrl}/#/candidates`);
  await fresh.getByRole("heading", { name: "The local API is not reachable" }).waitFor();
  assert.equal(await fresh.locator(".candidate-card").count(), 0);
  await fresh.getByRole("button", { name: "Open sample preview", exact: true }).click();
  await fresh.getByText("Sample preview: example data, not saved").waitFor();
  await fresh.close();

  // Recovery: restart the API and retry from the error banner.
  apiProcess = await startApi();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByTestId("connection-status").getByText("API connected").waitFor();
  assert.equal(await page.getByText("Could not refresh from the local API").count(), 0);
  await page.close();
});

function loadChromium() {
  try {
    return createRequire(import.meta.url)("playwright").chromium;
  } catch {
    return undefined;
  }
}

async function startApi() {
  const child = spawn(process.execPath, [apiEntry], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "test", API_HOST: "127.0.0.1", API_PORT: String(apiPort), API_DATABASE_URL: databaseUrl, IG_MANAGER_LOCAL_TOKEN: "" },
    stdio: "ignore"
  });
  await waitForUrl(`${apiUrl}/health`);
  return child;
}

function runWorkerOnce() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [workerEntry, "--once"], {
      cwd: root,
      env: { ...process.env, WORKER_DATABASE_URL: databaseUrl, WORKER_LOG_LEVEL: "info" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolvePromise(output) : reject(new Error(`worker exited with ${code}:\n${output}`))));
  });
}

async function apiGet(path) {
  const response = await fetch(`${apiUrl}${path}`);
  assert.equal(response.status, 200, `GET ${path}`);
  return (await response.json()).data;
}

async function waitForUrl(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function stopProcess(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolveStop) => {
    child.once("exit", () => resolveStop());
    child.kill("SIGTERM");
  });
}

async function assertNoHorizontalOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  assert.ok(scrollWidth <= clientWidth, `page is ${scrollWidth}px wide in a ${clientWidth}px viewport`);
}

async function assertInViewportWidth(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box, `${label} should be rendered`);
  assert.ok(box.x >= 0 && box.x + box.width <= 390, `${label} spans ${Math.round(box.x)}-${Math.round(box.x + box.width)}px, outside 0-390px`);
}
