import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import {
  createAuditLog,
  type Account,
  type ContentAsset,
  type ContentRecipe,
  type Concept,
  type PostCandidate
} from "@ig-manager/domain";
import type { ApiContext } from "./types.js";

export interface CandidateGenerationCommand {
  accountId: string;
  conceptId: string;
  recipeId: string;
  seed?: string | number;
  dryRun?: boolean;
  actorId?: string;
}

export interface CandidateGenerationProviderInput {
  account: Account;
  concept: Concept;
  recipe: ContentRecipe;
  assets: readonly ContentAsset[];
  recentCandidates: readonly PostCandidate[];
  seed?: string | number;
  dryRun?: boolean;
  pluginRegistrationId?: string;
}

export interface CandidateGenerationProviderResult {
  candidate: PostCandidate;
  generatedAsset: ContentAsset;
  selectedAssets: readonly ContentAsset[];
  provider: string;
  prompt?: string;
  plan?: unknown;
  metadata?: Record<string, unknown>;
}

export interface CandidateGenerationProvider {
  generateCandidate(input: CandidateGenerationProviderInput): Promise<CandidateGenerationProviderResult>;
}

export interface CandidateGenerationMetadata {
  requestId: string;
  provider: string;
  dryRun: boolean;
  accountId: string;
  conceptId: string;
  recipeId: string;
  selectedAssetIds: string[];
  generatedAssetId: string;
  generatedMediaUri: string;
  prompt?: string;
  selectedAssetExplanation?: unknown;
  providerMetadata?: Record<string, unknown>;
}

export interface CandidateGenerationOutput {
  candidateId: string;
  candidate: PostCandidate;
  generatedAsset: ContentAsset;
  selectedAssetIds: string[];
  metadata: CandidateGenerationMetadata;
  auditLogIds: string[];
}

export class CandidateGenerationUnavailableError extends Error {
  constructor(message = "Candidate generation is not configured for this local API instance.") {
    super(message);
    this.name = "CandidateGenerationUnavailableError";
  }
}

