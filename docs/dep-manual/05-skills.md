# skills

## 1. Title
- **Topic:** skills
- **Ranvier package identity:** `rantamuta-core@1.0.0` (`node_modules/ranvier/package.json`), CommonJS module root export from `index.js`.
- **Primary entry files for this topic:**
  - `node_modules/ranvier/src/BundleManager.js` (`loadSkills`)
  - `node_modules/ranvier/src/Skill.js`
  - `node_modules/ranvier/src/SkillManager.js`
  - `node_modules/ranvier/src/SkillType.js`
  - `node_modules/ranvier/src/SkillFlag.js`
  - `node_modules/ranvier/src/SkillErrors.js`
  - `node_modules/ranvier/src/Effect.js` (skill reference hydration coupling)

## 2. Status
- **binding:** informational
- **audience:** engine maintainers, agents
- **scope:** ranvier internal deep dive

## 3. What it is
The skills subsystem defines active/passive combat and utility abilities, including execution flow, cooldown handling, resource costs, and optional passive effects. Bundles load skill definitions from `skills/` into either `SkillManager` or `SpellManager` based on type.

## 4. Where it lives in ranvier
- Bundle feature map includes `skills/` in `BundleManager.loadBundle`.
- Skill load path: `BundleManager.loadSkills`.
- Core runtime model: `Skill` class.
- Registry: `SkillManager` (Map wrapper).
- Type/flag enums: `SkillType`, `SkillFlag`.
- Domain errors: `SkillErrors`.
- Effect back-reference hydration: `Effect.hydrate` reads skill id from `state.SkillManager` / `state.SpellManager`.

**Export surface**
- Exposed through top-level `index.js` require-dir export.

## 5. How it works
- **Loading**
  1. `loadSkills` reads `skills/` files and requires each script.
  2. Loader compatibility wrapper resolves object or function export.
  3. If skill export has `run`, loader invokes `skillImport.run = skillImport.run(this.state)` (factory-to-executable transform).
  4. Construct `new Skill(skillName, skillImport, this.state)`.
  5. Route by `skill.type`: `SkillManager` for `SkillType.SKILL`, else `SpellManager`.

- **Execution lifecycle (`Skill.execute`)**
  1. Reject passive skills (`PassiveError`).
  2. Reject while cooldown effect active (`CooldownError`).
  3. Validate resources (`NotEnoughResourcesError`).
  4. Optionally initiate combat.
  5. Call skill run function.
  6. Unless run returns `false`, apply cooldown and pay resource costs.

- **Passive activation (`Skill.activate`)**
  - Requires passive flag and attached effect id.
  - Creates effect from `EffectFactory`, applies `configureEffect`, links `effect.skill`, adds to player, and runs skill callback.

- **Defaults/implicit behavior**
  - Constructor defaults many fields (`requiresTarget`, `type`, etc.).
  - Cooldown config accepts number or object `{ group, length }`.
  - Resource supports single object or array of costs.

## 6. Public surface and invariants
- **APIs**
  - `BundleManager.loadSkills(bundle, skillsDir)`.
  - `Skill.execute(args, player, target)`.
  - `Skill.activate(player)`.
  - `Skill.onCooldown`, `cooldown`, `createCooldownEffect`, `hasEnoughResources`.
  - `SkillManager.get/add/remove/find`.

- **Call order / shape constraints**
  - Active skills should use `execute`; passive skills should use `activate`.
  - Skill definitions should provide `run` compatible with loader transform (`run(state)` returning callable).
  - Resource entries require `{ attribute, cost }` shape.

- **Error behavior**
  - Throws typed errors from `SkillErrors` for passive misuse, cooldown, and insufficient resources.
  - `activate` throws generic error when passive skill lacks effect id.

- **Sync/async assumptions**
  - `execute` is synchronous and does not await promises.
  - Async `run` functions are not explicitly handled (would return Promise and still trigger cooldown/resource unless promise object equals `false`).

