# Procedural Forest Terrain Generation Spec (v1)

This specification defines a deterministic terrain-generation system for a forest region. When implemented, it produces a complete machine-readable terrain dataset for a rectangular tile grid: it either generates or consumes base maps for elevation, roughness, and vegetation variance, then derives hydrology (flow direction and accumulation, lakes, streams, moisture), landform classification, biome and vegetation attributes, ground conditions, obstacles, game trails, visibility, movement costs, directional passability, and followable cues. The output is a versioned JSON envelope whose `tiles` array contains one record per tile with all derived fields, suitable for downstream use by a MUD content pipeline, tooling, or prose generation systems that turn these physical descriptors into room descriptions and navigation semantics.

## Status

- Status: draft-v1
- Scope: forest region terrain generation, hydrology derivation, biome classification, movement/navigation derivation, and per-tile payload export
- Binding: normative for implementers
- Audience: engine maintainers and content pipeline developers

## Non-goal Clarification: Cross-Implementation Output Parity (Normative)

Cross-implementation byte-identical output parity (e.g., Node and Rust producing identical JSON bytes from identical input) is explicitly **out of scope for v1**.

For v1, conformance is evaluated per implementation profile. This spec requires deterministic behavior within one implementation/runtime build, not equality across different language/runtime implementations.

## Determinism (Revised, Minimal v1)

Given identical inputs (`seed`, `width`, `height`, `params`, and optional authored maps), the generator MUST produce identical outputs across runs within the same implementation.

The spec requires:

- Deterministic tie-breaking wherever multiple valid choices exist.
- No runtime randomness outside functions derived solely from the provided `seed`.

Cross-language or cross-runtime byte-identical output parity is explicitly out of scope for v1.

---

# 1. Coordinate System

## 1.1 Tile Resolution Rule (Normative)

- One base map cell corresponds exactly to one gameplay tile.
- All required base maps (`H`, `R`, `V` if provided) MUST have identical dimensions.
- If any provided base map dimensions differ, terminate with a hard error.
- No interpolation/resampling/scaling is performed during derivation.

## 1.2 Playable Mask and World Boundary (Normative)

Parameter:

- `playableInset` (integer >= 0, default `1`)

Rules:

- Tiles with `x < playableInset`, `y < playableInset`, `x >= width - playableInset`, or `y >= height - playableInset` are `NonPlayable`.
- Terrain derivations run on full grid (including non-playable tiles).
- Movement into `NonPlayable` tiles is `blocked`.

## 1.3 Tile Coordinates

- Coordinates are integer `(x, y)`.
- `x` grows East, `y` grows South.
- Origin `(0,0)` is North-West.

## 1.4 Neighborhoods

- 8-way (Moore): N, NE, E, SE, S, SW, W, NW.
- 4-way (Von Neumann): N, E, S, W.

Unless specified otherwise, derivations assume 8-way neighbors.

## 1.5 Direction Encoding (`Dir8`)

- `0:E, 1:SE, 2:S, 3:SW, 4:W, 5:NW, 6:N, 7:NE, 255:NONE`

## 1.6 Angles

- Degrees in `[0, 360)`.
- 0° East, 90° South, 180° West, 270° North.
- Aspect is downhill direction.

## 1.7 Graph Traversal Determinism (Normative)

All whole-map traversal algorithms in this specification (including flow accumulation, water-distance BFS, stream-distance BFS, and trail Dijkstra routing) MUST follow the deterministic ordering rules defined below.

These rules ensure reproducible behavior within a given implementation.

### 1.7.1 Canonical Tile Iteration Order

Unless otherwise specified, full-grid passes MUST iterate tiles in row-major order:

```text
for y in 0 .. height-1:
    for x in 0 .. width-1:
        ...
```

This applies to:

- initial water-tile discovery
- seed candidate enumeration
- map-wide initialization passes

### 1.7.2 Canonical Neighbor Order (Dir8)

The canonical 8-way neighbor expansion order MUST follow `Dir8` numeric order:

- `E (0)`
- `SE (1)`
- `S (2)`
- `SW (3)`
- `W (4)`
- `NW (5)`
- `N (6)`
- `NE (7)`

This order MUST be used for:

- BFS neighbor expansion
- Dijkstra neighbor expansion
- any deterministic tie-break that depends on directional order

### 1.7.3 Multi-Source BFS Ordering (Normative)

For any multi-source BFS (e.g., `distWater`, `distStream`):

1. Initialize the queue by scanning the grid in row-major order (`y`, then `x`) and enqueue all source tiles in that order.
2. Use a FIFO queue.
3. When expanding a tile, enqueue neighbors in canonical `Dir8` order.
4. A tile’s distance MUST be assigned on first visit only.

This ensures stable Chebyshev distance boundaries.

### 1.7.4 Dijkstra Queue Ordering (Normative)

For Dijkstra routing (trail generation), the priority queue ordering MUST use the following tuple comparison:

- `(cumulativeCost, y, x, dir)`

Where:

- `cumulativeCost` is compared using `hydrology.tieEps`.
- If `abs(costA - costB) <= hydrology.tieEps`, treat costs as equal.
- Then compare `y` ascending.
- Then compare `x` ascending.
- Then compare `dir` using `Dir8` numeric order.

Priority queue implementations MUST preserve this total ordering.

### 1.7.5 Neighbor Boundary Rule (Normative)

- Neighbor enumeration excludes out-of-bounds tiles.
- No wrapping is performed.
- Only slope finite-difference sampling (Section 5.1) uses clamped boundary values.

### 1.7.6 Consistency Requirement

All traversal-based derivations MUST use the canonical ordering rules above.

Implementations MUST NOT rely on:

- language-native object key ordering
- hash map iteration order
- platform-dependent floating-point comparison without `hydrology.tieEps`

This section applies to:

- Flow accumulation (Section 6.2)
- Water proximity BFS (Section 6.6)
- Stream proximity BFS (Section 10.2)
- Trail routing (Section 10.5)

