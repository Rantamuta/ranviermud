# Procedural Finnish Forest Terrain Generation Spec (v1)

## Status

- Status: draft-v1
- Scope: forest region terrain generation, hydrology derivation, biome classification, movement/navigation derivation, and per-tile payload export
- Binding: normative for implementers
- Audience: engine maintainers and content pipeline developers

## Non-goal Clarification: Cross-Implementation Output Parity (Normative)

Cross-implementation byte-identical output parity (e.g., Node and Rust producing identical JSON bytes from identical input) is explicitly **out of scope for v1**.

For v1, conformance is evaluated per implementation profile. This spec requires deterministic behavior within one implementation/runtime build, not equality across different language/runtime implementations.

## Determinism

Given identical inputs (seed, parameters, and optional authored base maps), the system MUST produce identical outputs across runs **within a given implementation**.

For v1 reproducibility, implementations MUST also pin:

- Tile iteration order for all whole-map passes: `for y in [0..height-1], for x in [0..width-1]`.
- Neighbor expansion order for BFS/Dijkstra: `E, SE, S, SW, W, NW, N, NE`.
- Stable sort tie-break order: `(score desc)`, then `(y asc, x asc)`.
- Seed parsing mode: unsigned 64-bit integer.

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

- Noise function: `noise(seed, x, y) -> [-1,1]`, deterministic.
- Multi-octave for each map:
  - Start `freq = baseFrequency`, `amp = 1.0`.
  - Loop octaves: `sum += amp * noise(seed_octave, x*freq, y*freq)`; `norm += amp`; `freq *= lacunarity`; `amp *= persistence`.
  - `value = sum/norm`, normalize to `[0,1]` by `(value + 1)/2`.

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
if SlopeMag[x,y] < flatSlopeThreshold:

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

## 6.1 Flow Direction (D8)

For each tile, choose downhill neighbor with maximal positive `drop = H[c] - H[n]` above `minDropThreshold`, else `NONE`.

Tie-break:

1. Minimize squared distance from candidate destination to map center.
2. If still tied, first neighbor in `E, SE, S, SW, W, NW, N, NE`.

## 6.2 Flow Accumulation

- Initialize `FA=1`.
- Compute in-degree from `FD`.
- Topological queue accumulation.

## 6.3 Normalized Flow Accumulation

- `FA_N = (ln(FA)-ln(FAmin))/(ln(FAmax)-ln(FAmin))`.
- If `FAmax==FAmin`, set all `FA_N=0`.

## 6.4 Lakes / Streams / Moisture / WaterClass

- Lake candidate: `Landform==basin && SlopeMag<lakeFlatSlopeThreshold && FA_N>=lakeAccumThreshold`.
- Flood-fill connected lake candidates (`LakeMask=true`).
- Stream if not lake and thresholds for accumulation/slope satisfied.
- Moisture:
  - `wet_accum`, `wet_flat`, `wet_prox`.
  - `wet_prox` uses 8-way multi-source BFS with step cost 1 (Chebyshev distance).
  - Blend via weighted sum and clamp.
- `WaterClass`: `lake|stream|marsh|none` per thresholds.

---

# 7. Vegetation and Biome

Biome enum:

- `open_bog, spruce_swamp, mixed_forest, pine_heath, esker_pine, lake, stream_bank`

Selection uses `WaterClass`, `Moisture` (optionally perturbed via `V`), elevation and slope thresholds.

Tree density/canopy from biome table + variance/moisture modulation.

---

# 8. Ground

- `SoilType`: `peat|sandy_till|rocky_till` from moisture/elevation/landform.
- `Firmness = clamp01(1.0 - 0.85*Moisture + 0.15*clamp01(SlopeMag/0.2))`
- `SurfaceFlags`: `standing_water|sphagnum|lichen|exposed_sand|bedrock` by thresholds.

---

# 9. Roughness and Features

- `Obstruction = clamp01(R*0.85 + Moisture*0.15)`.
- `FeatureFlags`: `fallen_log|root_tangle|boulder|windthrow` by deterministic threshold rules.

---

# 10. Game Trail Generation

Outputs:

- Required: `GameTrail[x,y]` boolean
- Optional: `GameTrailId[x,y]`

Trail effects:

- Add `game_trail` followable flag.
- Movement effect is applied **once** in Section 13.1 only.

Trail generation:

- Least-cost routing over `C[x,y]` from slope/moisture/obstruction/water terms.
- `lake` and `NonPlayable` tiles use `INF` (non-traversable).
- Distances use Chebyshev metric via 8-way BFS with step cost 1.
- Seed scoring and endpoint selection are deterministic.
- Dijkstra on 8-neighbor graph with `diagWeight` for diagonals.