export class CandidateGenerationNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} '${id}' was not found.`);
    this.name = "CandidateGenerationNotFoundError";
  }
}

export class CandidateGenerationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidateGenerationFailedError";
  }
}

export async function runCandidateGeneration(
  context: ApiContext,
  command: CandidateGenerationCommand
): Promise<CandidateGenerationOutput> {
  const requestId = `generation_${randomUUID()}`;
  const actorId = command.actorId ?? context.actorId;
  const now = new Date().toISOString();
  const auditLogIds: string[] = [];

  const audit = (action: string, metadata: Record<string, unknown>, entityId = requestId) => {
    const log = createAuditLog({
      action,
      actorId,
      entityType: "generation",
      entityId,
      metadata: {
        requestId,
        ...metadata
      },
      createdAt: new Date().toISOString()
    });

    context.repositories.auditLogs.append(log);
    auditLogIds.push(log.id);
    return log;
  };

  audit("generation.requested", {
    accountId: command.accountId,
    conceptId: command.conceptId,
    recipeId: command.recipeId,
    dryRun: command.dryRun === true
  });

  try {
    const provider = context.candidateGenerationProvider ?? (await createDefaultCandidateGenerationProvider());

    if (!provider) {
      throw new CandidateGenerationUnavailableError();
    }

    const account = getRequired(context.repositories.accounts.getById(command.accountId), "account", command.accountId);
    const concept = getRequired(context.repositories.concepts.getById(command.conceptId), "concept", command.conceptId);
    const recipe = getRequired(context.repositories.recipes.getById(command.recipeId), "recipe", command.recipeId);

    if (concept.accountId !== account.id) {
      throw new CandidateGenerationFailedError(`Concept '${concept.id}' does not belong to account '${account.id}'.`);
    }

    if (recipe.conceptId !== concept.id) {
      throw new CandidateGenerationFailedError(`Recipe '${recipe.id}' does not belong to concept '${concept.id}'.`);
    }

    const assets = context.repositories.assets.getAssetsCompatibleWithConcept(concept.id);
    const recentCandidates = context.repositories.candidates.getByConcept(concept.id);
    const generated = await provider.generateCandidate({
      account,
      concept,
      recipe,
      assets,
      recentCandidates,
      seed: command.seed,
      dryRun: command.dryRun,
      pluginRegistrationId: "private.ai-content-factory"
    });
    const selectedAssetIds = generated.selectedAssets.map((asset) => asset.id);
    const plan = asRecord(generated.plan);
    const explanation = plan?.explanation ?? asRecord(generated.candidate.metadata.aiContentFactory)?.selectionExplanation;
    const providerMetadata = asRecord(generated.metadata) ?? asRecord(generated.generatedAsset.metadata.aiContentFactory);
    const candidate = normalizeGeneratedCandidate({
      candidate: generated.candidate,
      generatedAsset: generated.generatedAsset,
      selectedAssetIds,
      provider: generated.provider,
      dryRun: command.dryRun === true,
      prompt: generated.prompt,
      explanation,
      providerMetadata,
      recipeId: recipe.id,
      requestId,
      existingCandidateIds: new Set(context.repositories.candidates.list().map((item) => item.id))
    });

    audit("generation.assets_selected", {
      accountId: account.id,
      conceptId: concept.id,
      recipeId: recipe.id,
      selectedAssetIds,
      explanation
    });

    upsertGeneratedAsset(context, generated.generatedAsset);

    audit("generation.media_generated", {
      accountId: account.id,
      conceptId: concept.id,
      recipeId: recipe.id,
      provider: generated.provider,
      dryRun: command.dryRun === true,
      generatedAssetId: generated.generatedAsset.id,
      generatedMediaUri: generated.generatedAsset.uri
    });

    const created = await context.workflow.createPostCandidate({
      id: candidate.id,
      accountId: candidate.accountId,
      conceptId: candidate.conceptId,
      recipeId: candidate.recipeId,
      assetIds: candidate.assetIds,
      status: candidate.status,
      format: candidate.format,
      caption: candidate.caption,
      firstComment: candidate.firstComment,
      internalNotes: candidate.internalNotes,
      provenance: candidate.provenance,
      metadata: candidate.metadata,
      actorId,
      now: new Date(now)
    });

    auditLogIds.push(...created.auditLogs.map((log) => log.id));

    audit("generation.candidate_created", {
      accountId: account.id,
      conceptId: concept.id,
      recipeId: recipe.id,
      candidateId: created.data.id,
      generatedAssetId: generated.generatedAsset.id
    });

    return {
      candidateId: created.data.id,
      candidate: created.data,
      generatedAsset: generated.generatedAsset,
      selectedAssetIds,
      metadata: {
        requestId,
        provider: generated.provider,
        dryRun: command.dryRun === true,
        accountId: account.id,
        conceptId: concept.id,
        recipeId: recipe.id,
        selectedAssetIds,
        generatedAssetId: generated.generatedAsset.id,
        generatedMediaUri: generated.generatedAsset.uri,
        prompt: generated.prompt,
        selectedAssetExplanation: explanation,
        providerMetadata
      },
      auditLogIds
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    audit("generation.failed", {
      accountId: command.accountId,
      conceptId: command.conceptId,
      recipeId: command.recipeId,
      dryRun: command.dryRun === true,
      message
    });

    if (error instanceof CandidateGenerationUnavailableError || error instanceof CandidateGenerationNotFoundError) {
      throw error;
    }

    throw new CandidateGenerationFailedError(message);
  }
}

export async function createDefaultCandidateGenerationProvider(env: NodeJS.ProcessEnv = process.env): Promise<CandidateGenerationProvider | undefined> {
  if (env.IG_MANAGER_ENABLE_PRIVATE_AI_CONTENT_FACTORY !== "true" && !env.COMFYUI_WORKFLOW_TEMPLATE_PATH) {
    return undefined;
  }

  const modulePath = resolvePrivateFactoryModulePath(process.cwd());

  if (!modulePath) {
    return undefined;
  }

  const module = (await import(pathToFileURL(modulePath).toString())) as {
    createPrivateAiContentFactoryGenerationProvider?: (options?: { env?: NodeJS.ProcessEnv }) => CandidateGenerationProvider;
  };

  return module.createPrivateAiContentFactoryGenerationProvider?.({ env });
}

function normalizeGeneratedCandidate(input: {
  candidate: PostCandidate;
  generatedAsset: ContentAsset;
  selectedAssetIds: string[];
  provider: string;
  dryRun: boolean;
  prompt?: string;
  explanation?: unknown;
  providerMetadata?: Record<string, unknown>;
  recipeId: string;
  requestId: string;
  existingCandidateIds: ReadonlySet<string>;
}): PostCandidate {
  const metadata = asRecord(input.candidate.metadata.aiContentFactory) ?? {};
  const candidateId = uniqueId(input.candidate.id, input.existingCandidateIds);
  const altText = readString(input.generatedAsset.metadata.altText) ?? readString(metadata.altText);
  const aiContentFactoryMetadata: Record<string, unknown> = {
    ...metadata,
    statusLabel: "needs_review",
    requestId: input.requestId,
    provider: input.provider,
    dryRun: input.dryRun,
    selectedAssetIds: input.selectedAssetIds,
    generatedAssetId: input.generatedAsset.id,
    generatedMediaUri: input.generatedAsset.uri,
    prompt: input.prompt ?? metadata.prompt,
    selectionExplanation: input.explanation ?? metadata.selectionExplanation
  };

  if (input.providerMetadata) {
    aiContentFactoryMetadata.providerMetadata = input.providerMetadata;
  }

  if (altText) {
    aiContentFactoryMetadata.altText = altText;
  }

  return {
    ...input.candidate,
    id: candidateId,
    recipeId: input.recipeId,
    status: "ready_for_review",
    assetIds: uniqueStrings([...input.selectedAssetIds, input.generatedAsset.id]),
    provenance: {
      ...input.candidate.provenance,
      source: "plugin",
      pluginRegistrationId: input.candidate.provenance.pluginRegistrationId ?? "private.ai-content-factory",
      sourceAssetIds: input.selectedAssetIds
    },
    metadata: {
      ...input.candidate.metadata,
      aiContentFactory: aiContentFactoryMetadata
    }
  };
}

function upsertGeneratedAsset(context: ApiContext, asset: ContentAsset): void {
  if (context.repositories.assets.getById(asset.id)) {
    context.repositories.assets.update(asset);
    return;
  }

  context.repositories.assets.create(asset);
}

function getRequired<T>(value: T | undefined, entity: string, id: string): T {
  if (!value) {
    throw new CandidateGenerationNotFoundError(entity, id);
  }

  return value;
}

function resolvePrivateFactoryModulePath(start: string): string | undefined {
  const workspaceRoot = findWorkspaceRoot(start);

  if (!workspaceRoot) {
    return undefined;
  }

  const candidate = resolve(workspaceRoot, "private-plugins", "ai-content-factory", "dist", "index.js");

  return existsSync(candidate) ? candidate : undefined;
}

function findWorkspaceRoot(start: string): string | undefined {
  let current = resolve(start);

  while (true) {
    if (existsSync(resolve(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = dirname(current);

    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}

function uniqueId(id: string, existingIds: ReadonlySet<string>): string {
  if (!existingIds.has(id)) {
    return id;
  }

  let suffix = 2;
  let next = `${id}_${suffix}`;

  while (existingIds.has(next)) {
    suffix += 1;
    next = `${id}_${suffix}`;
  }

  return next;
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  }

  return unique;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
