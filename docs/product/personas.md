# IG Manager Personas

## Overview

IG Manager serves people who operate Instagram accounts as repeatable content systems. The common pattern across personas is that they manage multiple accounts, multiple concepts, or multiple content pipelines where context, review, and scheduling matter as much as publishing.

## Persona 1: Solo Concept Creator

### Profile

- Runs several themed Instagram accounts.
- Experiments with different content concepts and audiences.
- Works alone or with occasional freelancers.
- Needs structure without heavy agency software.

### Goals

- Keep account concepts separate.
- Save references and assets in one local workspace.
- Turn ideas into post candidates quickly.
- Review captions, visuals, and timing before publishing.
- Avoid accidental posting to the wrong account or concept.

### Pain Points

- Ideas, references, and captions are scattered across folders, notes, and chats.
- Existing schedulers focus on calendar slots rather than concept development.
- It is hard to remember the tone, audience, and content rules for each account.
- AI tools produce drafts, but the user still needs a controlled review pipeline.

### Key Workflows

- Create an account and several concepts.
- Build a concept profile with voice, audience, visual notes, and examples.
- Add assets and references.
- Create post candidates from assets and notes.
- Review, revise, approve, and schedule.

### Success Looks Like

- The creator can open a concept and immediately understand what content belongs there.
- The weekly content queue is visible and organized by account and concept.
- No content is published without deliberate approval.

## Persona 2: Content Operations Manager

### Profile

- Manages several accounts for a company, studio, or content network.
- Coordinates ideation, production, review, and scheduling.
- Works with creators, editors, designers, and reviewers.
- Cares about process consistency and audit history.

### Goals

- Standardize content workflows across accounts.
- Track every candidate through review and scheduling.
- Maintain concept profiles as operating documentation.
- Reduce repetitive manual coordination.
- Use official platform integrations for publishing and analytics.

### Pain Points

- Review status is unclear across tools.
- Team members reuse assets without knowing context or approval state.
- Publishing failures are discovered late.
- Content guidelines drift over time.
- AI-assisted drafts need provenance and review controls.

### Key Workflows

- Define account-level review policy.
- Maintain concept profiles and content pillars.
- Assign or filter post candidates by status.
- Approve content for scheduling.
- Validate scheduled posts against official API requirements.
- Review publish results and failures.

### Success Looks Like

- The manager can see exactly what is blocked, ready, approved, scheduled, or published.
- Concept documentation reduces rework.
- Official API validation catches problems before the publish window.

## Persona 3: Boutique Agency Strategist

### Profile

- Manages Instagram accounts for multiple clients.
- Needs clear separation between client workspaces, accounts, concepts, assets, and approvals.
- May collaborate with client stakeholders before scheduling.

### Goals

- Keep client content organized and separated.
- Build concept profiles that align with each brand.
- Prepare reviewable post candidates.
- Maintain approval history.
- Export or hand off content plans when needed.

### Pain Points

- Client approvals happen across email, spreadsheets, and chat.
- Brand voice and visual rules are inconsistently applied.
- Existing tools are either too social-media-calendar focused or too broad.
- Agencies need extensibility but cannot rely on unsafe platform workarounds.

### Key Workflows

- Create a workspace per client or client group.
- Define accounts and concepts for each brand.
- Add brand assets, reference examples, and campaign notes.
- Move candidates through internal and client review.
- Schedule approved posts through official connectors.

### Success Looks Like

- Stakeholders can understand what is ready and what needs feedback.
- Content plans are portable and auditable.
- Publishing remains compliant with official platform capabilities.

## Persona 4: Plugin Developer

### Profile

- Builds extensions for IG Manager.
- May develop official platform connectors, import/export tools, analytics views, or private automation plugins.
- Needs stable contracts and clear boundaries.

### Goals

- Understand Core data models and lifecycle events.
- Request only the permissions required by the plugin.
- Integrate official APIs safely.
- Add functionality without forking the Core.
- Build private AI plugins without exposing proprietary automation logic.

### Pain Points

- Social platform APIs have strict and changing constraints.
- Unclear plugin boundaries create security and maintenance risks.
- AI automation can accidentally bypass review if contracts are weak.
- Users need transparency into what plugins can read or change.

### Key Workflows

- Build a plugin manifest.
- Register capabilities such as import, validation, scheduling, publishing, analytics, or candidate generation.
- Implement official API authentication and token storage hooks.
- Return structured validation errors and publish results.
- Respect review and approval requirements.

### Success Looks Like

- Plugins are isolated, permissioned, and testable.
- Official API constraints are visible in the UI.
- Private plugins can create candidates but do not bypass Core policy by default.

## Persona 5: Editorial Reviewer

### Profile

- Reviews captions, creative direction, brand fit, compliance, and timing.
- May not own the full workspace.
- Needs a focused view of pending decisions.

### Goals

- See what needs review.
- Understand the concept profile behind each candidate.
- Leave clear feedback.
- Approve or request changes.
- Avoid reviewing content without enough context.

### Pain Points

- Reviewers often see drafts without audience, concept, or asset provenance.
- Feedback gets lost outside the scheduling tool.
- Approval is sometimes implied rather than explicit.

### Key Workflows

- Filter candidates by ready for review.
- Open candidate detail with linked concept profile and assets.
- Compare caption versions and media.
- Leave feedback.
- Approve or request changes.

### Success Looks Like

- Review decisions are explicit and recorded.
- Feedback stays attached to the candidate.
- Approved content can move to scheduling without ambiguity.

## Shared User Needs

- Clear account and concept separation.
- Local data ownership.
- Fast search across assets, references, and post candidates.
- Review status that is obvious at a glance.
- Scheduling that respects account timezone and platform constraints.
- Official API publishing only.
- Extensibility without unsafe automation.

## Anti-Personas

IG Manager is not designed for:

- Users seeking engagement bots.
- Users seeking scraping or unauthorized data collection.
- Users seeking stealth browser control or CAPTCHA bypass.
- Users trying to evade Instagram or Meta platform limits.
- Users who want uncontrolled auto-publishing without review safeguards.