No additional ordering rules elsewhere in the spec should contradict this section.

---

# 2. Inputs

## 2.1 Generator Contract (Normative)

This specification is designed to support standalone terrain-generation tooling (including CLI front-ends).

Implementations MUST expose the following named inputs regardless of UI/flag syntax:

- `seed` (`uint64`)
- `width`, `height` (positive integers)
- `params` (object; see Appendix A)
- optional authored `H`, `R`, and `V` base maps

If multiple configuration sources are supported (e.g., defaults, parameter file, command-line flags), precedence MUST be:

1. explicit CLI/entrypoint arguments
2. parameter file values
3. built-in defaults

Implementations SHOULD support three operational modes:

- `generate`: generate base maps from noise
- `derive`: consume authored base maps and run derivations
- `debug`: run generation/derivation and emit debug rasters

Recommended exit codes for CLI tooling:

- `0`: success
- `2`: invalid input (schema/type/range)
- `3`: dimension mismatch or incompatible input map shapes
- `4`: file I/O error
- `5`: internal generation/derivation failure

## 2.2 Required Inputs

Required inputs:

- `seed` (`uint64`)
- `width`, `height` (positive integers)
- `params` (object; see Appendix A)

## 2.3 Base Maps

Base maps (`width × height`, float `[0,1]`):

- `H[x,y]` elevation
- `R[x,y]` roughness
- `V[x,y]` vegetation variance

## 2.4 Authored Map Precedence

Authored map precedence:

- If authored map is supplied for `H/R/V`, it overrides noise generation for that map.

---

# 3. Derived Maps Overview

- Topography: `SlopeMag`, `AspectDeg`, `Landform`
- Hydrology: `FD`, `FA`, `FA_N`, `LakeMask`, `Moisture`, `WaterClass`
- Vegetation: `Biome`, `TreeDensity`, `CanopyCover`, `VisibilityBaseMeters`
- Ground: `SoilType`, `Firmness`, `SurfaceFlags`
- Roughness/features: `Obstruction`, `FeatureFlags`
- Navigation: `MoveCost`, `Passability[x,y,dir]`, `FollowableFlags`, `OrientationReliability`

`OrientationReliability` is informational only in v1 and MUST NOT affect simulation decisions.

---

# 4. Base Map Generation

## 4.1 Noise Function

- Noise function: `noise(seed, x, y) -> [-1,1]`, deterministic.

## 4.2 Sub-seed Derivation (Normative)

All derived seeds used for base-map noise MUST be deterministic functions of:

- the global `seed` (`uint64`),
- the map name (`"H"`, `"R"`, or `"V"`),
- the octave index (0-based integer).

Define:

- `subSeed(seed, mapId, octaveIndex) -> uint64`

Map identifiers (normative):

- `"H"` for elevation
- `"R"` for roughness
- `"V"` for vegetation variance

`subSeed` definition (normative):

Let `mapConst(mapId)` be:

- `"H" -> 0x4848484848484848`
- `"R" -> 0x5252525252525252`
- `"V" -> 0x5656565656565656`

Compute:

- `z = seed`
- `z ^= mapConst(mapId)`
- `z ^= uint64(octaveIndex) * 0x9E3779B97F4A7C15`
- `z = mix64(z)`
- return `z`

Define `mix64(z)` (normative):

- `z ^= z >> 30; z *= 0xBF58476D1CE4E5B9`
- `z ^= z >> 27; z *= 0x94D049BB133111EB`
- `z ^= z >> 31`
- return `z`

All operations are 64-bit unsigned integer operations with wraparound.

## 4.3 Multi-octave Base Map Generation

For each base map (`H`, `R`, `V`), set `mapId` and bind noise parameters from `params` as follows:

- If `mapId == "H"`:
  - `octaves = params.heightNoise.octaves`
  - `baseFrequency = params.heightNoise.baseFrequency`
  - `lacunarity = params.heightNoise.lacunarity`
  - `persistence = params.heightNoise.persistence`

- If `mapId == "R"`:
  - `octaves = params.roughnessNoise.octaves`
  - `baseFrequency = params.roughnessNoise.baseFrequency`
  - `lacunarity = params.roughnessNoise.lacunarity`
  - `persistence = params.roughnessNoise.persistence`

- If `mapId == "V"`:
  - `octaves = params.vegVarianceNoise.octaves`
  - `baseFrequency = params.vegVarianceNoise.baseFrequency`
  - `lacunarity = params.vegVarianceNoise.lacunarity`
  - `persistence = params.vegVarianceNoise.persistence`

The multi-octave loop MUST use these bound values.

- Start `freq = baseFrequency`, `amp = 1.0`.
- Loop octaves:
  - `seed_octave = subSeed(seed, mapId, octaveIndex)`
  - `sum += amp * noise(seed_octave, x*freq, y*freq)`
  - `norm += amp`
  - `freq *= lacunarity`
  - `amp *= persistence`
- `value = sum / norm`, normalize to `[0,1]` by `(value + 1)/2`.

---

# 5. Topography Derivation

## 5.1 Slope and Aspect

- `Hx = H[x+1,y] - H[x-1,y]` (clamped at bounds)
- `Hy = H[x,y+1] - H[x,y-1]` (clamped at bounds)
- `SlopeMag = sqrt(Hx*Hx + Hy*Hy) / 2`
- `AspectDeg = degrees(atan2(-Hy, -Hx))` normalized to `[0,360)`

## 5.2 Landform Classification (Normative, Explicit Decision Table)

`Landform[x,y]` MUST be classified deterministically using the following procedure.

### Step 1 — Neighbor Counts

Let:

- `center = H[x,y]`
- `N8` = the 8 Moore neighbors of `(x,y)`
- `eps = landform.eps` (Appendix A)

Compute:

- `higherCount = count(n in N8 where H[n] > center + eps)`
- `lowerCount = count(n in N8 where H[n] < center - eps)`

