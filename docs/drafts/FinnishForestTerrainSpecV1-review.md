# Vetting Review: Procedural Finnish Forest Terrain Generation Spec (v1)

## Verdict

**Overall: reasonable foundation, but not yet implementation-safe as written.**

The draft is strong on deterministic intent and domain framing, but it currently has several **normative contradictions, copy/paste defects, and undefined fields** that will produce divergent implementations if multiple engineers build against it.

For your stated goal (a **separate CLI** that outputs coherent per-tile JSON for downstream prose generation), this spec is close, but it needs one cleanup pass focused on:

1. removing internal inconsistencies,
2. defining the CLI contract explicitly,
3. tightening determinism rules across runtimes/languages.

---

## What is solid already

- Clear deterministic posture and seed-driven generation model.
- Good map layering concept (base maps -> derived maps -> payload export).
- Practical v1 scoping (no full ecology/weather/NPC simulation).
- Useful first-pass thresholds and tables for moisture, biome, and movement.
- Explicit requirement for machine-readable per-tile output.

---

## Blocking issues (must fix before treating as normative)

## P0-1: Broken/undefined fields in normative sections

- Section 3.6 includes an unnamed field:
  - ``: `[0,1]`
- Section 10.1 / 10.8 uses `OrientationReliability` but the increment variable name is missing:
  - `Increase orientation reliability by +`...
  - parameter shown as ` = 0.08`
- Section 13.1 requires exporting `orientation reliability`, but there is no complete normative definition for base computation (only additive trail adjustment).

**Impact:** implementers cannot produce compatible output schema.

## P0-2: Duplicated and conflicting Section 12.2 text

`12.2 Passability by Direction` appears repeated multiple times, with near-duplicate logic plus malformed syntax (`steepDifficultDelta = 0.12```), and conflicting boundary checks.

**Impact:** impossible to know the canonical rule set.

## P0-3: Aspect direction likely inverted

Section 5.1 computes:

- `Hx = H[x+1]-H[x-1]`
- `Hy = H[x,y+1]-H[x,y-1]`
- `AspectRad = atan2(Hy, Hx)`

This points toward **uphill gradient**, but prose says aspect is **downhill**.

**Fix:** use downhill vector (`atan2(-Hy, -Hx)`) or explicitly redefine `Hx/Hy` as downhill differences.

## P0-4: Lake passability rule is origin-only and misses entering-lake transitions

Rule says: `If WaterClass == lake: blocked for all dirs...` (current tile context). It does not explicitly block movement **into** a lake from adjacent non-lake tiles.

**Fix:** evaluate both origin and destination tile classes in edge rules.

---

## Important correctness and interoperability issues

## P1-1: Section numbering collisions and structure defects

- `1.2 Tile Coordinates` immediately followed by `1.1 Tile Coordinates`.
- Repeated subsection headings make references ambiguous.

**Fix:** renumber cleanly; references in later sections should target stable IDs.

## P1-2: Determinism across languages is underspecified

You require identical outputs across runs, but cross-language reproducibility still depends on:

- exact PRNG algorithm,
- sub-seed derivation function,
- float precision/rounding policy,
- noise implementation variant.

**Fix:** make these normative:

- PRNG (e.g., PCG32/Xoshiro variant),
- sub-seed hash (`seed + mapName + octave` via specific 64-bit hash),
- float type and rounding stage (or fixed-point in key stages),
- reference Simplex implementation/version.

## P1-3: Appendix A omits many parameters used normatively

Trail parameters and several movement/nav constants are normative in body sections but absent from the default parameter JSON.

**Impact:** no single complete config source.

**Fix:** include all normative knobs in Appendix A (or declare non-configurable constants explicitly).

## P1-4: Move cost sequencing is underspecified

Section 12 computes `MoveCost`; Section 10 modifies it for trails. Order matters.

**Fix:** define exact evaluation order: e.g.,

1. base movement computation,
2. water/biome multipliers,
3. trail multiplier,
4. final clamp/round.

## P1-5: Tie-breaker and neighborhood metric choices may create directional artifacts

- D8 tie-break priority intentionally biases southward.
- Distances use Manhattan while movement/pathing is 8-way.

These are valid choices, but should be called out as **intentional artifact tradeoffs** and possibly parameterized.

---

## Separate-CLI readiness gaps (for your actual delivery target)

To support a standalone CLI independent from MUD engine internals, add a dedicated interface section:

## CLI contract (recommended additions)

- **Inputs**
  - `--seed`, `--width`, `--height`, `--params <json>`, optional raster/base-map files.
  - Explicit precedence: CLI flags > params file > defaults.
- **Modes**
  - `generate` (noise-driven),
  - `derive` (authored base maps),
  - `debug` (emit rasters).
- **Outputs**
  - Required: JSON array file (or NDJSON) of per-tile records.
  - Optional: aggregate metadata and debug maps.
- **Exit codes**
  - `0` success,
  - `2` input validation failure,
  - `3` dimension mismatch,
  - etc.
- **Schema versioning**
  - Add `specVersion` and `generatorVersion` in output header.

## Output packaging

Current spec defines per-tile object shape but not the envelope. For tooling stability, define:

```json
{
  "specVersion": "forest-terrain-v1",
  "seed": "...",
  "width": 64,
  "height": 64,
  "tiles": [ ... ]
}
```

This avoids ambiguity about whether output is a raw array vs object.

---

## Suggested minimal patch set to make v1 publishable

