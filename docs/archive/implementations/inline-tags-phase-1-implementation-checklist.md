# Inline Tags Phase 1 Implementation Checklist

- [x] [inline-tags] Add `parseInlineTags(template)` in `bundles/bundle-rantamuta/lib/inline-tags/parse-inline-tags.js` to parse predicate-only tags (`[predicate:then]`, `[predicate:then|else]`) with nested tags and delimiter escaping into AST nodes (`TextNode`, `TagNode`) and parse diagnostics.
- [x] [inline-tags] Add `renderInlineTags(ast, runtime, renderContext)` in `bundles/bundle-rantamuta/lib/inline-tags/render-inline-tags.js` to walk AST deterministically, call `runtime.evaluate(predicateName, renderContext)` for each tag condition, render `then`/`else` branches without mutating input state, and preserve branch whitespace exactly prior to downstream line/format processing (depends on item 1).
- [x] [inline-tags] Add `createInlineTagCache({ maxEntries })` in `bundles/bundle-rantamuta/lib/inline-tags/inline-tag-cache.js` implementing LRU storage keyed by `<surfaceRef>:sha1(sourceText)` with default capacity `10000`, where `surfaceRef` uses `<entityRef>|<surface>` format (depends on item 1).
- [x] [inline-tags] Add `resolveInlineTags(sourceText, options)` in `bundles/bundle-rantamuta/lib/inline-tags/resolve-inline-tags.js` that compiles via parser + cache, renders via evaluator, defaults to module-singleton runtime/cache ownership while allowing optional injected runtime/cache, and applies fail-open behavior (return original source text) with warning diagnostics (`surfaceRef` + diagnostic code) routed to world/GameState logger when available (depends on items 1, 2, and 3).
- [x] [render-room] Update `roomDescriptionLines` in `bundles/bundle-rantamuta/lib/helpers/room-view-helper.js` to resolve inline tags for base room description and the single `metadata.descriptionVariants[].text` value selected by existing first-eligible variant gating during render-time assembly only (depends on item 4).
- [x] [render-room] Update `roomDescriptionFragmentLines` in `bundles/bundle-rantamuta/lib/helpers/room-view-helper.js` to resolve inline tags for each matching `metadata.descriptionFragments[].text` fragment during render-time assembly only (depends on item 4).
- [x] [render-room] Update `roomItemLines` and `roomNpcLines` in `bundles/bundle-rantamuta/lib/helpers/room-view-helper.js` to resolve inline tags for authored `roomDesc` text on item and NPC room-view lines (depends on item 4).
- [x] [render-look] Update `buildDirectLookLines` and the call site in `bundles/bundle-rantamuta/commands/look.js` to resolve inline tags for direct-target `description` using render context (`actor`, `room`, `area`, `world`, `entity`) without adding new entity-resolution scope sources (depends on item 4).
- [x] [docs] Update `CHANGELOG.md` with an unreleased entry describing inline predicate tag rendering support for room/item/NPC room-view text and direct-look descriptions, including fail-open parse behavior (depends on items 5, 6, 7, and 8).

## Behavior Slices

- `S1`
  - Goal: add the inline-tag parse/render/cache runtime foundation.
  - Items: checklist items 1, 2, 3, and 4.
  - Type: behavior
- `S2`
  - Goal: integrate inline-tag resolution into room view description surfaces.
  - Items: checklist items 5, 6, and 7.
  - Type: behavior
- `S3`
  - Goal: integrate inline-tag resolution into direct look target rendering.
  - Items: checklist item 8.
  - Type: behavior
- `S4`
  - Goal: document user-visible inline-tag behavior change.
  - Items: checklist item 9.
  - Type: mechanical