- **Invariants**
  - Cooldown effect id is either `skill:<id>` or `skillgroup:<group>`.
  - `SkillManager` keys by `skill.id` on add.

## 7. Internal integration contract
- **Expects**
  - `state.EffectFactory` present for cooldown/passive effect creation.
  - Characters expose effects collection, `addEffect`, `hasAttribute`, and attribute getters.
  - `state.SkillManager` and `state.SpellManager` registries exist.

- **Provides**
  - Runtime skill objects and registry lookup.
  - Cooldown effects and combat initiation side effects.
  - Skill references persisted/restored through effect hydration (`Effect.js`).

- **Coupling points**
  - `BundleManager` loader conventions.
  - `Damage` class for resource payment by self-damage.
  - `Broadcast` for default cooldown expiration notification.

## 8. Performance characteristics
- Skill load is O(number of `skills/*.js` files).
- `SkillManager.find` is linear prefix scan through map entries.
- `Skill.onCooldown` loops all character effects each execution.
- Cooldown effect creation may lazily register default cooldown effect config once per runtime (`EffectFactory.has('cooldown')` guard).

## 9. Common failure modes
1. Misconfigured passive skill without `effect` throws at activation time.
2. `SkillManager.remove` deletes by `skill.name` while `add` keyed by `skill.id`; removal may fail and leak stale entries.
3. Loader’s `skillImport.run = skillImport.run(this.state)` assumes `run` is higher-order function; non-HOF run functions can break load.
4. Async `run` functions can produce unintended cooldown/resource timing.
5. Missing `cooldown` effect implementation fallback relies on default config; if `EffectFactory` missing methods, runtime fails.

## 10. Gotchas and footguns
- `requiresTarget` and `targetSelf` are stored but enforcement is external (not in `Skill.execute`).
- `execute` always returns `true` unless throws, even if underlying `run` returns non-boolean truthy/falsy values (except strict `false` special-case).
- Resource cost uses `Damage.commit(player)`; this means mitigation/resistance mechanics may alter resource spending.
- `SkillManager.find` prefix matching returns first insertion-order hit; ambiguous prefixes are unstable if load order changes.

## 11. Security considerations
- Dynamic `require` of bundle `skills/*.js` executes arbitrary code.
- Skill `run` functions receive live state/player/target objects and can mutate broad engine state.
- No obvious eval/deserialization hazards in core skill modules.

## 12. Tests and reproduction
- **Tests in ranvier:** no direct unit tests for `Skill`, `SkillManager`, or `loadSkills` were found under `node_modules/ranvier/test/unit`.

### Suggested tests
1. `loadSkills` supports both HOF and direct function skill `run` forms (or explicitly rejects one with clear error).
2. `Skill.execute` throws each typed error path.
3. Cooldown group behavior shares cooldown across skills in same group.
4. `SkillManager.remove` key mismatch regression test.
5. Resource array costs apply all entries exactly once.
6. Passive activation creates effect with `effect.skill` back-reference.

### Minimal reproduction (pseudocode)
```js
const skill = state.SkillManager.get('bash');
try {
  skill.execute('goblin', player, target);
} catch (err) {
  if (err instanceof SkillErrors.CooldownError) {
    // show remaining cooldown from err.effect
  }
}
```

## 13. Operational guidance
- Add logs at:
  - `BundleManager.loadSkills` around `run` transform and manager routing.
  - `Skill.execute` around cooldown/resource checks.
- Runtime inspection:
  - `state.SkillManager.skills.keys()` and `state.SpellManager.skills.keys()`.
  - `character.effects` entries for `cooldown` with matching `cooldownId`.
- Stack clues:
  - `Passive skill has no attached effect` => passive definition missing `effect` key.
  - `NotEnoughResourcesError` => attribute/cost mismatch or insufficient pool.

## 14. Maintainer TODOs
1. Fix `SkillManager.remove` to delete by `skill.id`.
2. Add explicit loader validation for expected `run` export shape.
3. Add focused unit tests for skill execution/cooldown/resource behavior.
4. Clarify async support policy for `run` in comments/tests.
