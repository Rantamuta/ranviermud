# Draft: Entity Metadata Authoring Compatibility Shim

## Status

- Status: draft for design review
- Scope: entity authoring shape for `bundle-rantamuta` while preserving compatibility with vanilla RanvierMUD
- No runtime behavior is changed by this document

## Problem Summary

`bundle-rantamuta` wants a cleaner, bundle-native entity shape than vanilla RanvierMUD currently exposes at runtime.

Today, vanilla entity constructors reliably carry forward `metadata`, but do not provide a generic first-class mechanism for arbitrary bundle-defined top-level fields on live entities.

That creates tension between:

1. designer-facing authoring ergonomics,
2. runtime compatibility with vanilla RanvierMUD, and
3. keeping `metadata` meaningful instead of turning it into a junk drawer.

## Core Tension

As far as a designer is concerned, an entity may reasonably want root-level fields such as:

- `verbs`
- `conversation`
- `foo`
- `metadata`

That is a coherent authored model. It keeps authored concepts first-class instead of forcing everything through one overloaded `metadata` bucket.

However, vanilla RanvierMUD currently makes `metadata` the portable extension bucket on live entities. If `bundle-rantamuta` must run on vanilla RanvierMUD 1.x, then some compatibility packing layer is needed.

## Design Goal

Preserve a clean authored entity shape now, while allowing the runtime to remain compatible with vanilla RanvierMUD.

The compatibility burden should live at the loader boundary, not leak into:

- designer-facing YAML,
- every command implementation,
- every script,
- or every future data discussion.

## Proposed Temporary Direction

Use a custom data source or equivalent normalization layer so that designers author bundle-native entity fields at the YAML root, while the runtime receives a vanilla-compatible transformed shape.

In other words:

1. Authored shape is canonical.
2. Runtime packed shape is an internal transport format.
3. Designers should not need to know the packed shape exists.

## Example

### Authored shape

```yml
- id: bellRope
  name: "bell rope"
  verbs:
    take: "The bell rope is securely attached."
  conversation:
    topic: "bells"
  foo:
    bar: true
  metadata:
    designerNote: "Visible to bundle logic as authored metadata."
```

### Internal compatibility-packed runtime shape

```yml
- id: bellRope
  name: "bell rope"
  metadata:
    verbs:
      take: "The bell rope is securely attached."
    conversation:
      topic: "bells"
    foo:
      bar: true
    metadata:
      designerNote: "Visible to bundle logic as authored metadata."
```

The recursive-looking `metadata.metadata` is not a designer-facing convention in this model. It is only the internal packed representation required to survive a vanilla-compatible load path.

## Why This Is Worth Considering

### 1. It keeps the authored model honest

If designers mean `verbs`, they can author `verbs`.
If they mean `conversation`, they can author `conversation`.
If they mean `metadata`, they can author `metadata`.

This avoids pretending that every non-core concern is naturally “metadata”.

### 2. It keeps the compatibility hack contained

The ugly part exists only inside the transport layer between authored YAML and the live entity object.

That is much easier to replace later than a repo-wide convention that teaches designers and runtime code to think in terms of overloaded `metadata`.

### 3. It prepares a cleaner RanvierMUD 2.0 migration

If a future core revision allows bundle-owned entity shape directly, then the compatibility adapter can be removed and the authored shape can stay the same.

That is a better migration posture than:

1. teaching designers to author everything under `metadata`, and then
2. later trying to pull those concepts back out into first-class root fields.

## The Specific Metadata Overload Risk

This discussion is not just about convenience. It is about avoiding semantic collapse.

If designers are told that `metadata` is their extension bucket, but runtime/driver code also uses that same bucket as a transport envelope, then a single word ends up carrying multiple meanings:

1. designer-authored metadata,
2. bundle-owned authored namespaces,
3. temporary compatibility-packed data,
4. mutable runtime state, and
5. possibly engine/driver implementation detail.

Once that happens, `metadata` stops being a useful concept. It becomes a catch-all storage accident.

That makes documentation harder, authoring less intuitive, and future migration work more expensive.

## What This Draft Recommends

### Recommended posture for the compatibility period

1. Treat authored entity root shape as the real schema.
2. Use a custom loader/data source to normalize authored custom root fields into runtime `metadata`.
3. Treat the packed runtime shape as internal-only.
4. Do not require designers to think in terms of packed `metadata.metadata`.

### Recommended discipline

1. Document which root fields are designer-facing and bundle-owned.
2. Keep the normalization step centralized and one-way.
3. Prefer helpers for reading bundle-owned entity data so the internal packed shape does not spread through call sites.
4. Avoid introducing new permanent runtime conventions that depend on the temporary packed shape.

## Costs and Risks

### Cost: internal ugliness is real

The packed runtime shape is awkward. This draft does not claim otherwise.

If we preserve root `metadata` for designers while also packing all custom root fields into runtime `metadata`, then runtime `metadata.metadata` is a real internal wart.

### Cost: transform rules must be explicit

The normalization layer will need clear merge/precedence rules, especially when authored root fields and authored `metadata` may both contribute to runtime `metadata`.

Questions that must be answered before implementation:

1. Which wins on key collision: transformed root field or authored `metadata`?
2. Are some root fields reserved and therefore never packed?
3. Is the transform lossless and reversible for diagnostics/debugging?

### Risk: helper-free reads would leak the packed shape everywhere

If runtime code starts directly depending on `metadata.metadata`, `metadata.verbs`, and similar packed details everywhere, then the compatibility shim stops being temporary in practice.

That would defeat the purpose.

## Alternative Rejected Here

### “Just use `metadata` for everything”

This is the simplest runtime story for vanilla RanvierMUD 1.x, and it may still be acceptable for some subsystems.

But as a bundle-wide authoring model it has a real downside:

it overloads a designer-intended concept with engine/driver transport concerns.

This draft prefers keeping that compromise internal rather than teaching it as the public authoring model.

## Open Questions

1. Which bundle-owned root fields should be considered first-class in the authored schema?
2. Should the normalization layer preserve a small reserved top-level pass-through set in addition to core entity fields?
3. Should runtime access to packed custom data go through bundle helpers from the start?
4. Should authored root `metadata` remain fully free-form, or should the bundle document expectations for it separately from other root namespaces?

## Recommended Next Step

If this direction is pursued, the next design artifact should be a small follow-up draft that defines:

1. the authored entity schema surface,
2. the normalization algorithm,
3. collision/precedence rules, and
4. the helper access pattern expected on the runtime side.