Neighbors whose elevation lies within `[center - eps, center + eps]` are ignored for both counts.

All comparisons MUST use the same `eps` value.

### Step 2 — Branch Order (Normative)

Branch order is fixed. The first matching clause MUST be taken.

```text
if SlopeMag[x,y] < landform.flatSlopeThreshold:

    # Flat local minima (gentle basin)
    if lowerCount == 0 and higherCount > 0:
        Landform = basin

    # Flat local maxima (gentle ridge)
    else if higherCount == 0 and lowerCount > 0:
        Landform = ridge

    else:
        Landform = flat

else:

    # Strong local depression
    if higherCount >= 6:
        Landform = basin

    # Strong local high
    else if lowerCount >= 6:
        Landform = ridge

    # Directional trough
    else if higherCount >= 5 and lowerCount <= 2:
        Landform = valley

    # Directional crest
    else if lowerCount >= 5 and higherCount <= 2:
        Landform = ridge

    else:
        Landform = slope
```

### Step 3 — Parameters (Appendix A)

The following parameters MUST be defined in Appendix A:

```json
"landform": {
  "eps": 0.005,
  "flatSlopeThreshold": 0.03
}
```

### Design Rationale (Informative)

- The flat case explicitly detects gentle local minima and maxima using strict `lowerCount == 0` / `higherCount == 0` tests to preserve basin detection in low-gradient terrain.
- The non-flat case distinguishes strong basins/ridges (`>= 6`) from directional valleys/crests (`>= 5` with asymmetry constraint).
- Branch order is normative to avoid implementation divergence.

---

# 6. Hydrology Derivation

## 6.1 Flow Direction (D8) — Tie-Breaking (Normative, Hash-Based)

For each tile, choose downhill neighbor with maximal positive `drop = H[c] - H[n]` above `hydrology.minDropThreshold`, else `NONE`.

When selecting the downhill neighbor with maximal drop, multiple candidates may have equal drop within `hydrology.tieEps`.

If two or more neighbors have identical drop within `hydrology.tieEps`, tie-breaking MUST be deterministic and MUST use the following hash-based rule.

### Tie-Break Rule (Normative)

Construction of `T` (normative):

- Enumerate neighbors in canonical `Dir8` order.
- Compute `drop = H[c] - H[n]` for each neighbor.
- Determine `maxDrop` among neighbors where `drop >= hydrology.minDropThreshold`.
- Build `T` by appending neighbors whose `drop` satisfies `abs(drop - maxDrop) <= hydrology.tieEps`, in the same `Dir8` enumeration order.

Let:

- `T = ordered list of tied downhill candidate neighbors` (candidates with maximal drop within `hydrology.tieEps`), in `Dir8` numeric order.
- `|T| = number of tied candidates`.

If `|T| == 1`, select that candidate.

If `|T| > 1`, compute:

- `h = tieBreakHash64(seed, x, y)`
- `i = h mod |T|`
- select `T[i]`

Where:

- `seed` is the global terrain seed.
- `(x, y)` is the current tile coordinate.
- `tieBreakHash64` is defined below.

This rule eliminates directional and center bias while preserving determinism.

### tieBreakHash64 Definition (Normative)

tieBreakHash64(seed, x, y) (normative):

- `z = seed`
- `z ^= (uint64(x) * 0x9E3779B97F4A7C15)`
- `z ^= (uint64(y) * 0xC2B2AE3D27D4EB4F)`
- `return mix64(z)`

This tie-break rule MUST be applied whenever multiple downhill candidates are tied within `hydrology.tieEps`.

## 6.2 Flow Accumulation (Normative)

Flow accumulation `FA[x,y]` counts the number of upstream tiles draining through each tile.

Initialization:

- Set `FA[x,y] = 1` for all tiles.

Let `FD[x,y]` be the flow direction mask from Section 6.1.

`downstream(t)` returns the neighbor tile indicated by `FD[t]`. If `FD[t] == NONE`, no downstream tile exists.

Algorithm:

1. Compute `InDeg[x,y]` = number of neighboring tiles whose `FD` points to `(x,y)`.
2. Initialize a FIFO queue.
3. Enqueue all tiles where `InDeg[x,y] == 0`, in canonical row-major order.
4. While queue is not empty:
   - Pop tile `t`.
   - Let `d = FD[t]`.
   - If `d != NONE`:
      - Let `u = downstream(t)`.
      - `FA[u] += FA[t]`.
      - `InDeg[u] -= 1`.
      - If `InDeg[u] == 0`, enqueue `u`.

All queue operations MUST follow Section 1.7 Graph Traversal Determinism.

## 6.3 Normalized Flow Accumulation

- `FAmin` and `FAmax` MUST be computed over all tiles in the full grid.
- `FA_N = (ln(FA)-ln(FAmin))/(ln(FAmax)-ln(FAmin))`.
- If `FAmax==FAmin`, set all `FA_N=0`.

## 6.4 Lakes and Basins

- Lake candidate: `Landform==basin && SlopeMag<hydrology.lakeFlatSlopeThreshold && FA_N>=hydrology.lakeAccumThreshold`.
- Flood-fill connected lake candidates (`LakeMask=true`).

## 6.5 Streams (Normative)

Stream detection MUST be computed before `WaterClass` assignment (Section 6.7).

Define the boolean stream mask:

- `isStream[x,y]` (boolean)

Inputs required:

- `LakeMask[x,y]` (Section 6.4)
- `FA_N[x,y]` (Section 6.3)
- `SlopeMag[x,y]` (Section 5.1)

Parameters (Appendix A):

- `hydrology.streamAccumThreshold`
- `hydrology.streamMinSlopeThreshold`

Definition (normative):

A tile is a stream tile iff:

```text
isStream[x,y] =
    (LakeMask[x,y] == false) AND
    (FA_N[x,y] >= hydrology.streamAccumThreshold) AND
    (SlopeMag[x,y] >= hydrology.streamMinSlopeThreshold)
```

