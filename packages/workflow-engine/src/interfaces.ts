import type {
  Account,
  AuditLog,
  CandidateStatus,
  Concept,
  DomainEvent,
  PluginRegistration,
  PostCandidate,
  PublishJob,
  PublishJobStatus
} from "@ig-manager/domain";
import type { PublisherPlugin } from "@ig-manager/plugin-sdk";

export interface AccountRepository {
  getById(id: string): Account | undefined | Promise<Account | undefined>;
}

export interface ConceptRepository {
  getById(id: string): Concept | undefined | Promise<Concept | undefined>;
}

export interface CandidateRepository {
  create(candidate: PostCandidate): PostCandidate | Promise<PostCandidate>;
  getById(id: string): PostCandidate | undefined | Promise<PostCandidate | undefined>;
  update(candidate: PostCandidate): PostCandidate | Promise<PostCandidate>;
  getByStatus?(status: CandidateStatus): PostCandidate[] | Promise<PostCandidate[]>;
}

export interface PublishJobRepository {
  create(job: PublishJob): PublishJob | Promise<PublishJob>;
  getById(id: string): PublishJob | undefined | Promise<PublishJob | undefined>;
  update(job: PublishJob): PublishJob | Promise<PublishJob>;
  getScheduledJobsDueBefore(timestamp: string): PublishJob[] | Promise<PublishJob[]>;
}

export interface PluginRepository {
  getById(id: string): PluginRegistration | undefined | Promise<PluginRegistration | undefined>;
}

export interface AuditLogRepository {
  append(entry: AuditLog): AuditLog | Promise<AuditLog>;
}

export interface DomainEventPublisher {
  emit(event: DomainEvent): void | Promise<void>;
}

export interface PublisherPluginRegistry {
  getPublisher(pluginRegistrationId: string): PublisherPlugin | undefined | Promise<PublisherPlugin | undefined>;
}

export interface WorkflowRepositories {
  accounts: AccountRepository;
  auditLogs: AuditLogRepository;
  candidates: CandidateRepository;
  concepts: ConceptRepository;
  plugins: PluginRepository;
  publishJobs: PublishJobRepository;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
}

export interface WorkflowEngineOptions {
  repositories: WorkflowRepositories;
  events: DomainEventPublisher;
  publisherPlugins?: PublisherPluginRegistry;
  retryPolicy?: Partial<RetryPolicy>;
}

export interface WorkflowActionResult<TData> {
  data: TData;
  events: DomainEvent[];
  auditLogs: AuditLog[];
}

export interface ScheduleCandidateResult {
  candidate: PostCandidate;
  publishJob: PublishJob;
}

export interface EnqueueDuePublishJobsResult {
  jobs: PublishJob[];
}

export interface RunPublishJobResult {
  job: PublishJob;
  account: Account;
  candidate: PostCandidate;
  publisherPluginId: string;
}

export interface PublishFailureInput {
  code?: string;
  message: string;
  retryable?: boolean;
  retryAfter?: string;
}

export interface PublishSuccessInput {
  externalPostId?: string;
  permalink?: string;
  rawResultRef?: string;
}

export type PublishTrigger = "manual" | "auto";
export type PublishJobTerminalStatus = Extract<PublishJobStatus, "succeeded" | "failed">;