1. Remove duplicate/garbled `12.2` blocks; keep one canonical passability algorithm.
2. Define `OrientationReliability` fully (base formula + trail adjustment + clamp range).
3. Fix aspect to downhill direction.
4. Add entering-lake movement block rule.
5. Normalize numbering and cross-references.
6. Expand Appendix A so every normative parameter is represented.
7. Add a dedicated CLI I/O contract section and versioned output envelope.
8. Add one reference test vector (seed + dimensions + checksum of key maps).

---

## Reasonableness assessment for your intended use

If the above fixes are applied, this is a **reasonable v1 spec** for generating coherent Finnish-forest terrain descriptors suitable for LLM prose projection.

Specifically, the combination of:

- hydrology-informed moisture,
- compact biome palette,
- movement + followability annotations,
- deterministic per-tile payload

is exactly the right level of structure for “dry stats -> warm descriptions” pipelines without overcommitting to full simulation.

---

## Re-vet of revised draft (falsification pass)

### Updated verdict

The revision fixed several earlier blockers (downhill aspect sign, lake-entry check, inclusion of orientation reliability field, and expanded parameter appendix), but it is still **not publication-safe** as a normative v1 because it contains fresh structural and schema defects.

### Remaining falsifiers (current blockers)

1. **Section numbering is still broken and self-contradictory**
   - `# 13. Movement and Navigation` appears twice, but child headings are labeled `12.1`, `12.2`, `12.3`.
   - This makes normative references ambiguous for implementers and tests.

2. **Game-trail orientation text still has unresolved placeholder**
   - Section 10.1 still contains: `Increase orientation reliability by +`.
   - This conflicts with the new Section 12 computation and should be removed or rewritten to reference Section 12 only.

3. **Duplicate line in Section 10.1 changes semantics by accident**
   - `Reduce movement cost: MoveCost *= gameTrailMoveCostMultiplier` appears twice.
   - If interpreted literally, trails get double-multiplied (`0.85 * 0.85`), materially changing movement balance.

4. **Output example block is malformed and duplicated**
   - The fenced JSON in Section 14.2 includes an envelope example, then a second standalone tile object appended with broken fence syntax (` ````json ... ```json ... ```` `).
   - This is likely to break docs tooling and confuse downstream schema consumers.

5. **Appendix A contains duplicate JSON keys**
   - `roughness` appears twice in the same object (`noise params` and `obstruction/feature thresholds`).
   - In JSON, duplicate keys are invalid/ambiguous in practice (later key overwrite behavior differs by parser expectations).

6. **Determinism language changed scope but omitted reproducibility contract details needed for tooling parity**
   - “within a given implementation” is acceptable for v1, but you still need to normatively pin at least:
     - seed serialization format (signed/unsigned handling),
     - coordinate numeric type and rounding policy,
     - tile iteration order for all map-wide passes,
     - stable sort policy where ties occur.

### Hardening recommendations before calling this normative v1

1. **Fix numbering once and lock reference IDs**
   - Renumber all sections and avoid repeated titles.
   - Add explicit labels in headings (e.g., `13.2-passability`) if this will be consumed by tooling.

2. **Single-source movement math**
   - Keep trail multiplier only in one place (prefer Section 13 evaluation order), and in Section 10 just state “trail effect is applied in Section 13.1”.

3. **Define one canonical output schema**
   - Keep only envelope form:
     - `meta`
     - `tiles[]`
   - Remove standalone tile-only example to prevent producer drift.

4. **Repair Appendix A shape**
   - Split duplicate `roughness` into `roughnessNoise` and `roughnessFeatures` (or similar).
   - Validate appendix JSON with a parser in CI/docs checks.

5. **Pin algorithm-order determinism**
   - For every whole-map derivation, define iteration order (`y-major then x-major` or vice versa).
   - For BFS/Dijkstra, define neighbor expansion order to eliminate runtime-dependent queue ordering differences.

6. **Add executable conformance vectors**
   - At least one required fixture: `(seed, width, height, params)` with checksums for `FD`, `FA`, `WaterClass`, and one full tile payload snapshot.

### Practical conclusion

You are very close. After the six blockers above are fixed (especially numbering, duplicate multipliers, malformed JSON examples, and duplicate appendix keys), this becomes a credible maintenance-grade v1 spec for a standalone terrain CLI pipeline.

---

## Comparison against `FinnishForestTerrainSpecV1-latest.md` (current status)

This section tracks whether the previously identified blockers are now addressed in the latest working draft.

- **Section numbering consistency**: **Addressed** (latest now uses consistent major/minor numbering through Sections 1–16).
- **Unresolved orientation placeholder**: **Addressed** (placeholder removed; orientation reliability now has a complete formula in Section 12).
- **Duplicate trail move-cost application**: **Addressed** (latest explicitly states trail multiplier is applied once in Section 13.1).
- **Malformed/duplicated payload example block**: **Addressed** (single valid JSON envelope example in Section 14).
- **Duplicate Appendix A keys**: **Addressed** (split into `roughnessNoise` and `roughnessFeatures`).
- **Determinism order gaps**: **Addressed for v1 baseline** (tile iteration order, neighbor expansion order, tie-break sort order, and seed parsing mode are now explicit).

### Collaborative hardening status update

The three previously tracked hardening items are now integrated into `-latest`:

1. **Canonical conformance vector**: added as Section `16.1` with required fixture fields and checksum normalization guidance.
2. **Explicit CLI contract**: added as Section `2.1` with named inputs, precedence, suggested modes, and recommended exit codes.
3. **Numeric precision policy**: added as Section `14.1` with fixed export precision and rounding requirements.

### Next optional tightening (post-v1 draft)

- Add a larger-map fixture set (e.g., 32x32 and 64x64) in addition to the minimal fixture to better detect algorithmic drift.
- Add CI/docs automation that recomputes and verifies fixture hashes on every spec-touching PR.