Notes (normative clarifications):

- Lake tiles MUST NOT be classified as stream tiles (`LakeMask` overrides).
- `isStream` is an intermediate derived mask used by moisture proximity (Section 6.6) and `WaterClass` assignment (Section 6.7).

## 6.6 Moisture Map (Normative, Fully Explicit)

Moisture is derived deterministically from normalized flow accumulation, local flatness, and proximity to water features.

### 6.6.1 Water Tiles for Proximity (Normative)

For the purpose of moisture proximity only, a tile is considered a water tile iff:

- `isWaterTile[x,y] = (LakeMask[x,y] == true) OR (isStream[x,y] == true)`

Marsh tiles MUST NOT be included as water tiles for this proximity calculation.

### 6.6.2 Distance to Water (Normative)

Compute `distWater[x,y]` as the minimum tile-distance to any water tile using an 8-way multi-source BFS.

Informative note: this BFS distance corresponds to Chebyshev distance on a grid.

Rules:

- Neighborhood: Moore (8-way)
- Step cost: `1` for both cardinal and diagonal steps
- Initialization: all water tiles have distance `0` and are enqueued initially
- BFS proceeds outward in FIFO order, assigning the first-seen distance to each tile
- Distances MUST be computed over the full grid (including `NonPlayable` tiles)
- `distWater` for any tile is capped at `hydrology.waterProxMaxDist`

Capping rule (normative):

- `distWater[x,y] = min(distWater[x,y], hydrology.waterProxMaxDist)`

If no water tile exists in the map, then `distWater[x,y] = hydrology.waterProxMaxDist` for all tiles.

### 6.6.3 Moisture Components (Normative)

Let parameters be:

- `hydrology.moistureAccumStart`
- `hydrology.flatnessThreshold`
- `hydrology.waterProxMaxDist`

Bind moisture weights (normative):

- `wA = hydrology.weights.accum`
- `wF = hydrology.weights.flat`
- `wP = hydrology.weights.prox`

Compute:

- `wet_accum = clamp01((FA_N[x,y] - hydrology.moistureAccumStart) / (1 - hydrology.moistureAccumStart))`
- `wet_flat = clamp01((hydrology.flatnessThreshold - SlopeMag[x,y]) / hydrology.flatnessThreshold)`
- `wet_prox = clamp01(1 - distWater[x,y] / hydrology.waterProxMaxDist)`

- `Moisture[x,y] = clamp01(wA*wet_accum + wF*wet_flat + wP*wet_prox)`

Weights are applied as-is. No implicit weight normalization is performed.

## 6.7 WaterClass (Normative, Explicit Precedence)

`WaterClass[x,y]` assignment MUST occur after `LakeMask[x,y]` and `isStream[x,y]` are computed, and after `Moisture[x,y]` is computed.

`WaterClass[x,y]` MUST be assigned deterministically using the following decision order.

The first matching clause MUST be taken.

### 6.7.1 Required Inputs

The following derived values MUST already be computed:

- `LakeMask[x,y]` (Section 6.4)
- `isStream[x,y]` (Section 6.5)
- `Moisture[x,y]` (Section 6.6)
- `SlopeMag[x,y]`

Parameters (Appendix A):

- `hydrology.marshMoistureThreshold`
- `hydrology.marshSlopeThreshold`

### 6.7.2 Marsh Condition

Define:

- `marshCondition[x,y] = (Moisture[x,y] >= hydrology.marshMoistureThreshold) AND (SlopeMag[x,y] < hydrology.marshSlopeThreshold)`

### 6.7.3 Classification Order (Normative)

- If `LakeMask[x,y] == true`: `WaterClass[x,y] = lake`
- Else if `isStream[x,y] == true`: `WaterClass[x,y] = stream`
- Else if `marshCondition[x,y] == true`: `WaterClass[x,y] = marsh`
- Else: `WaterClass[x,y] = none`

### 6.7.4 Precedence Rules (Normative Clarifications)

- `lake` classification overrides `stream` and `marsh`.
- `stream` classification overrides `marsh`.
- `marsh` applies only to non-lake, non-stream tiles.
- Marsh tiles MUST NOT be considered water tiles for moisture proximity (Section 6.6.1).

This order prevents circular dependency and ensures stable biome and movement behavior.

---

# 7. Vegetation and Biome

## 7.1 Biome Enum

`Biome[x,y]` MUST be one of:

- `open_bog`
- `spruce_swamp`
- `mixed_forest`
- `pine_heath`
- `esker_pine`
- `lake`
- `stream_bank`

## 7.2 Base Biome Selection (Normative, Explicit Decision Table)

`Biome[x,y]` MUST be assigned deterministically using the following procedure.

### 7.2.1 Inputs

The following derived values MUST already be computed:

- `WaterClass[x,y]`
- `H[x,y]`
- `Moisture[x,y]`
- `SlopeMag[x,y]`
- `V[x,y]`

Parameter (Appendix A):

- `vegVarianceStrength`

### 7.2.2 Moisture Perturbation (Normative)

For non-water tiles, define perturbed moisture:

- `m2 = clamp01(Moisture[x,y] + (V[x,y] - 0.5) * vegVarianceStrength)`

`m2` MUST be used for all threshold comparisons below except where `WaterClass` overrides.

### 7.2.3 Classification Order (Normative)

The first matching clause MUST be taken.

- If `WaterClass[x,y] == lake`: `Biome[x,y] = lake`
- Else if `WaterClass[x,y] == stream`: `Biome[x,y] = stream_bank`
- Else if `m2 >= 0.85` and `SlopeMag[x,y] < 0.03`: `Biome[x,y] = open_bog`
- Else if `m2 >= 0.85`: `Biome[x,y] = spruce_swamp`
- Else if `m2 >= 0.65`: `Biome[x,y] = spruce_swamp`
- Else if `m2 >= 0.40`: `Biome[x,y] = mixed_forest`
- Else if `H[x,y] >= 0.70` and `SlopeMag[x,y] < 0.05`: `Biome[x,y] = esker_pine`
- Else: `Biome[x,y] = pine_heath`

