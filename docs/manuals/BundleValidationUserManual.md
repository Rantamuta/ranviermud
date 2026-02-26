# Bundle Validation User Manual

## What this is

The **Bundle Validation and Testing Framework** is a set of wrapper-repo tools that helps you check whether your enabled bundles are healthy **before** starting the game server.

It includes these commands:

- `npm run validate:bundles` — checks bundle filesystem structure
- `node util/validate-bundles.js --engine` — loads bundles through the engine (without starting telnet/transports)
- `node util/validate-bundles.js --engine --players` — also checks saved player attributes for compatibility
- `npm run bundles:test` — runs bundle-local `npm test` scripts when they exist
- `npm run bundles:test:contract` — runs wrapper-level contract tests

---

## What it is for

This tooling is for catching common integration problems early and deterministically, such as:

- a configured bundle folder being missing
- area folders missing `manifest.yml`
- empty `help/` content
- engine-time bundle load errors
- unknown persisted player attributes after bundle changes
- bundle test suite regressions (when bundle-local tests are available)

In short: it helps you answer, “Are my enabled bundles safe to ship and run?”

---

## Who would use it

Typical users include:

- **Maintainers** of this wrapper repository validating changes before merge
- **Bundle authors** checking compatibility against a real wrapper setup
- **CI pipelines / automation** that need machine-readable validation (`--json`)
- **Operators** preparing a deployment and wanting a fast preflight check

---

## Prototypical use case

### Scenario

You updated one or more bundles (or changed enabled bundle config) and want confidence that startup and persisted data compatibility are still okay.

### Files involved

- Config file (required):
  - `ranvier.conf.js` (preferred if present), or
  - `ranvier.json`
- Bundles directory:
  - `bundles/<bundleName>/...`
- Optional persisted player data:
  - `data/player/*.json` (via configured player entity loader)

### Typical command flow

Run from repository root:

1. **Fast structure validation**

   ```bash
   npm run validate:bundles
   ```

2. **Engine bundle-load validation (no transports/telnet startup)**

   ```bash
   node util/validate-bundles.js --engine
   ```

3. **Persisted player compatibility check**

   ```bash
   node util/validate-bundles.js --engine --players
   ```

4. **Strict mode for CI gate (treat unknown player attributes as errors)**

   ```bash
   node util/validate-bundles.js --engine --players --strict
   ```

5. **Run bundle-local tests when present**

   ```bash
   npm run bundles:test
   ```

6. **Run wrapper contract coverage**

   ```bash
   npm run bundles:test:contract
   ```

If all required steps pass, you have strong confidence in bundle integration health.

---

## Philosophy: why this exists and how it works

This framework is intentionally designed around a maintenance-first philosophy:

- **Deterministic and non-interactive**: safe for unattended runs and CI.
- **Layered checks**: start with low-cost filesystem checks, then engine load, then persistence compatibility.
- **Compatibility-aware**: checks are aligned with actual wrapper config and bundle loading behavior.
- **Minimal impact**: no telnet binding or server startup required for validation flows.
- **Actionable results**: findings include level (`warn`/`error`), a stable code, and contextual metadata.

### Findings model

Findings are structured objects with this shape:

```js
{ level, code, message, bundle?, area?, path?, detail? }
```

- `level` is either `warn` or `error`
- `error` findings cause non-zero exit status
- `warn` findings are informational unless upgraded (e.g., by `--strict` in players mode)

### Human output vs JSON output

- Default output: human-readable lines for local development
- `--json`: emits a JSON array only, making it easy for scripts/CI to parse

---

## Advanced usage

## 1) Machine-readable CI integration

Use JSON mode and fail on errors:

```bash
node util/validate-bundles.js --engine --players --strict --json
```

This supports policy automation such as:

- parse findings and annotate pull requests
- block deployment when any `error` finding exists
- trend warning/error counts over time

## 2) Choosing warning policy for player attributes

Unknown persisted player attributes are a compatibility signal.

