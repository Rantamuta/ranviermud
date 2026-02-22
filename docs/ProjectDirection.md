# Project Direction (Non-Normative)

This document captures project direction and intent. It is descriptive and does not define behavior contracts.

For binding behavior, use documents in `docs/normative/`.

## Mission

Build a MUD development system on Ranvier that is fast to work in, reliable to run, and fun to design for and play.

## Current Direction

- Keep `ranviermud` stable as the runnable wrapper and integration surface for Rantamuta 1.0.
- Develop `bundles/bundle-rantamuta` as the reference bundle for the Rantamuta approach.
- Prioritize determinism, safe mutation boundaries, principled typing, and practical ergonomics.
- Favor incremental, validated improvements over broad rewrites.

## The Rantamuta Approach (Working Summary)

- Deterministic command behavior: identical input and state should produce identical outcomes.
- Careful mutation: plan and validate first, commit world changes through controlled mutation paths.
- Principled typing: treat types as contracts and avoid type bypasses that hide drift.
- Ergonomics: serve three audiences together:
  - developers maintaining runtime infrastructure,
  - designers authoring world content,
  - players interacting with the game.

## Compatibility Posture

- Near term: preserve practical compatibility with Rantamuta 1.0, and vanilla Ranvier where feasible.
- Public compatibility contracts remain defined by `AGENTS.md` and `docs/normative/`.

## Longer-Term Direction (Aspirational)

- If bundle mechanisms prove stable and valuable, upstream selected patterns into core for a future major release.
- A future 2.0 line may prioritize architecture over backward compatibility.
- Major direction changes should be recorded with ADRs before implementation.
