# IG Manager Product Vision

## Product Definition

IG Manager is a local-first content operations platform for managing multiple concept-driven Instagram accounts. It is designed for creators, operators, agencies, and small teams that need a repeatable system for developing account concepts, organizing references, producing post candidates, reviewing work, scheduling approved content, and publishing through official platform integrations.

The product is not only an Instagram scheduler. The core idea is a concept-based content operating system:

- Manage multiple Instagram accounts from one local workspace.
- Define multiple content concepts per account.
- Maintain concept profiles that describe audience, voice, visual rules, content pillars, reference examples, and operating constraints.
- Store content assets, references, drafts, candidates, review notes, and scheduling decisions together.
- Support a review-first publishing workflow.
- Publish only through official APIs and approved platform integrations.
- Provide an open plugin system for official platform connectors, import/export tools, analytics, and workflow extensions.
- Keep private AI content factory automation separate from the open-source Core.

## Vision Statement

IG Manager helps content operators turn scattered ideas, references, assets, and publishing tasks into a structured operating system for Instagram accounts, while preserving local ownership, review control, and platform compliance.

## Core Principles

### Local First

The open-source Core should work from a local project workspace by default. Users should be able to inspect, back up, version, and migrate their data without depending on a hosted service.

### Concept First

The main organizing unit is the concept, not the calendar. Each account can contain several concepts, and each concept should carry enough context to guide ideation, asset selection, post production, review, and scheduling.

### Review Before Publishing

Default automation must be generate, review, and schedule. The Core should not encourage uncontrolled auto-publishing. Publishing should require explicit user approval, workspace policy, and an official platform connector.

### Official APIs Only

The product must not include scraping, stealth browser automation, CAPTCHA bypass, anti-detection logic, or behavior designed to evade platform restrictions. Publishing, media upload, account data access, and insights should use official APIs or approved integrations only.

### Extensible Core

The open-source Core should provide stable domain models, workflow state, local storage, UI primitives, and plugin contracts. Platform-specific publishing, analytics, AI generation, and advanced automations should live behind plugins.

### Private AI Automation Boundary

AI-assisted content generation can be valuable, but private AI content factory plugins must remain separate from the open-source Core. The Core may define safe interfaces for candidate creation, provenance tracking, review queues, and policy checks, but it should not bundle private generation systems.

## Target Users

- Solo creators managing several themed Instagram accounts.
- Content operators running concept-driven accounts at scale.
- Agencies managing multiple client accounts and brand concepts.
- Small media teams that need structured asset reuse, review, scheduling, and publishing.
- Developers who want to build official platform connectors or workflow plugins.

## Primary Jobs To Be Done

- "I need to keep separate Instagram account concepts organized without mixing voices, audiences, and content rules."
- "I need a repeatable pipeline from idea to reviewed post to scheduled publication."
- "I need to track assets, references, captions, hashtags, and notes in one place."
- "I need to review and approve post candidates before anything is published."
- "I need an extensible system where platform integrations and AI automation can be added without locking the Core to one workflow."

## Product Scope

### In Scope For Core

- Local workspace management.
- Instagram account records and metadata.
- Concept profiles per account.
- Content assets and external references.
- Post candidates with captions, media, metadata, and review status.
- Review workflow and approval history.
- Scheduling calendar and queue.
- Plugin registry and plugin permission model.
- Official platform plugin interface.
- Import/export and backup-friendly data model.
- Basic analytics ingestion through official APIs when connected by plugins.

### Out Of Scope For Core

- Scraping Instagram or third-party sites.
- Stealth browser automation.
- CAPTCHA solving or bypass.
- Anti-detection features.
- Credential sharing workarounds.
- Uncontrolled auto-publishing.
- Bundled private AI content factory logic.
- Any feature whose primary purpose is evading platform limits, terms, or review gates.

## Product Modules

### Workspace

The workspace stores account records, concepts, assets, references, post candidates, schedules, plugin configuration, and audit history.

### Accounts

Accounts represent managed Instagram identities. Each account can have platform connection status, publishing permissions, default review policy, timezone, and concept list.

### Concepts

Concepts define the creative and operational frame for content. A concept profile should include:

- Name and short description.
- Target audience.
- Content pillars.
- Tone and voice.
- Visual style notes.
- Caption rules.
- Hashtag guidance.
- Reference examples.
- Constraints and prohibited topics.
- Posting cadence goals.
- Review requirements.

### Assets And References

Assets include original media, edited media, templates, captions, notes, and supporting files. References include URLs, screenshots, examples, inspiration, competitor observations, and research notes. The Core should distinguish owned assets from references.

### Post Candidates

Post candidates are draft content units that may become scheduled posts. They should support media attachments, caption versions, hashtags, concept links, asset provenance, notes, review state, scheduled time, and publishing status.

### Review Workflow

Review workflow should support states such as draft, ready for review, changes requested, approved, scheduled, published, failed, and archived. Approval history should be recorded.

### Scheduling

Scheduling should allow users to place approved candidates into a calendar or queue. The scheduler should validate account connection, media requirements, API limitations, timezone, and plugin support before publication.

### Publishing Plugins

Publishing should be implemented through official platform plugins. The Core should define plugin capabilities, permission requests, validation hooks, scheduling hooks, publish actions, result reporting, and error handling.

### AI Content Factory Plugin

Private AI automation should use Core interfaces to create post candidates, attach provenance, suggest captions, generate variants, or propose schedules. It should not bypass review workflow by default.

## Success Criteria

### Product Success

- Users can organize multiple accounts and concepts without losing context.
- Users can move content from reference to candidate to approved schedule with clear state.
- Users understand what is pending review, approved, scheduled, and published.
- Users can add official publishing plugins without changing Core data models.
- Users can use private AI plugins while keeping review and provenance visible.

### Engineering Success

- The Core domain model is stable enough for plugins.
- Local data is portable and backup-friendly.
- Plugin permissions are explicit.
- Official API constraints are represented in validation, not hidden until publish time.
- Tests cover workflow state transitions and plugin contracts.

## Non-Goals

- Building a social network engagement bot.
- Automating likes, comments, follows, unfollows, or direct messages.
- Circumventing Instagram or Meta platform controls.
- Replacing human editorial review.
- Creating a hosted SaaS as the default architecture.

## Product Positioning

IG Manager should sit between a creative knowledge base, a lightweight digital asset manager, an editorial workflow tool, and an official-api scheduler. Its differentiator is the concept model: accounts are operated through reusable creative systems rather than ad hoc calendar entries.

