---
name: Plugin proposal
about: Propose an official or community IG Manager plugin
title: "[Plugin]: "
labels: plugin
assignees: ""
---

## Plugin Summary

Name, type, and purpose.

## Plugin Type

- [ ] `source_importer`
- [ ] `media_generator`
- [ ] `copy_generator`
- [ ] `validator`
- [ ] `scheduler_policy`
- [ ] `publisher`
- [ ] `analytics`
- [ ] `ui_extension`

## Distribution

- [ ] Official
- [ ] Community
- [ ] Private/internal

## Permissions Requested

List every permission the plugin needs and why.

## External Services

Does this plugin call external services? If yes, list the official APIs used.

## Dry-Run Behavior

How will validation or preview mode work without side effects?

## Data Handling

What local data will the plugin read or write? Where are secrets stored?

## Safety Checklist

- [ ] The manifest declares permissions explicitly.
- [ ] Publisher behavior uses official APIs only.
- [ ] No scraping, stealth automation, CAPTCHA bypass, anti-detection behavior, or UI-based posting.
- [ ] No raw tokens or credentials in git.
- [ ] Publish actions route through Core workflow and audit logging.
- [ ] Generated candidates default to review before scheduling and publishing.
