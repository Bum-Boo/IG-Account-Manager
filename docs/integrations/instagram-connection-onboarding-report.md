# Instagram Connection Onboarding Report

## Summary

This report records the local Instagram account connection work for IG Manager and the product changes needed to turn the current manual Meta setup into a guided in-app onboarding flow.

No Meta app secrets, OAuth codes, access tokens, passwords, or raw callback URLs are included here.

## Current State

- Local API is running and can complete Meta OAuth callbacks.
- `account_threatening_red_panda` is connected to Instagram account `gurrimming_ref`.
- `account_instagram_2` was created as a second local Instagram slot.
- A later OAuth attempt connected `account_instagram_2` to the same Instagram account, `gurrimming_ref`, instead of the intended second account.
- The browser showed an `internal_error` after that callback because the local `accounts` table has a unique platform-handle constraint and could not update the second account to the duplicate Instagram handle.
- The connection record for `account_instagram_2` still became `connected`, so the system currently has a partial/inconsistent state.

## Meta State Observed

- Meta Business portfolio: `bumboo0917`.
- Existing Facebook Page visible to OAuth: `Bumboo to the world`.
- `Bumboo to the world` is the only Page returned in the OAuth Page selection screen.
- Instagram assets visible in Meta Business settings:
  - `@gurrimming_ref`
  - `@boo_to_world`
- `@boo_to_world` exists as an Instagram asset in Business settings, but its `Connected assets` tab showed `No connected assets`.
- The OAuth route resolves eligible Instagram accounts through Facebook Pages, not directly from the Business Instagram asset list.
- Creating a new Facebook Page for `@boo_to_world` failed with Meta's rate limit: too many recent Page creation attempts.

## Root Cause

Meta's Instagram Graph connection flow discovers eligible Instagram accounts through:

`/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}`

That means IG Manager only receives Instagram accounts that are connected to Facebook Pages accessible to the Meta login. A Business portfolio can contain Instagram assets that still do not appear in OAuth if no eligible Facebook Page is connected.

The current local app also allows a second local Account to start OAuth and select the same Instagram business account. That should be blocked before any connection record or token vault entry is mutated.

## Product Goal

The deployable app should make this a guided setup flow:

1. Create or select a local account slot.
2. Check local configuration and Meta app readiness.
3. Start Meta OAuth.
4. Show exactly which Facebook Pages and Instagram business accounts were returned.
5. Let the user select one eligible Instagram account.
6. Prevent duplicate account connections.
7. Store the token safely.
8. Show clear next steps when Meta setup is incomplete.

## Proposed In-App Flow

### Button 1: Check Setup

Run a preflight check:

- API reachable.
- Web app reachable.
- `INSTAGRAM_APP_ID` configured.
- `INSTAGRAM_APP_SECRET` configured without displaying it.
- `INSTAGRAM_REDIRECT_URI` matches the local callback.
- Token vault key exists.
- Required scopes include `pages_show_list`, `instagram_basic`, `pages_read_engagement`, `business_management`, and `instagram_content_publish`.

Display status as pass/warn/fail with a repair action for each item.

### Button 2: Add Instagram Account

Create a local Account slot with a temporary handle and status `draft`.

The app should make the one-local-account-per-Instagram-account rule explicit:

- Each Instagram professional account gets one local Account.
- Multiple Instagram accounts require multiple local Accounts.
- One Facebook Page usually links to one Instagram professional account.

### Button 3: Connect with Meta

Start OAuth and open the authorization URL.

After callback, the app should not silently auto-connect if more than one eligible account is returned. It should show:

- Instagram username.
- Instagram business account ID.
- Connected Facebook Page name.
- Facebook Page ID.
- Whether this Instagram account is already connected to another local account.

### Button 4: Select Account

Save the selected Instagram account only after duplicate checks pass.

If the selected Instagram account is already linked to another local Account, show:

- Existing local account.
- Existing Instagram handle.
- Options:
  - Cancel.
  - Disconnect existing and move connection.
  - Create a separate setup task for another Page/Instagram account.

### Button 5: Diagnose Missing Account

When the expected Instagram handle is not listed, show a guided diagnosis:

- "This Instagram account exists in Business Manager but is not connected to a Facebook Page."
- "This Facebook Page is not accessible to the Meta user."
- "The Business access request is pending."
- "Meta Page creation is temporarily rate-limited."
- "Instagram account is not a professional/business account."

Provide deep links to:

- Meta Business Settings > Pages.
- Meta Business Settings > Instagram accounts.
- Meta Business Settings > Requests.
- Instagram app account settings for professional/Page linking.

## Implementation Recommendations

### Add Duplicate Protection

Before mutating token vault or connection records:

- Check whether `instagramBusinessAccountId` is already connected to another local Account.
- Check whether the target username would violate `accounts_platform_handle_idx`.
- Return a typed error such as `instagram_account_already_connected`.

### Make Connection Updates Atomic

The connection service currently can upsert the connection record before the account update fails. Wrap these mutations in a repository transaction or update the account first with duplicate validation.

The operation should be all-or-nothing across:

- Secret vault write.
- Account connection upsert.
- Account update.

### Add a Connection Diagnostic Endpoint

Add an API route that runs the same Graph account discovery used by OAuth and returns a sanitized view:

- Page ID.
- Page name.
- Instagram business account ID.
- Instagram username.
- Eligibility reason.
- Duplicate local connection status.

This would let the UI show why `@boo_to_world` is missing without repeated OAuth attempts.

### Improve UI Copy

Replace generic errors such as `Unexpected local API error` with specific messages:

- "This Instagram account is already connected to another local account."
- "No Facebook Page connected to this Instagram account was returned by Meta."
- "Meta blocked Page creation temporarily. Try again later or add an existing Page."

### Add Safe Cleanup Actions

For partially connected accounts, provide buttons:

- `Disconnect this local slot`.
- `Clear failed OAuth attempt`.
- `Retry OAuth`.

These should call existing disconnect routes or a new repair endpoint.

## Deployment Package Concept

The packaged local app should include a first-run setup wizard:

1. `Start Local Services`
   - Starts API, web, and worker.
   - Shows health status.

2. `Configure Instagram`
   - Stores app ID and secret locally.
   - Generates token vault key if missing.
   - Validates redirect URI.

3. `Open Meta Checklist`
   - Shows the exact Meta app settings needed.
   - Opens the relevant Meta pages.
   - Tracks checklist completion locally.

4. `Connect Account`
   - Starts OAuth.
   - Shows returned eligible Instagram accounts.
   - Saves the selected account.

5. `Connect Another Account`
   - Creates a new local account slot.
   - Repeats OAuth.
   - Blocks duplicate Instagram account selection.

6. `Troubleshoot`
   - Displays Graph discovery results.
   - Explains missing Page/Instagram links.
   - Opens Meta Business settings deep links.

## Current Known Limitations

- Meta can rate-limit Page creation. The local app can detect and explain this but cannot bypass it.
- The local app cannot safely automate Meta account creation, permission approvals, or final external submissions without explicit confirmation.
- A Facebook Page must be connected to the intended Instagram professional account before Graph OAuth returns it.
- The current code needs a transactional guard to avoid partial connection state when account update fails.

## Immediate Cleanup TODO

- Disconnect or repair `account_instagram_2`, because it is currently connected to the same Instagram business account as `account_threatening_red_panda`.
- Wait for Meta's Page creation limit to clear or add an existing Facebook Page for `@boo_to_world`.
- Re-run OAuth for `account_instagram_2` only after `@boo_to_world` appears as a Page-linked Instagram account.
