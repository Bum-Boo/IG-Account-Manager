# IG Manager User Flows

## Overview

IG Manager centers on a review-first content operations flow:

1. Set up a local workspace.
2. Add Instagram accounts.
3. Define concepts for each account.
4. Add assets and references.
5. Create post candidates.
6. Review and approve candidates.
7. Schedule approved content.
8. Publish through official platform plugins.
9. Record publish results and learn from analytics.

The default automation model is generate, review, and schedule. Any publishing action should depend on explicit approval and official platform integration support.

## Flow 1: Create A Workspace

### Actor

Solo creator, content operations manager, or agency strategist.

### Preconditions

- IG Manager is installed locally.
- User has a local folder where workspace data can be stored.

### Steps

1. User creates a new workspace.
2. User selects a workspace location.
3. Core initializes local data files and default settings.
4. Core creates default views for accounts, concepts, assets, candidates, reviews, and schedule.
5. User optionally configures backup or version-control preferences.

### Result

The user has a local workspace that can store accounts, concepts, assets, references, candidates, schedules, plugin settings, and audit history.

### Notes

- Workspace data should be portable.
- Secrets and API tokens should not be stored in plain project files.
- The Core should support future migration without locking the user into one storage implementation.

## Flow 2: Add An Instagram Account

### Actor

Account owner or workspace operator.

### Preconditions

- Workspace exists.
- User has permission to manage the Instagram account.

### Steps

1. User creates an account record.
2. User enters account name, handle, timezone, account purpose, and default review policy.
3. User optionally connects an official platform plugin.
4. Plugin performs official authentication and permission checks.
5. Core stores connection status and available capabilities.

### Result

The account appears in the workspace and can contain concepts, assets, post candidates, reviews, and schedules.

### Validation

- Core should prevent duplicate account records unless the user confirms.
- Plugin should report official API capability limits.
- Account must show whether publishing, insights, media upload, or scheduling are supported.

## Flow 3: Create A Concept Profile

### Actor

Creator, strategist, or content operations manager.

### Preconditions

- At least one account exists.

### Steps

1. User chooses an account.
2. User creates a new concept.
3. User adds concept name and short description.
4. User defines audience, content pillars, tone, visual style, caption rules, hashtag guidance, constraints, and cadence goals.
5. User attaches reference examples and relevant assets.
6. User saves the concept profile.

### Result

The concept becomes a reusable operating profile for ideation, review, candidate generation, and scheduling.

### Review Considerations

- Reviewers should be able to inspect the concept profile from any linked post candidate.
- Concept profile changes should be tracked when they affect future content decisions.

## Flow 4: Add Assets And References

### Actor

Creator, editor, designer, researcher, or automation plugin.

### Preconditions

- Workspace exists.
- Account and concept may already exist, but unassigned asset intake should also be possible.

### Steps

1. User imports files, adds notes, or saves external references.
2. User marks each item as owned asset or external reference.
3. User links items to accounts, concepts, campaigns, or candidate drafts.
4. User adds metadata such as usage rights, source, tags, notes, and status.
5. Core indexes the item for search.

### Result

Assets and references are available for content planning and candidate creation.

### Guardrails

- References should not be treated as owned assets unless explicitly marked.
- The product should not scrape protected content.
- External URLs are references, not authorization to copy or republish content.

## Flow 5: Create A Post Candidate Manually

### Actor

Creator or content operator.

### Preconditions

- Account exists.
- Concept exists.
- Assets or references may exist.

### Steps

1. User creates a post candidate under an account and concept.
2. User selects format, such as image, carousel, reel, or story where supported by official plugins.
3. User attaches media assets.
4. User writes caption, hashtags, alt text notes, and internal notes.
5. User links references or source assets.
6. User saves the candidate as draft.
7. User marks the candidate ready for review.

### Result

The candidate enters the review queue.

### Validation

- Core should flag missing media, unsupported formats, caption length issues, or plugin capability conflicts.
- Official API limitations should be surfaced before scheduling.

## Flow 6: Generate Post Candidates With A Private AI Plugin

### Actor

Creator, content operator, or private automation plugin.

### Preconditions

- Private AI content factory plugin is installed and enabled.
- Plugin has permission to read selected concept profiles, assets, and references.
- Account review policy is configured.

### Steps

1. User selects an account, concept, and generation objective.
2. Plugin reads only the data allowed by its permissions.
3. Plugin proposes post candidates, captions, variants, or asset pairings.
4. Plugin writes candidates into the Core as draft or ready for review, depending on workspace policy.
5. Core records provenance, plugin name, generation timestamp, source inputs, and confidence notes where available.
6. User reviews generated candidates before scheduling.

### Result

AI-assisted candidates are available in the normal review workflow.

### Guardrails

- Private AI automation remains outside the open-source Core.
- Generated candidates should not be published automatically by default.
- The plugin should not bypass approval, scheduling validation, or official API constraints.

## Flow 7: Review A Candidate

### Actor

