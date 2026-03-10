# Inline Tags Phase 2 Bookmark: Attribute/Skill Comparators

## Status

Draft bookmark only. Not approved for implementation.

## Intent

Capture a reminder that Phase 2 should evaluate adding comparator conditions to inline tags after Phase 1 is stable.

Phase 1 reference:

- `docs/drafts/InlineRoomTagsDesign.md`

## Candidate scope for Phase 2

- Add comparator condition forms such as:
  - `[attr>10:then|else]`
  - `[skill>=5:then|else]`
- Keep render-time, read-only evaluation boundary.
- Keep deterministic behavior and no expression engine.

## Explicitly deferred

- No implementation in this phase bookmark.
- No checklist yet.
- No normative contract update yet.

## Open questions to resolve later

1. Exact comparator grammar and whitespace rules.
2. Resolver contract for attribute/skill values and coercion policy.
3. Validation behavior for unknown comparator keys.
4. Backward compatibility and migration guidance.
