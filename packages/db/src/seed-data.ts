import {
  createAccount,
  createAuditLog,
  createConcept,
  createContentAsset,
  createContentRecipe,
  createPluginRegistration,
  createPostCandidate,
  type Account,
  type AuditLog,
  type Concept,
  type ContentAsset,
  type ContentRecipe,
  type PluginRegistration,
  type PostCandidate
} from "@ig-manager/domain";
import type { DatabaseHandle } from "./database.js";
import { createRepositories } from "./repositories/index.js";

/**
 * Seed data vs. sample data
 *
 * - Seed data (this file) is a synthetic starter workspace written into the
 *   user's real local SQLite database, on request only (dashboard button,
 *   `POST /workspace/seed` or `pnpm --filter @ig-manager/db seed`). It is
 *   persisted, goes through the normal review workflow and every record carries
 *   `metadata.seed = STARTER_SEED_VERSION` so it can be told apart later.
 * - Sample data (`apps/web/src/api/sampleData.ts`) lives only in the browser.
 *   It is never written anywhere and is shown only when the user explicitly
 *   opens the sample preview. It never replaces API data on failure.
 * - `demo-data.ts` is a repository test fixture and is not used at runtime.
 */
export const STARTER_SEED_VERSION = "starter-v1";

export const STARTER_MOCK_PUBLISHER_ID = "plugin_starter_mock_publisher";

export interface StarterSeedData {
  accounts: Account[];
  concepts: Concept[];
  assets: ContentAsset[];
  recipes: ContentRecipe[];
  candidates: PostCandidate[];
  plugins: PluginRegistration[];
  auditLogs: AuditLog[];
}

export class WorkspaceNotEmptyError extends Error {
  constructor() {
    super("The workspace already has accounts. Seed data is only loaded into an empty workspace.");
    this.name = "WorkspaceNotEmptyError";
  }
}