- Use `--engine --players` during exploratory work to collect warnings.
- Use `--engine --players --strict` for release gating when you want hard failure.

## 3) Using wrapper and bundle tests together

A practical order for deeper validation:

```bash
npm run validate:bundles
node util/validate-bundles.js --engine --players --strict
npm run bundles:test
npm run bundles:test:contract
```

This gives broad coverage with quick failure for obvious breakage.

## 4) Scenario runner command sequences

`util/scenario-runner.js` boots the engine in no-transport mode, loads bundles, and runs a list of commands through the command manager using a real `Player` instance with a dummy socket for output capture. It is a lightweight smoke check for command parsing, movement, and command execution order without binding telnet or starting the full server.

### Usage

Run one or more command lines in order:

```bash
node util/scenario-runner.js --command "look" --command "north" --command "inventory"
```

Or store commands in a line-separated file (`#` comments and blank lines are ignored):

```text
# test/scenarios/smoke.commands
look
north
look
inventory
```

Then run:

```bash
node util/scenario-runner.js --commandsFile test/scenarios/smoke.commands
```

If your commands require a room context (for example `look`), specify a starting room:

```bash
node util/scenario-runner.js --room "rantamuta:start" --command "look"
```

Movement commands are supported directly (e.g., `east`, `e`, `north`, `up`) and use the room exits in the current area:

```bash
node util/scenario-runner.js --room "rantamuta:start" --command "east"
```

You can also emit player events explicitly using `--playerEmit:<event>`:

```bash
node util/scenario-runner.js --room "rantamuta:start" --playerEmit:move east
```

Legacy fallback builds a single command line:

```bash
node util/scenario-runner.js --command "look" --args "at statue"
```

JSON transcript output (structured events, no extra stdout):

```bash
node util/scenario-runner.js --room "rantamuta:start" --command "look" --json
```

### Output and exit behavior

- Writes a start banner to stdout:
  - `[info] scenario starting (commands=N)`
- For each command, writes a run line to stdout:
  - `[run] i/N: <raw command line>`
- If a command name is unknown, writes `Unknown command.` to the player output and continues.
- `--failOnUnknown` does **not** stop the run on the first unknown command. It marks the run as failed **after** all commands complete, setting `failed=1` and exiting with code 1 when any unknown commands occurred.
- When `--json` is present, stdout contains only JSON and engine log lines are captured as `type: "log"` events.
- Writes a completion line to stdout:
  - `[info] scenario complete (commands=N, unknown=U, failed=F)`
- Unknown flags are ignored.

### Common failure modes

- **Missing config**: `ranvier.conf.js` or `ranvier.json` not found at repo root.
- **Bundle load failures**: any bundle error during boot will abort the scenario.
- **Unknown commands**: command name not registered in the loaded bundles.
- **No commands provided**: empty command list after parsing flags and files.

## 5) Troubleshooting common failures

- **`CONFIG_NOT_FOUND`**
  - Add `ranvier.conf.js` or `ranvier.json` at repo root.
- **`BUNDLE_DIR_MISSING`**
  - Ensure bundle name in config matches `bundles/<name>/` exactly.
- **`AREA_MANIFEST_MISSING`**
  - Add `manifest.yml` under each area folder.
- **`ENGINE_LOAD_FAILED`**
  - Inspect stack trace in finding `detail` and fix bundle load issue.
- **`UNKNOWN_PLAYER_ATTRIBUTE`**
  - Either restore compatible attributes in bundles, migrate stored data, or run non-strict while planning migration.

---

## Quick start checklist

- [ ] Config file exists (`ranvier.conf.js` or `ranvier.json`)
- [ ] Enabled bundles are present under `bundles/`
- [ ] `npm run validate:bundles` passes
- [ ] `node util/validate-bundles.js --engine` passes
- [ ] `node util/validate-bundles.js --engine --players` reviewed (or strict-gated)
- [ ] `npm run bundles:test` completed
- [ ] `npm run bundles:test:contract` passes

When this checklist is green, you are in a good place to merge or deploy.
