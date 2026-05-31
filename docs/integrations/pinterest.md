# Pinterest Reference Import

IG Manager's Pinterest reference import support belongs in a private AI Content Factory plugin outside this Core repository.

It is optional and is not required for the open-source Core, API, scheduler, dashboard, or official publisher plugins.

## Purpose

The Pinterest Reference Importer imports metadata from a user's authorized Pinterest boards and converts Pins into internal reference-only assets. These references can guide concept mood, composition, and styling decisions, but they must not become final content.

The importer creates:

- `ReferenceAsset` records inside the private plugin.
- Core `ContentAsset` records with `type: "link"` and `rights.usage: "reference_only"`.
- Metadata fields for `detectedTags`, `moodTags`, and `compositionTags`.

## Safety Boundaries

- Use official Pinterest APIs only.
- Do not scrape Pinterest pages or private endpoints.
- Do not download images for reposting.
- Do not copy, trace, or republish third-party images.
- Treat Pinterest references as inspiration metadata only.
- Keep real network calls behind the `PinterestClient` interface.
- Keep the importer disabled unless explicitly configured in a private workspace.

## Client Boundary

The private plugin defines:

```ts
interface PinterestClient {
  listBoardPins(request: PinterestListBoardPinsRequest): Promise<PinterestPinPage>;
}
```

The skeleton includes `MockPinterestClient` for tests. A real implementation should call Pinterest's official API with a user-authorized token and should avoid logging or storing raw tokens in this plugin.

## Allowed Boards

The importer requires an explicit allowlist:

```ts
{
  allowedBoardIds: ["board_style", "board_makeup"],
  maxPinsPerBoard: 50,
  pageSize: 25
}
```

If a board is not listed in `allowedBoardIds`, import fails. This keeps reference ingestion intentional and auditable.

## Output Shape

Each imported Pin becomes a `ReferenceAsset` with:

- `title`
- `description`
- `boardId`
- `sourceUrl`
- `detectedTags`
- `moodTags`
- `compositionTags`
- `licenseNote`

The placeholder tag fields are intentionally conservative. They can be replaced later by a private analysis adapter, but that adapter must still treat references as metadata only.

## Optional Plugin Source Path

When a `PinterestClient` is injected, the private plugin can import references through:

```txt
pinterest://boards/board_style,board_makeup
```

This returns reference assets and no post candidates. Content generation remains a separate review-first workflow.

## Official API References

Use Pinterest's official developer documentation when implementing the real client:

- [Pinterest content API docs](https://developer.pinterest.com/docs/content/)
- [Pinterest entities](https://developer.pinterest.com/docs/key-concepts/pinterest-entities/)
- [Pinterest sandbox](https://developer.pinterest.com/docs/developer-tools/sandbox/)