export function createStarterSeedData(now: string = new Date().toISOString()): StarterSeedData {
  const seed = { seed: STARTER_SEED_VERSION };
  const timestamps = { createdAt: now, updatedAt: now };

  const accounts = [
    createAccount({
      id: "account_starter_studio",
      platform: { id: "instagram", displayName: "Instagram", metadata: {} },
      handle: "starter_studio",
      displayName: "Starter Studio",
      status: "draft",
      schedulePolicy: {
        timezone: "UTC",
        minLeadTimeMinutes: 5,
        maxPostsPerDay: 10,
        allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
        allowedTimeWindows: [{ start: "00:00", end: "23:59" }]
      },
      pluginRegistrationIds: [STARTER_MOCK_PUBLISHER_ID],
      notes: "Synthetic starter account. It is not connected to any real platform account.",
      metadata: seed,
      ...timestamps
    })
  ];

  const concepts = [
    createConcept({
      id: "concept_starter_desk",
      accountId: "account_starter_studio",
      name: "Desk Rituals",
      description: "Small, repeatable routines that make a creative desk easier to work at.",
      audience: "Solo creators who plan posts in short sessions.",
      pillars: ["routine", "workspace"],
      voice: "Warm, short sentences.",
      recipeIds: ["recipe_starter_tip"],
      metadata: seed,
      ...timestamps
    }),
    createConcept({
      id: "concept_starter_palette",
      accountId: "account_starter_studio",
      name: "Palette Notes",
      description: "One colour combination per post with a note on where it works.",
      audience: "Designers collecting colour references.",
      pillars: ["colour", "reference"],
      voice: "Precise and visual.",
      metadata: seed,
      ...timestamps
    })
  ];

  const assets = [
    createContentAsset({
      id: "asset_starter_desk",
      type: "image",
      uri: "local://starter/desk-sketch.png",
      title: "Desk sketch",
      tags: ["desk"],
      accountIds: ["account_starter_studio"],
      conceptIds: ["concept_starter_desk"],
      rights: { usage: "owned" },
      metadata: seed,
      importedAt: now,
      ...timestamps
    }),
    createContentAsset({
      id: "asset_starter_palette",
      type: "image",
      uri: "local://starter/palette-swatch.png",
      title: "Palette swatch",
      tags: ["palette"],
      accountIds: ["account_starter_studio"],
      conceptIds: ["concept_starter_palette"],
      rights: { usage: "owned" },
      metadata: seed,
      importedAt: now,
      ...timestamps
    })
  ];

  const recipes = [
    createContentRecipe({
      id: "recipe_starter_tip",
      conceptId: "concept_starter_desk",
      name: "One Tip Post",
      summary: "A single practical tip with one supporting image.",
      contentPillars: ["routine"],
      requiredAssetTypes: ["image"],
      format: "feed_image",
      instructions: ["Pick one routine.", "Describe it in two sentences.", "Close with a question."],
      reviewChecklist: ["Matches concept voice", "Only one tip"],
      metadata: seed,
      ...timestamps
    })
  ];

  const candidates = [
    createPostCandidate({
      id: "candidate_starter_morning",
      accountId: "account_starter_studio",
      conceptId: "concept_starter_desk",
      recipeId: "recipe_starter_tip",
      assetIds: ["asset_starter_desk"],
      status: "ready_for_review",
      format: "feed_image",
      caption: "Clear one corner of the desk before you open any app. #deskritual #routine",
      metadata: seed,
      ...timestamps
    }),
    createPostCandidate({
      id: "candidate_starter_evening",
      accountId: "account_starter_studio",
      conceptId: "concept_starter_desk",
      recipeId: "recipe_starter_tip",
      assetIds: ["asset_starter_desk"],
      status: "ready_for_review",
      format: "feed_image",
      caption: "Leave tomorrow's first task written on a sticky note. #deskritual",
      metadata: seed,
      ...timestamps
    }),
    createPostCandidate({
      id: "candidate_starter_palette",
      accountId: "account_starter_studio",
      conceptId: "concept_starter_palette",
      assetIds: ["asset_starter_palette"],
      status: "ready_for_review",
      format: "feed_image",
      caption: "Moss green with warm sand: calm, readable and good for long captions. #palette",
      metadata: seed,
      ...timestamps
    })
  ];

  const plugins = [
    createPluginRegistration({
      id: STARTER_MOCK_PUBLISHER_ID,
      pluginId: "official.mock-publisher",
      name: "Mock Publisher (no external calls)",
      version: "0.1.0",
      type: "publisher",
      enabled: true,
      officialApiOnly: true,
      capabilities: ["publish.mock"],
      permissions: ["candidate:read", "publish:approved"],
      metadata: { ...seed, mock: true },
      ...timestamps
    })
  ];

  const auditLogs = [
    createAuditLog({
      id: "audit_starter_seeded",
      action: "workspace.seeded",
      actorId: "seed",
      entityType: "workspace",
      entityId: "local",
      metadata: { ...seed },
      createdAt: now
    })
  ];

  return { accounts, concepts, assets, recipes, candidates, plugins, auditLogs };
}

/**
 * Writes the starter seed into an empty workspace in one transaction.
 * Refuses to touch a workspace that already has accounts.
 */
export function seedStarterWorkspace(
  handle: Pick<DatabaseHandle, "client" | "db">,
  options: { actorId?: string; now?: string } = {}
): StarterSeedData {
  const repos = createRepositories(handle.db);
  const seed = createStarterSeedData(options.now);

  handle.client.transaction(() => {
    if (repos.accounts.list().length > 0) {
      throw new WorkspaceNotEmptyError();
    }

    for (const account of seed.accounts) repos.accounts.create(account);
    for (const concept of seed.concepts) repos.concepts.create(concept);
    for (const asset of seed.assets) repos.assets.create(asset);
    for (const recipe of seed.recipes) repos.recipes.create(recipe);
    for (const plugin of seed.plugins) repos.plugins.create(plugin);
    for (const candidate of seed.candidates) repos.candidates.create(candidate);
    for (const auditLog of seed.auditLogs) {
      repos.auditLogs.append(options.actorId ? { ...auditLog, actorId: options.actorId } : auditLog);
    }
  })();

  return seed;
}
