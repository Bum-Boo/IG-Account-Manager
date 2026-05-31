# IG Manager Roadmap

## Roadmap Principles

- Build the local-first Core before platform automation.
- Treat concepts as first-class objects from the first milestone.
- Keep publishing behind official platform plugins.
- Make review and approval explicit before scheduling and publishing.
- Keep private AI content factory automation outside the open-source Core.
- Avoid scraping, stealth browser automation, CAPTCHA bypass, anti-detection, or engagement bot behavior.

## MVP Phase 0: Product Foundation

### Goal

Define the product system clearly enough to begin implementation without collapsing into a generic scheduler.

### Deliverables

- Product vision document.
- Personas.
- User flows.
- Roadmap.
- Architecture overview.
- Initial domain glossary.
- Initial data model sketch.

### Exit Criteria

- Core product boundaries are documented.
- Open-source Core and private plugin responsibilities are separated.
- Official API policy is explicit.
- MVP phases are agreed.

## MVP Phase 1: Local Planning Core

### Goal

Create a local workspace where users can manage accounts, concepts, assets, references, and post candidates without requiring any external platform connection.

### Core Features

- Local workspace initialization.
- Account records with handle, timezone, status, and notes.
- Multiple concepts per account.
- Concept profile editor.
- Asset and reference library.
- Manual post candidate creation.
- Candidate states: draft, ready for review, changes requested, approved, archived.
- Search and filters across accounts, concepts, assets, references, and candidates.
- Basic local persistence.

### Non-Goals

- Publishing.
- AI generation.
- Analytics.
- Team permissions beyond local workspace ownership.

### Exit Criteria

- User can create a workspace, add accounts, define concepts, add assets, and create reviewable candidates.
- Data is stored locally and can be backed up.
- Candidate state transitions are tested.

## MVP Phase 2: Review Workflow And Schedule Planning

### Goal

Turn content candidates into a usable editorial pipeline with approval history and calendar planning.

### Core Features

- Review queue.
- Candidate detail view with linked concept profile and assets.
- Review comments and decision history.
- Approval requirements per account or concept.
- Calendar and queue views.
- Schedule approved candidates.
- Validation framework for scheduling constraints.
- Export workspace or selected content plan.

### Non-Goals

- Live publishing.
- Automatic AI-created schedules that bypass review.
- Complex multi-tenant permissions.

### Exit Criteria

- User can move content from draft to review to approved to scheduled.
- User can see what is blocked, pending review, approved, and scheduled.
- Schedule planning works without a connected platform plugin.

## MVP Phase 3: Plugin System And Official Publishing Connector

### Goal

Add an extensibility foundation and support publishing through official platform APIs where available.

### Core Features

- Plugin manifest format.
- Plugin capability registry.
- Permission prompts for plugin data access.
- Plugin lifecycle: install, enable, configure, disable, remove.
- Connector interface for official platform authentication.
- Validation hooks for account and media constraints.
- Scheduling hooks.
- Publish action interface.
- Publish result and error model.
- Audit log for plugin actions.

### Initial Platform Plugin

- Instagram publishing connector using official Meta/Instagram APIs where the user's account type, permissions, and API access allow it.
- Capability display for supported media types, publish operations, and insights.
- Structured handling of token expiration, permission errors, unsupported media, rate limits, and API failures.

### Non-Goals

- Scraping Instagram.
- Browser-based publishing automation.
- CAPTCHA bypass.
- Anti-detection systems.
- Engagement automation such as likes, follows, comments, or direct messages.

### Exit Criteria

- Core can install a plugin and show its requested permissions.
- Official publishing plugin can validate and publish supported scheduled candidates.
- Failed publish attempts produce actionable errors.
- Publishing cannot bypass review policy by default.

## MVP Phase 4: Analytics And Operational Feedback

### Goal

Help users understand content performance by account, concept, format, and schedule slot through official APIs.

### Core Features

- Analytics plugin interface.
- Metrics ingestion through official APIs.
- Published post linkage to original candidate and concept.
- Basic performance dashboard.
- Concept-level performance summary.
- Export metrics.

### Non-Goals

- Unauthorized analytics scraping.
- Competitive intelligence scraping.
- Automated engagement manipulation.

### Exit Criteria

- User can view available official metrics for published posts.
- Metrics can be grouped by concept.
- Analytics data can inform future planning without changing review safeguards.

## MVP Phase 5: Community Plugin SDK

### Goal

Make IG Manager extensible by external developers while preserving Core safety boundaries.

### Core Features

- Plugin SDK documentation.
- Example plugins.
- Test harness for plugin contracts.
- Permission model documentation.
- Plugin capability schema versioning.
- Local plugin development workflow.
- Sandboxing or isolation strategy where practical.

### Plugin Categories

- Official platform connectors.
- Import/export tools.
- Asset processors.
- Review workflow extensions.
- Analytics connectors.
- Private AI content factory plugins.

### Exit Criteria

- Developers can build and test plugins without modifying Core.
- Users can understand plugin permissions before enabling them.
- Publishing plugins must declare official API usage.

## MVP Phase 6: Private AI Content Factory Plugin

### Goal

Support advanced AI-assisted content production as a separate private plugin that uses Core workflow contracts.

### Plugin Features

- Read selected concept profiles, references, and assets with permission.
- Generate post candidate drafts.
- Suggest captions, hashtag sets, hooks, and variants.
- Propose schedule slots.
- Attach generation provenance.
- Respect account and concept review policy.
- Write candidates into draft or ready for review states.

### Core Responsibilities

- Provide plugin interfaces for candidate creation.
- Enforce review workflow.
- Track provenance.
- Validate scheduling and publishing separately.
- Keep private generation logic outside the open-source repository.

### Non-Goals

- Bundling private AI automation into Core.
- Unreviewed auto-publishing.
- Scraping content for training or inspiration.
- Circumventing platform limits.

### Exit Criteria

- Private AI plugin can create useful candidates without modifying Core.
- Generated candidates are reviewable, traceable, and schedulable.
- Publishing still requires official platform plugin support and Core policy compliance.

## Later Opportunities

### Collaboration

- Multi-user local or self-hosted collaboration.
- Role-based review and approval.
- Client review portals.
- Comment resolution workflow.

### Advanced Planning

- Campaign planning.
- Content pillar balance.
- Cadence recommendations.
- Concept health checks.
- Duplicate idea detection.

### Asset Management

- Usage rights tracking.
- Media transformation pipeline.
- Template management.
- Version comparison.

### Integrations

- Cloud storage import/export.
- Design tool references.
- Project management exports.
- Additional official social platform connectors.

## Risk Register

### Platform API Access

Instagram publishing and insights depend on official platform permissions, account type, app review, and API availability. The product must expose capability limitations clearly.

### Scope Creep

The product can easily become a scheduler, DAM, AI generator, analytics suite, and agency collaboration platform all at once. The MVP should protect the concept-based pipeline first.

### Unsafe Automation Requests

Users may ask for scraping, stealth browser automation, CAPTCHA bypass, anti-detection, or engagement bots. These must remain out of scope.

### Plugin Security

Plugins may request broad access to local data. The Core needs explicit permissions, clear capability display, and a future isolation strategy.

### AI Provenance

AI-generated candidates should preserve enough provenance for review, quality control, and accountability.

## Suggested Build Order

1. Local data model and workspace.
2. Account and concept management.
3. Asset and reference library.
4. Post candidate model and manual creation.
5. Review workflow.
6. Schedule planning.
7. Plugin manifest and capability model.
8. Official publishing connector.
9. Analytics connector interface.
10. Community plugin SDK.
11. Private AI content factory plugin.

