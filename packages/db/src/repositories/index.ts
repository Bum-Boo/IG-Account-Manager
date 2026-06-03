export * from "./account-connection.repository.js";
export * from "./account.repository.js";
export * from "./audit-log.repository.js";
export * from "./asset.repository.js";
export * from "./candidate.repository.js";
export * from "./concept.repository.js";
export * from "./plugin.repository.js";
export * from "./publish-job.repository.js";
export * from "./recipe.repository.js";
export * from "./secret-vault.repository.js";

import type { IgManagerDatabase } from "../database.js";
import { AccountConnectionRepository } from "./account-connection.repository.js";
import { AccountRepository } from "./account.repository.js";
import { AuditLogRepository } from "./audit-log.repository.js";
import { AssetRepository } from "./asset.repository.js";
import { CandidateRepository } from "./candidate.repository.js";
import { ConceptRepository } from "./concept.repository.js";
import { PluginRepository } from "./plugin.repository.js";
import { PublishJobRepository } from "./publish-job.repository.js";
import { RecipeRepository } from "./recipe.repository.js";
import { SecretVaultRepository } from "./secret-vault.repository.js";

export function createRepositories(db: IgManagerDatabase) {
  return {
    accountConnections: new AccountConnectionRepository(db),
    accounts: new AccountRepository(db),
    auditLogs: new AuditLogRepository(db),
    assets: new AssetRepository(db),
    candidates: new CandidateRepository(db),
    concepts: new ConceptRepository(db),
    plugins: new PluginRepository(db),
    publishJobs: new PublishJobRepository(db),
    recipes: new RecipeRepository(db),
    secretVault: new SecretVaultRepository(db)
  };
}