---

# 11. Visibility

- `vis = base - densityPenalty*TreeDensity - obstructionPenalty*Obstruction + elevationBonus*(H-0.5)`
- `VisibilityBaseMeters = clamp(vis, minMeters, maxMeters)`

---

# 12. Orientation Reliability (Informational)

Normative computation:

- `OR = 1.0`
- `OR -= densityWeight * TreeDensity`
- `OR -= obstructionWeight * Obstruction`
- `OR -= wetnessWeight * clamp01((Moisture - wetnessStart) / wetnessRange)`
- `OR += ridgeBonus` if `Landform==ridge`
- `OrientationReliability = clamp(OR, min, max)`

This field MUST NOT affect movement, passability, trail routing, or hydrology in v1.

---

# 13. Movement and Navigation

## 13.1 Move Cost

Normative order:

1. Base multipliers from obstruction and moisture.
2. Water/biome modifiers (`marsh`, `open_bog`).
3. If `GameTrail[x,y]==true`, apply `MoveCost *= gameTrailMoveCostMultiplier` **once**.

## 13.2 Passability by Direction

For each directed edge `(x,y)->(nx,ny)`:

1. If out-of-bounds or destination `NonPlayable`: `blocked`.
2. If `WaterClass[x,y]==lake` or `WaterClass[nx,ny]==lake`: `blocked`.
3. `dh = H[nx,ny] - H[x,y]`.
4. If `Moisture[x,y] >= 0.90 && SlopeMag[x,y] < 0.03`: `difficult`.
5. Else if `dh >= steepBlockDelta`: `blocked`.
6. Else if `dh >= steepDifficultDelta`: `difficult`.
7. Else `passable`.

Cliff flag:

- `CliffEdge[x,y,dir] = (dh >= steepBlockDelta && SlopeMag[x,y] >= cliffSlopeMin)`.

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


## 14.1 Numeric Precision and Serialization Policy (Normative)

To reduce downstream diff churn while preserving deterministic comparisons:

- Internal computation precision is implementation-defined, but exported numeric values MUST be serialized with fixed decimal precision.
- Export precision for normalized floats (`[0,1]`) and derived continuous fields MUST be 6 fractional digits.
- Integer fields (`flowDir`, `flowAccum`, coordinates, ids) MUST be emitted as integers (no decimal suffix).
- Implementations MAY retain higher internal precision, but serialization MUST round half away from zero to the configured decimal places.


---

# 15. Debug Outputs (Recommended)

- height, slope, moisture, flow accumulation, water overlay, biome categorical, roughness

# 16. Testing Requirements

Implementations MUST include fixed-seed regression checks for:

- Base maps (with epsilon for floats)
- Categorical maps (`Biome`, `WaterClass`)
- Hydrology (`FD`, `FA`)

Recommended float epsilon: `1e-6`.


## 16.1 Canonical Conformance Vector (Normative)

Implementations MUST provide at least one canonical fixture that is versioned with this spec.

In v1, fixture validation is scoped to a given implementation profile; fixtures are not, by themselves, a requirement for cross-language output equality.

Required fixture fields:

- `seed`
- `width`, `height`
- `paramsHash` (SHA-256 hash of canonicalized JSON parameter object)
- checksums for `FD`, `FA`, and `WaterClass` maps (SHA-256)
- one full tile payload snapshot at a fixed coordinate

Hash algorithm and encoding are normative:

- Hash algorithm MUST be SHA-256.
- Hash digest MUST be lower-case hexadecimal and prefixed with `sha256:`.
- Hash input MUST be UTF-8 encoded canonical JSON with no insignificant whitespace.
- Tile-map checksum inputs MUST be row-major ordered (`y`, then `x`).

Recommended fixture shape:

```json
{
  "specVersion": "forest-terrain-v1",
  "seed": "4242424242",
  "width": 64,
  "height": 64,
  "paramsHash": "sha256:<hex>",
  "checksums": {
    "FD": "sha256:<hex>",
    "FA": "sha256:<hex>",
    "WaterClass": "sha256:<hex>"
  },
  "tileSnapshot": {
    "x": 25,
    "y": 19,
    "payload": { "...": "full tile object" }
  }
}
```

Checksum input normalization MUST use row-major tile ordering (`y`, then `x`) and UTF-8 JSON encoding without insignificant whitespace.

## 16.2 First Published Fixture (Normative)

For v1, implementations MUST include and expose the published minimal conformance fixture at:

- `docs/drafts/fixtures/forest-terrain-v1-conformance-fixture.json`

That fixture is the canonical starter artifact for validating hashing/serialization behavior before larger-map fixtures are added.


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
