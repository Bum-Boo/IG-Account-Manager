# Security Policy

IG Manager is local-first software that manages sensitive account, content, workflow, and plugin data. Security reports are welcome and should be handled carefully.

## Reporting A Vulnerability

Do not open a public issue for a suspected vulnerability.

Report privately to the maintainers using the project's preferred private security contact. If no private contact is configured yet, open a minimal public issue that says only that you need a private security contact, without including exploit details, credentials, logs, screenshots, or proof-of-concept code.

Please include in the private report:

- affected package, app, plugin, or document,
- version or commit if known,
- impact,
- reproduction steps,
- whether secrets or personal data may be exposed,
- suggested mitigation if available.

## Supported Scope

Security-sensitive areas include:

- local API authentication and authorization,
- token and secret handling,
- plugin manifest validation,
- plugin permission enforcement,
- plugin execution host boundaries,
- workflow audit logging,
- publish approval and auto-publish policy,
- scheduler job locking and retries,
- database mappers that redact secret-like fields,
- official API integrations.

## Out Of Scope

The following are not considered valid security features or acceptable contribution goals:

- scraping,
- stealth browser automation,
- UI-based posting,
- CAPTCHA bypass,
- anti-detection behavior,
- credential sharing,
- engagement bots,
- bypassing platform rate limits or policy controls.

Requests for those features should be rejected.

## Secret Handling

Do not commit:

- `.env` files,
- access tokens,
- refresh tokens,
- cookies,
- API keys,
- OAuth client secrets,
- private token vaults,
- generated media that may contain private content,
- raw plugin credential exports.

Use `.env.example` for non-secret configuration examples only.

## Plugin Security Requirements

Plugins must:

- declare permissions explicitly,
- support dry-run paths where practical,
- use host-provided services instead of direct database access,
- avoid logging secrets,
- avoid returning raw credentials in execution results,
- use official APIs for publishing and external platform access,
- route publishing through Core workflow and audit logging.

Private automation plugins must remain separate from the open-source Core and must not be required for Core startup, tests, or normal usage.

## Publish Safety

All publish actions must be auditable. Auto-publish must be explicit, opt-in, and constrained by account, concept, workflow, and plugin policy. Generated candidates should default to review before scheduling and publishing.

## Dependency And Build Security

When adding dependencies:

- prefer small, maintained libraries,
- avoid packages that execute postinstall scripts unless required and reviewed,
- document why a dependency is needed,
- keep external network behavior behind explicit interfaces that can be mocked in tests.

## Disclosure Process

Maintainers should acknowledge private reports, reproduce the issue, prepare a fix, and publish a security advisory or release note when appropriate. Public detail should avoid exposing active exploit steps until users have had reasonable time to update.