Biome slope cutoff constants used in v1 (e.g., `0.03` and `0.05` in Section 7.2.3) are fixed and are not parameterized in Appendix A.

## 7.3 Vegetation Attributes (Normative)

Vegetation attributes MUST be computed deterministically from `Biome`, `Moisture`, and `V`.

### 7.3.1 Base Density and Canopy Table

The following base values apply per biome:

- `pine_heath`: `baseDensity = 0.35`, `baseCanopy = 0.40`
- `esker_pine`: `baseDensity = 0.30`, `baseCanopy = 0.35`
- `mixed_forest`: `baseDensity = 0.55`, `baseCanopy = 0.60`
- `spruce_swamp`: `baseDensity = 0.80`, `baseCanopy = 0.78`
- `open_bog`: `baseDensity = 0.10`, `baseCanopy = 0.15`
- `stream_bank`: `baseDensity = 0.60`, `baseCanopy = 0.55`
- `lake`: `baseDensity = 0.00`, `baseCanopy = 0.00`

### 7.3.2 Density and Canopy Computation

- `TreeDensity[x,y] = clamp01(baseDensity + (V[x,y] - 0.5) * 0.10 + (Moisture[x,y] - 0.5) * 0.08)`
- `CanopyCover[x,y] = clamp01(baseCanopy + (TreeDensity[x,y] - baseDensity) * 0.6)`

All constants used above are fixed for v1 unless overridden in Appendix A.

## 7.4 Dominant Species (Normative, Required Output)

`dominant` MUST be exported as an ordered list of zero, one, or two species identifiers per tile.

Species identifiers (v1):

- `"scots_pine"`
- `"norway_spruce"`
- `"birch"`

### 7.4.1 Deterministic Assignment

- If `Biome == pine_heath`: `dominant = ["scots_pine"]`
- Else if `Biome == esker_pine`: `dominant = ["scots_pine"]`
- Else if `Biome == spruce_swamp`: `dominant = ["norway_spruce"]`
- Else if `Biome == mixed_forest` and `Moisture[x,y] >= 0.52`: `dominant = ["norway_spruce", "birch"]`
- Else if `Biome == mixed_forest`: `dominant = ["birch", "norway_spruce"]`
- Else if `Biome == stream_bank`: `dominant = ["birch"]`
- Else if `Biome == open_bog` and `Moisture[x,y] >= 0.75`: `dominant = []`
- Else if `Biome == open_bog`: `dominant = ["birch"]`
- Else if `Biome == lake`: `dominant = []`

### 7.4.2 Ordering Rule

If two species are listed, the first element represents the primary dominant species and the second represents secondary presence.

No probabilistic selection is permitted. Assignment MUST be deterministic based solely on the rules above.

---

# 8. Ground

- `SoilType`: `peat|sandy_till|rocky_till` from moisture/elevation/landform.
- `Firmness = clamp01(1.0 - 0.85*Moisture + 0.15*clamp01(SlopeMag/0.2))`
- `SurfaceFlags`: `standing_water|sphagnum|lichen|exposed_sand|bedrock` by thresholds.

---

# 9. Roughness and Features

Let `mix = roughnessFeatures.obstructionMoistureMix`.

Compute:

- `Obstruction[x,y] = clamp01(R[x,y] * (1 - mix) + Moisture[x,y] * mix)`
- `FeatureFlags`: `fallen_log|root_tangle|boulder|windthrow` by deterministic threshold rules.

---

# 10. Game Trail Generation

## 10.1 Outputs and Navigation Effects

The generator MUST produce:

- `GameTrail[x,y]`: boolean
- `GameTrailId[x,y]`: optional integer id (recommended for debugging)

If `GameTrailId[x,y]` is emitted, IDs MUST be assigned incrementally in the order routes are generated (Section 10.4). Route generation order is deterministic.

Trail effects:

- Add `game_trail` to `FollowableFlags` when `GameTrail[x,y] == true`.
- Movement effect is applied **once** in Section 13.1 only.

## 10.2 Trail Preference (Cost) Field (Normative, Fully Explicit)

Game trails are produced by least-cost routing over a deterministic per-tile cost field `C[x,y]`.

### 10.2.1 Parameters (Appendix A)

- `gameTrails.inf`
- `gameTrails.wSlope`
- `gameTrails.slopeScale`
- `gameTrails.wMoist`
- `gameTrails.moistStart`
- `gameTrails.wObs`
- `gameTrails.wRidge`
- `gameTrails.wStreamProx`
- `gameTrails.streamProxMaxDist`
- `gameTrails.wCross`
- `gameTrails.wMarsh`

### 10.2.2 Distances (Normative)

Compute `distStream[x,y]` as 8-way multi-source BFS distance (cardinal and diagonal step cost = `1`) to the nearest stream tile, capped at `streamProxMaxDist`.

Stream tiles are those where `WaterClass[x,y] == stream`.

If no stream tiles exist, set `distStream[x,y] = streamProxMaxDist` for all tiles.

### 10.2.3 Cost Function (Normative)

Let:

- `INF = gameTrails.inf`
- `base = 1.0`
- `wSlope = gameTrails.wSlope`, `slopeScale = gameTrails.slopeScale`
- `wMoist = gameTrails.wMoist`, `moistStart = gameTrails.moistStart`
- `wObs = gameTrails.wObs`
- `wRidge = gameTrails.wRidge`
- `wStreamProx = gameTrails.wStreamProx`, `streamProxMaxDist = gameTrails.streamProxMaxDist`
- `wCross = gameTrails.wCross`
- `wMarsh = gameTrails.wMarsh`
- `slopeTerm = wSlope * clamp01(SlopeMag[x,y] / slopeScale)`
- `moistureTerm = wMoist * clamp01((Moisture[x,y] - moistStart) / (1 - moistStart))`
- `obstructionTerm = wObs * Obstruction[x,y]`
- `ridgeBonus = (-wRidge)` if `Landform[x,y] == ridge` else `0`
- `streamProxBonus = -wStreamProx * clamp01(1 - distStream[x,y] / streamProxMaxDist)`
- `waterCrossingTerm = wCross` if `WaterClass[x,y] == stream` else `0`
- `marshTerm = wMarsh` if `WaterClass[x,y] == marsh` else `0`
- `lakeTerm = INF` if `WaterClass[x,y] == lake` else `0`
- `nonPlayableTerm = INF` if tile is `NonPlayable` else `0`

Then:

- `C[x,y] = base + slopeTerm + moistureTerm + obstructionTerm + waterCrossingTerm + marshTerm + lakeTerm + nonPlayableTerm + ridgeBonus + streamProxBonus`

Constraints:

- If `C[x,y] >= INF`, the tile MUST be treated as non-traversable by the trail pathfinder.
- The cost field `C` MUST be computed once and MUST NOT be modified during trail routing.

## 10.3 Trail Seed Selection (Normative, Fully Explicit)

### 10.3.1 Candidate Filtering (Normative)

A tile `(x,y)` is a seed candidate iff all are true:

- tile is `Playable` (not `NonPlayable`)
- `WaterClass[x,y] != lake`
- `Moisture[x,y] < 0.92`
- `SlopeMag[x,y] < 0.30`

### 10.3.2 Candidate Score (Normative)

Parameters used in this subsection:

- `waterSeedMaxDist = gameTrails.waterSeedMaxDist`

Compute `distWater[x,y]` as 8-way multi-source BFS distance (cardinal and diagonal step cost = `1`) to nearest water tile (`WaterClass == stream` OR `WaterClass == lake`), capped at `gameTrails.waterSeedMaxDist`.

If no water tiles exist, set `distWater[x,y] = waterSeedMaxDist` for all tiles.

Define score:

- `S[x,y] = 0`
- `S[x,y] += 0.35 * clamp01((Firmness[x,y] - 0.35) / 0.65)`
- `S[x,y] += 0.25 * clamp01(1 - abs(Moisture[x,y] - 0.55) / 0.55)`
- `S[x,y] += 0.20 * clamp01(1 - SlopeMag[x,y] / 0.25)`
- `S[x,y] += 0.20 * clamp01(1 - distWater[x,y] / waterSeedMaxDist)`

### 10.3.3 Seed Count (Normative)

Parameter used in this subsection:

- `seedTilesPerTrail = gameTrails.seedTilesPerTrail`

Let:

- `inset = playableInset`
- `playableWidth = width - 2*inset`
- `playableHeight = height - 2*inset`
- `playableArea = max(0, playableWidth * playableHeight)`

Compute:

- `seedCount = floor(playableArea / seedTilesPerTrail)`
- If `seedCount < 1`, set `seedCount = 1`.

### 10.3.4 Seed Selection Order (Normative)

- Sort candidates by `S[x,y]` descending.
- Break ties by `(y, x)` ascending.
- Select the first `seedCount` candidates as trail seeds.

## 10.4 Endpoints and Route Request Order (Normative)

For each seed:

1. Find nearest `WaterNode` where `WaterClass == stream` and `FA_N >= streamEndpointAccumThreshold`.
2. Find nearest `RidgeNode` where `Landform == ridge` and `SlopeMag < ridgeEndpointMaxSlope`.

Nearest-node ties MUST break by `(y, x)` ascending.

Routes are requested in this order:

1. Seed → nearest `WaterNode` (if any)
2. Seed → nearest `RidgeNode` (if any)

## 10.5 Least-Cost Path (Normative, Fully Explicit)

For each requested route, compute a least-cost path over the 8-neighbor grid using Dijkstra’s algorithm.

### 10.5.1 Parameters

- `diagWeight = gameTrails.diagWeight`
- `tieEps = hydrology.tieEps`

### 10.5.2 Graph and Edge Cost (Normative)

- Nodes are tiles `(x,y)` where `C[x,y] < INF`.
- Edges connect to the 8 neighbors with `C[n] < INF`.

Edge traversal cost from tile `a` to neighbor tile `b`:

- `dirWeight = 1.0` for cardinal steps, `diagWeight` for diagonal steps
- `edgeCost(a -> b) = C[b] * dirWeight`

### 10.5.3 Dijkstra Queue Ordering (Normative)

The priority queue MUST order candidate frontier entries by:

1. lowest cumulative path cost
2. tie-break by `(y, x)` ascending on the destination tile
3. if still tied, tie-break by `Dir8` numeric order of the step taken

Equality for cost comparisons MUST use `tieEps`:

- Treat two costs as equal iff `abs(costA - costB) <= tieEps`.

### 10.5.4 Path Reconstruction (Normative)

- Store a predecessor pointer for each visited tile.
- When the endpoint is dequeued (popped) from the priority queue, the algorithm MAY terminate early and reconstruct the path by following predecessors back to the start.
- If the endpoint is unreachable, the route yields no path and MUST be skipped.

### 10.5.5 Trail Marking Order (Normative)

Paths are marked as `GameTrail = true` immediately after each route is computed.

Routes MUST be generated and applied in this order for each seed:

1. Seed → nearest `WaterNode` (if any)
2. Seed → nearest `RidgeNode` (if any)

Marking trails MUST NOT modify `C`, `S`, or any routing behavior for subsequent routes.

## 10.6 Optional Post-processing (Deterministic if enabled)

A single simplification pass MAY be applied to reduce zig-zag artifacts. If enabled, it MUST be deterministic and MUST NOT alter `C` or seed selection.

---

# 11. Visibility

Bind visibility parameters (normative):