Editorial reviewer, creator, client stakeholder, or operations manager.

### Preconditions

- Candidate is in ready for review state.

### Steps

1. Reviewer opens the review queue.
2. Reviewer filters by account, concept, status, assignee, campaign, or due date.
3. Reviewer opens a candidate detail view.
4. Reviewer checks media, caption, hashtags, notes, references, concept profile, and validation warnings.
5. Reviewer approves, requests changes, or archives the candidate.
6. Core records decision, reviewer, timestamp, and notes.

### Result

The candidate is either approved, returned for changes, or removed from the active pipeline.

### State Changes

- Draft to ready for review.
- Ready for review to changes requested.
- Changes requested to ready for review.
- Ready for review to approved.
- Ready for review to archived.

## Flow 8: Schedule Approved Content

### Actor

Content operations manager or creator.

### Preconditions

- Candidate is approved.
- Account has a schedule policy and timezone.
- Publishing plugin may be connected, but schedule planning should also work offline.

### Steps

1. User opens calendar or queue view.
2. User filters approved candidates by account and concept.
3. User chooses a date and time.
4. Core validates candidate against account settings and plugin capabilities.
5. User confirms schedule.
6. Core moves candidate to scheduled state.

### Result

The candidate has a scheduled publication slot.

### Validation

- Candidate must be approved unless workspace policy explicitly allows draft planning.
- Account timezone must be clear.
- Official API support must be checked when a publishing plugin is connected.
- Unsupported media formats should block publish scheduling or require manual action.

## Flow 9: Publish Through An Official Platform Plugin

### Actor

Scheduler service, user-triggered publish action, or official platform plugin.

### Preconditions

- Candidate is approved and scheduled.
- Official platform plugin is installed and authenticated.
- Plugin declares publish capability for the account and content type.
- Scheduled time has arrived or user triggers publish now.

### Steps

1. Core asks plugin to run final validation.
2. Plugin checks official API requirements and token status.
3. Core requests confirmation when required by workspace policy.
4. Plugin publishes through official APIs.
5. Plugin returns structured result.
6. Core records platform post ID, publish timestamp, status, warnings, errors, and retry eligibility.

### Result

The post is marked published or failed with actionable error details.

### Guardrails

- No scraping or browser automation is used.
- No CAPTCHA bypass or anti-detection logic is allowed.
- Failures should not trigger uncontrolled repeated publish attempts.
- Retry behavior should be explicit and rate-limit aware.

## Flow 10: Review Publish Results And Analytics

### Actor

Creator, strategist, or operations manager.

### Preconditions

- One or more posts have been published through an official plugin.
- Analytics plugin capability may be available.

### Steps

1. User opens published posts or analytics view.
2. Plugin fetches available metrics through official APIs.
3. Core maps metrics to account, concept, and post candidate.
4. User reviews performance by concept, content pillar, format, or schedule slot.
5. User updates concept notes or future planning decisions.

### Result

Performance data informs future content planning without changing the review-first workflow.

## Flow 11: Install A Community Plugin

### Actor

Workspace owner or developer.

### Preconditions

- Plugin package is available.
- User has permission to modify workspace plugins.

### Steps

1. User opens plugin manager.
2. User selects a plugin to install.
3. Core displays plugin manifest, capabilities, permissions, and data access requests.
4. User approves or rejects installation.
5. Core registers plugin and stores configuration.
6. Plugin capabilities become available in relevant views.

### Result

The workspace gains new functionality without changing the Core.

### Plugin Categories

- Official platform publishing connector.
- Import/export connector.
- Analytics connector.
- Asset processing tool.
- Review workflow extension.
- Private AI candidate generation plugin.

### Guardrails

- Plugins must declare permissions.
- Plugins must not bypass Core workflow policy.
- Publishing plugins must use official APIs.
- Community plugins should be sandboxed where practical.

## Flow 12: Export Or Back Up Workspace Data

### Actor

Workspace owner, agency strategist, or developer.

### Preconditions

- Workspace exists.

### Steps

1. User opens export or backup settings.
2. User selects accounts, concepts, assets, candidates, schedules, or full workspace.
3. Core validates destination and export format.
4. Core writes portable data files.
5. Secrets are excluded or exported through a separate secure path.

### Result

The user has a portable backup or handoff package.

## MVP Flow Priority

### MVP 0: Local Planning Core

- Workspace creation.
- Account records.
- Concept profiles.
- Assets and references.
- Manual post candidates.
- Review states.
- Basic calendar planning.

### MVP 1: Review And Scheduling

- Review queue.
- Approval history.
- Schedule validation.
- Candidate detail views.
- Workspace export.

### MVP 2: Official Publishing Plugins

- Plugin manifest and capability registry.
- Official Instagram publishing connector where API access is available.
- Publish result tracking.
- Failure handling.

### MVP 3: Extensibility And Automation

- Community plugin SDK.
- Private AI content factory plugin interface.
- Analytics plugin interface.
- Workflow automation hooks that preserve review-first policy.

