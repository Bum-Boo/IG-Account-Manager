# Workflow Engine

The workflow engine coordinates candidate creation, review, scheduling, publish job execution, retry handling, domain events, and audit logs. It is platform-agnostic and depends on repository interfaces rather than concrete database implementations.

## Responsibilities

- Create post candidates.
- Approve and reject candidates.
- Schedule candidates and create publish jobs.
- Find due publish jobs.
- Start publish jobs.
- Mark publish success or failure.
- Retry failed publish jobs when policy allows.
- Emit a domain event for every workflow action.
- Append an audit log for every workflow action.

## Boundaries

The workflow engine does not contain:

- API framework code.
- Instagram-specific logic.
- Database-specific imports.
- Dynamic plugin loading.
- Real publisher execution.

Publisher behavior is represented through the `PublisherPlugin` contract from `@ig-manager/plugin-sdk`. The engine checks that a publish job references an enabled publisher plugin and, when a registry is supplied, that a matching publisher contract exists. It does not load arbitrary plugin code.

## Repository Interfaces

The engine expects these logical repositories:

- `AccountRepository`
- `ConceptRepository`
- `CandidateRepository`
- `PublishJobRepository`
- `PluginRepository`
- `AuditLogRepository`

Concrete repositories from `packages/db` can implement these interfaces, but the workflow package does not import them.

## Scheduling Rules

A candidate must be approved before scheduling unless the concept explicitly allows auto-scheduling.

Concept-level workflow flags live in concept metadata:

```json
{
  "workflowPolicy": {
    "autoSchedule": true,
    "autoPublish": false
  }
}
```

Scheduling always creates a publish job tied to an enabled publisher plugin registration.

## Auto-Publish Rules

Auto-publish must be explicit at the account or concept level:

- account: `automationPolicy.allowAutoPublishing`
- concept: `metadata.workflowPolicy.autoPublish`

Manual execution can run a scheduled publish job after approval. Automatic execution checks both the publish job metadata and account/concept policy before starting.

## Retry Rules

Publish jobs start as `queued`. `runPublishJob` moves a due job to `running` and increments `attempt`.

When `markPublishFailed` receives a retryable failure and attempts remain, the job moves to `retry_scheduled` with `retryAfter`. `retryPublishJob` starts the retry and increments `attempt` again. Once attempts are exhausted or a failure is not retryable, the job moves to `failed` and the candidate moves to `publish_failed`.

## Events And Audit

Each workflow action emits domain events and appends audit logs:

- `createPostCandidate`: `CandidateCreated`
- `approveCandidate`: `CandidateApproved`
- `rejectCandidate`: `CandidateRejected`
- `scheduleCandidate`: `PostScheduled`
- `enqueueDuePublishJobs`: `PublishJobsDueChecked`, plus `PublishJobEnqueued` per due job
- `runPublishJob`: `PublishJobStarted`
- `markPublishSucceeded`: `PublishSucceeded`
- `markPublishFailed`: `PublishFailed`
- `retryPublishJob`: `PublishJobRetried`