- `base = visibility.base`
- `densityPenalty = visibility.densityPenalty`
- `obstructionPenalty = visibility.obstructionPenalty`
- `elevationBonus = visibility.elevationBonus`
- `minMeters = visibility.minMeters`
- `maxMeters = visibility.maxMeters`

- `vis = base - densityPenalty*TreeDensity - obstructionPenalty*Obstruction + elevationBonus*(H-0.5)`
- `VisibilityBaseMeters = clamp(vis, minMeters, maxMeters)`

---

# 12. Orientation Reliability (Informational)

Bind orientation parameters (normative):

- `densityWeight = orientation.densityWeight`
- `obstructionWeight = orientation.obstructionWeight`
- `wetnessWeight = orientation.wetnessWeight`
- `wetnessStart = orientation.wetnessStart`
- `wetnessRange = orientation.wetnessRange`
- `ridgeBonus = orientation.ridgeBonus`
- `min = orientation.min`
- `max = orientation.max`

Normative computation:

- `OR = 1.0`
- `OR -= densityWeight * TreeDensity`
- `OR -= obstructionWeight * Obstruction`
- `OR -= wetnessWeight * clamp01((Moisture - wetnessStart) / wetnessRange)`
- `OR += ridgeBonus` if `Landform == ridge`
- `OrientationReliability = clamp(OR, min, max)`

This field MUST NOT affect movement, passability, trail routing, or hydrology in v1.

---

# 13. Movement and Navigation

## 13.1 Move Cost (Normative, Fully Ordered)

`MoveCost[x,y]` MUST be computed deterministically using the following ordered steps.

### Step 1 — Base Cost

Initialize:

- `MoveCost = 1.0`

Apply obstruction and moisture multipliers:

- `MoveCost *= lerp(1.0, movement.moveCostObstructionMax, Obstruction[x,y])`
- `MoveCost *= lerp(1.0, movement.moveCostMoistureMax, Moisture[x,y])`

### Step 2 — Biome / Water Modifiers

Apply modifiers based on the origin tile only:

- If `WaterClass[x,y] == marsh`: `MoveCost *= movement.marshMoveCostMultiplier`
- If `Biome[x,y] == open_bog`: `MoveCost *= movement.openBogMoveCostMultiplier`

No other biome modifies `MoveCost` in v1.

### Step 3 — Trail Modifier

If `GameTrail[x,y] == true`:

- `MoveCost *= gameTrails.gameTrailMoveCostMultiplier`

Trail multiplier MUST be applied last.

### Step 4 — Final Value

`MoveCost[x,y]` is not clamped beyond implicit positive range enforcement.

## 13.2 Passability by Direction

Passability checks and slope comparisons use `H[x,y]` and `H[nx,ny]`. `MoveCost` affects traversal difficulty but does not alter passability classification.

For each directed edge `(x,y)->(nx,ny)`:

1. If out-of-bounds or destination `NonPlayable`: `blocked`.
2. If `WaterClass[x,y]==lake` or `WaterClass[nx,ny]==lake`: `blocked`.
3. `dh = H[nx,ny] - H[x,y]`.
4. If `Moisture[x,y] >= 0.90 && SlopeMag[x,y] < 0.03`: `difficult`.
5. Else if `dh >= movement.steepBlockDelta`: `blocked`.
6. Else if `dh >= movement.steepDifficultDelta`: `difficult`.
7. Else `passable`.

The suction-bog slope threshold (`0.03`) is fixed in v1 and not parameterized.

Cliff flag:

- `CliffEdge[x,y,dir] = (dh >= movement.steepBlockDelta && SlopeMag[x,y] >= movement.cliffSlopeMin)`.

## 13.3 Followable Flags

- Add `stream` if stream tile.
- Add `ridge` if ridge landform.
- Add `game_trail` if trail tile.
- Add `shore` if adjacent to lake and not lake.

---

# 14. Tile Payload

The generator MUST emit a versioned envelope:

```json
{
  "meta": {
    "specVersion": "forest-terrain-v1"
  },
  "tiles": [
    {
      "id": "forest:25,19",
      "position": {"x": 25, "y": 19},
      "topography": {"elevation": 0.18, "slopeMag": 0.04, "aspectDeg": 182, "landform": "flat"},
      "hydrology": {"flowDir": 2, "flowAccum": 219, "flowAccumN": 0.74, "moisture": 0.86, "waterClass": "stream"},
      "vegetation": {"biome": "spruce_swamp", "treeDensity": 0.82, "canopyCover": 0.78, "dominant": ["norway_spruce"]},
      "ground": {"soil": "peat", "firmness": 0.34, "surfaceFlags": ["standing_water", "sphagnum"]},
      "roughness": {"obstruction": 0.48, "featureFlags": ["fallen_log", "root_tangle"]},
      "visibility": {"baseMeters": 12},
      "navigation": {
        "moveCost": 1.35,
        "orientationReliability": 0.58,
        "followable": ["stream", "game_trail"],
        "passability": {"N": "difficult", "NE": "passable", "E": "passable", "SE": "blocked", "S": "blocked", "SW": "blocked", "W": "passable", "NW": "passable"}
      }
    }
  ]
}
```

`tiles` is the authoritative payload for downstream consumers.

---

# 15. Debug Outputs (Recommended)

- height, slope, moisture, flow accumulation, water overlay, biome categorical, roughness

# 16. Testing Requirements

Implementations MUST include fixed-seed regression checks for:

- Base maps (with epsilon for floats)
- Categorical maps (`Biome`, `WaterClass`)
- Hydrology (`FD`, `FA`)

Recommended float epsilon: `1e-6`.

---

# Appendix A: Recommended Parameter Defaults (v1)

