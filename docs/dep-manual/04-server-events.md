# server-events/

## 1. Title
- **Topic:** server-events/
- **Ranvier package identity:** `rantamuta-core@1.0.0` from `node_modules/ranvier/package.json`; CommonJS top-level export via `index.js`.
- **Primary entry files for this topic:**
  - `node_modules/ranvier/src/BundleManager.js` (`loadBundle`, `loadServerEvents`)
  - `node_modules/ranvier/src/EventManager.js` (likely manager implementation used by `ServerEventManager`)
  - `node_modules/ranvier/src/GameServer.js` (startup/shutdown event emitter surface)

## 2. Status
- **binding:** informational
- **audience:** engine maintainers, agents
- **scope:** ranvier internal deep dive

## 3. What it is
`server-events/` is a bundle-level extension directory convention. During bundle load, scripts under `server-events/` export listener maps; each listener is instantiated with game state and registered into `state.ServerEventManager` by event name. This creates hooks intended to be attached to server lifecycle emitters.

## 4. Where it lives in ranvier
- Directory convention appears in `BundleManager.loadBundle` feature list as `'server-events/'`.
- Loader implementation is `BundleManager.loadServerEvents`.
- Event registry semantics are implemented by `EventManager` (`add`, `attach`, `detach`) and likely reused by `ServerEventManager` (exact constructor wiring is Unverified inside this package).
- Event emitter likely target is `GameServer` (`emit('startup')`, `emit('shutdown')`).

**Export surface**
- `BundleManager`, `EventManager`, and `GameServer` are exported via package root `index.js`.

## 5. How it works
- `loadBundle` detects `server-events/` existence and invokes `loadServerEvents`.
- `loadServerEvents`:
  1. Reads files in the directory.
  2. Filters by script file (`Data.isScriptFile`).
  3. Requires each module and resolves compatibility via `_getLoader(loader, srcPath)`.
  4. Reads `.listeners` object from module export.
  5. For each `[eventName, listenerFactory]`, registers `listenerFactory(this.state)` in `state.ServerEventManager.add(eventName, ...)`.

- `GameServer` itself emits `startup` and `shutdown` events from `start`/`shutdown` methods.

- Implicit behavior:
  - No validation for missing `.listeners` or non-function listener factories; runtime errors will occur when iterating/calling.
  - Event file basename is logged but not used as event key.

## 6. Public surface and invariants
- **APIs**
  - `BundleManager.loadServerEvents(bundle, serverEventsDir)`.
  - `EventManager` registry methods (if used for `ServerEventManager`).
  - `GameServer.start(commander)` and `GameServer.shutdown()` emit lifecycle events.

- **Required shapes**
  - Server event file export must provide `.listeners` object.
  - Each listeners entry must be a factory `listener(state) => function`.

- **Error behavior**
  - No explicit guards in loader; malformed exports produce generic TypeErrors during iteration/call.

- **Sync/async**
  - Loading/registration sync.
  - Listener execution semantics depend on attachment target and listener implementation.

- **Invariants**
  - `state.ServerEventManager` must expose `.add`.
  - Event names in listeners object are treated literally.

## 7. Internal integration contract
- **Expects**
  - Bundle contains optional `server-events/` scripts.
  - Shared state has `ServerEventManager`.
  - Runtime layer attaches manager listeners to an emitter (Unverified location in inspected files).

- **Provides**
  - A populated server event listener registry.
  - Hooks intended for lifecycle events (e.g., `startup`, `shutdown`) emitted by `GameServer`.

- **Coupling points**
  - Dynamic module loading in `BundleManager`.
  - Global manager singleton on state object.
  - EventEmitter integration via `EventManager.attach` pattern.

## 8. Performance characteristics
- Startup load cost is O(number of `server-events` files + total listeners defined).
- Listener registry memory grows with number of registered listeners.
- `EventManager.attach`/`detach` performance characteristics apply if `ServerEventManager` is an instance of `EventManager` (Unverified but likely).

## 9. Common failure modes
1. Missing `.listeners` property causes `Object.entries(undefined)` type failure.
2. Non-function listener factory causes crash on `listener(this.state)`.
3. Missing `state.ServerEventManager` or missing `.add` throws during registration.
4. If attachment step is skipped by host runtime, server events never fire despite successful loading.

## 10. Gotchas and footguns
- There is no dedicated validation/error message comparable to `input-events`; server-events failures are less diagnosable.
- Bundle path key is `server-events/` (with hyphen and trailing slash) and must match exactly.
- Event ordering across multiple files follows directory iteration order from `fs.readdirSync`, not explicitly sorted.

## 11. Security considerations
- Dynamic `require` of bundle `server-events/*.js` executes arbitrary code.
- Listener code receives full `state` object, so it can mutate global runtime state.
- No obvious use of `eval` in loader path.

## 12. Tests and reproduction
- **Tests in ranvier:** no dedicated `server-events` unit tests were found in `node_modules/ranvier/test/unit`.

### Suggested tests
1. Valid `listeners` export registers all event names.
2. Invalid export shape (missing listeners) yields explicit, bundle-scoped error.
3. Non-function listener factory errors are caught/reported with file context.
4. Integration test: attach `ServerEventManager` to `GameServer` and verify `startup`/`shutdown` listeners execute.

### Minimal reproduction (pseudocode)
```js
// bundles/example/server-events/lifecycle.js
module.exports = {
  listeners: {
    startup: state => function () { /* on boot */ },
    shutdown: state => function () { /* on stop */ },
  }
};

bundleManager.loadServerEvents('example', '/bundles/example/server-events/');
// later: state.ServerEventManager.attach(gameServer)
```

## 13. Operational guidance
- Add defensive logs in `loadServerEvents` before iterating listeners:
  - loaded file path
  - `typeof export.listeners`
  - each event name registered
- Runtime inspection:
  - `state.ServerEventManager.events` map keys.
  - `gameServer.eventNames()` after attach (if using EventEmitter API).
- Stack clues:
  - `Cannot convert undefined or null to object` near `Object.entries(eventsListeners)` indicates malformed export.

## 14. Maintainer TODOs
1. Add explicit validation and contextual errors in `loadServerEvents` (parallel to `loadInputEvents`).
2. Add unit tests for valid and invalid server-events exports.
3. Verify and document exact attach point from `ServerEventManager` to `GameServer` in codebase.
4. Consider deterministic file ordering for listener registration if ordering matters.