```json
{
  "grid": {"playableInset": 1},
  "heightNoise": {"octaves": 5, "baseFrequency": 0.035, "lacunarity": 2.0, "persistence": 0.5},
  "roughnessNoise": {"octaves": 3, "baseFrequency": 0.06, "lacunarity": 2.0, "persistence": 0.55},
  "vegVarianceNoise": {"octaves": 4, "baseFrequency": 0.045, "lacunarity": 2.0, "persistence": 0.5, "strength": 0.12},
  "landform": {"eps": 0.005, "flatSlopeThreshold": 0.03},
  "hydrology": {
    "minDropThreshold": 0.0005,
    "tieEps": 0.000001,
    "streamAccumThreshold": 0.55,
    "streamMinSlopeThreshold": 0.01,
    "lakeFlatSlopeThreshold": 0.03,
    "lakeAccumThreshold": 0.65,
    "moistureAccumStart": 0.35,
    "flatnessThreshold": 0.06,
    "waterProxMaxDist": 6,
    "weights": {"accum": 0.55, "flat": 0.25, "prox": 0.20},
    "marshMoistureThreshold": 0.78,
    "marshSlopeThreshold": 0.04
  },
  "ground": {
    "peatMoistureThreshold": 0.70,
    "standingWaterMoistureThreshold": 0.78,
    "standingWaterSlopeMax": 0.04,
    "lichenMoistureMax": 0.35,
    "exposedSandMoistureMax": 0.40,
    "bedrockHeightMin": 0.75,
    "bedrockRoughnessMin": 0.55
  },
  "roughnessFeatures": {
    "obstructionMoistureMix": 0.15,
    "windthrowThreshold": 0.70,
    "fallenLogThreshold": 0.45,
    "rootTangleMoistureThreshold": 0.60,
    "boulderHeightMin": 0.70,
    "boulderRoughnessMin": 0.60
  },
  "movement": {
    "steepBlockDelta": 0.22,
    "steepDifficultDelta": 0.12,
    "cliffSlopeMin": 0.18,
    "moveCostObstructionMax": 1.35,
    "moveCostMoistureMax": 1.25,
    "marshMoveCostMultiplier": 1.15,
    "openBogMoveCostMultiplier": 1.20
  },
  "visibility": {
    "base": 40,
    "densityPenalty": 28,
    "obstructionPenalty": 10,
    "elevationBonus": 6,
    "minMeters": 8,
    "maxMeters": 60
  },
  "orientation": {
    "min": 0.25,
    "max": 0.95,
    "densityWeight": 0.45,
    "obstructionWeight": 0.20,
    "wetnessWeight": 0.15,
    "wetnessStart": 0.60,
    "wetnessRange": 0.40,
    "ridgeBonus": 0.10
  },
  "gameTrails": {
    "diagWeight": 1.41421356237,
    "inf": 1000000000,
    "wSlope": 4.0,
    "slopeScale": 0.18,
    "wMoist": 3.0,
    "moistStart": 0.55,
    "wObs": 2.0,
    "wRidge": 0.35,
    "wStreamProx": 0.25,
    "streamProxMaxDist": 5,
    "wCross": 0.65,
    "wMarsh": 1.25,
    "waterSeedMaxDist": 6,
    "seedTilesPerTrail": 450,
    "streamEndpointAccumThreshold": 0.70,
    "ridgeEndpointMaxSlope": 0.12,
    "gameTrailMoveCostMultiplier": 0.85
  }
}
```

# Appendix B: Helper Functions

- `clamp01(x) = max(0, min(1, x))`
- `clamp(x, lo, hi) = max(lo, min(hi, x))`
- `lerp(a, b, t) = a + (b - a) * clamp01(t)`

# Appendix C: Implementation Notes

- Multi-source BFS is recommended for distance-to-water and distance-to-stream terms.
- All random decisions MUST be deterministic functions of seed and tile coordinates.

# Appendix D: Reference CLI Implementation Plan (Standalone Node Project)

Status: planning draft (informative)

This appendix captures implementation decisions for a reference CLI that targets this
specification. It is intentionally implementation-focused and does not alter normative
requirements in Sections 1-16.

## D.1 Repository and Runtime Boundary

- The reference CLI is a standalone project in its own repository.
- It does not run MUD runtime code and does not depend on ranviermud boot/runtime internals.
- Runtime target is Node 22 LTS.

## D.2 Language and Packaging Decisions

- Module system: ESM.
- Language: TypeScript.
- Package manager: npm.

## D.3 CLI Framework and Command Surface

- Argument parser library: `commander`.
- Recommended subcommands:
  - `generate`
  - `derive`
  - `debug`

Input precedence remains normative per Section 2.1:

1. explicit CLI arguments
2. parameter file values
3. built-in defaults

`seed` remains a required input for conformance with Section 2.2.

## D.4 Debug Output Format Decisions

Debug mode supports both machine-oriented and visual outputs.

- `--json`: emit JSON debug grids.
- `--png`: emit PNG rasters.
- If both are supplied, both outputs are emitted.
- Implementations may choose whether omitting both flags is treated as:
  - defaulting to both outputs, or
  - a usage error requiring explicit format selection.

Regardless of default behavior, tooling documentation should explicitly describe the
chosen behavior.


Recommended debug artifact directory layout:

```text
debug/
  json/
    height.json
    slope.json
    moisture.json
    flowAccum.json
    waterClass.json
    biome.json
    roughness.json
  png/
    height.png
    slope.png
    moisture.png
    flowAccum.png
    waterClass.png
    biome.png
    roughness.png
```


## D.5 Testing Framework and Validation Strategy

Recommended testing framework for the reference Node implementation: `vitest`.

Minimum test categories:

- Unit tests for deterministic primitives (`Dir8` ordering, tie-break behavior, hash helpers).
- Fixed-seed regression tests per Section 16.
- CLI integration tests for:
  - mode dispatch (`generate`, `derive`, `debug`)
  - exit-code semantics from Section 2.1
  - debug format flags (`--json`, `--png`, both)
  - input precedence and validation behavior

Recommended fixture policy:

- Small maps: full JSON snapshots.
- Medium/large maps: deterministic digest + selected tile probes to limit fixture churn.
