# input-events

## 1. Title
- **Topic:** input-events
- **Ranvier package identity:** `rantamuta-core@1.0.0` with `index.js` CommonJS export and Node `>=22` requirement (`node_modules/ranvier/package.json`).
- **Primary entry files for this topic:**
  - `node_modules/ranvier/src/BundleManager.js` (`loadBundle`, `loadInputEvents`)
  - `node_modules/ranvier/src/EventManager.js`
  - `node_modules/ranvier/src/EventUtil.js`
  - `node_modules/ranvier/test/unit/BundleManagerInputEvents.js`
  - `node_modules/ranvier/test/unit/EventUtil.js`

## 2. Status
- **binding:** informational
- **audience:** engine maintainers, agents
- **scope:** ranvier internal deep dive

## 3. What it is
`input-events` is a bundle-loaded event hook surface for input pipeline integration. `BundleManager` loads handlers from `input-events/*.js`, validates each export shape, and registers built listeners into `state.InputEventManager` (an `EventManager`-style registry). `EventUtil` provides helper output writers used by input-event handlers for ANSI-aware socket writes.

## 4. Where it lives in ranvier
- Bundle feature mapping includes `input-events/` in `BundleManager.loadBundle`.
- Loader implementation: `BundleManager.loadInputEvents`.
- Generic event registry abstraction: `EventManager` (`add/get/attach/detach`).
- I/O convenience helper: `EventUtil.genWrite` and `EventUtil.genSay`.
- Test coverage:
  - invalid `event` export type error details (`BundleManagerInputEvents.js`)
  - ANSI parse behavior for write/say helper (`EventUtil.js`)

**Export surface**
- Topic modules are exported through root `index.js` via `require-dir('./src/')`.

## 5. How it works
- **Loader path**
  1. `loadBundle` checks `input-events/` existence.
  2. `loadInputEvents` reads directory, filters to script files (`Data.isScriptFile`).
  3. Per file: require module, call compatibility loader wrapper `_getLoader(loader, srcPath)`, and read `eventImport.event`.
  4. Enforce `typeof eventImport.event === 'function'`; otherwise throw with bundle + event name + actual type.
  5. Register realized listener with `this.state.InputEventManager.add(eventName, eventImport.event(this.state))`.

- **Event manager behavior**
  - `EventManager.add` stores listeners in `Map<string, Set<Function>>`.
  - `attach(emitter, config)` binds each listener to emitter context (`this` = emitter), prepending optional config argument.
  - `detach` can remove all listeners for a string, iterable set, or all known event names.

- **Defaults/implicit behaviors**
  - Loader assumes filename stem is event key.
  - Listener factory convention: input-event module exports `{ event: state => listenerFn }`.
  - `detach` removes all listeners on an event from emitter, including non-manager listeners (documented warning).

## 6. Public surface and invariants
- **APIs**
  - `BundleManager.loadInputEvents(bundle, inputEventsDir)`.
  - `EventManager.get/add/attach/detach`.
  - `EventUtil.genWrite(socket)` and `EventUtil.genSay(socket)`.

- **Call order/shape constraints**
  - Input event modules must provide callable `event` property after `_getLoader` resolution.
  - `event(this.state)` should return a function suitable for `EventEmitter.on`.
  - `EventManager.detach` accepts string/iterable; non-iterable throws `TypeError`.

- **Error behavior**
  - Invalid input event export throws explicit `Error` from loader.
  - `EventManager.detach` throws `TypeError` when `events` arg invalid.

- **Sync vs async**
  - Load and registration are synchronous.
  - Actual listener execution sync/async depends on listener implementation (unverified in this package).

- **Invariants**
  - `InputEventManager` must implement `.add`; loader directly calls it.
  - Event key uniqueness is `Set`-based per event name in `EventManager`.

## 7. Internal integration contract
- **Expects**
  - Bundle folder structure includes `input-events/` scripts.
  - Shared state object includes `InputEventManager` with `add` method (or EventManager-compatible instance).
  - EventEmitter instances to attach to are provided by higher-level runtime (not present in inspected files).

- **Provides**
  - Named input event listeners registered in manager.
  - Utility functions for colored socket output from input handlers.

- **Coupling points**
  - `BundleManager` + manager singleton (`InputEventManager`).
  - `EventUtil` depends on `Ansi.parse` and socket `.write`.

## 8. Performance characteristics
- Loading is O(number of files in `input-events/`).
- `EventManager.attach` complexity O(total listeners across registered events).
- `EventManager.detach` may call `removeAllListeners` for many events; this is broad and potentially expensive on emitters with heavy listener usage.
- Memory characteristics: `Map<event, Set<listener>>` retains listener references until manager dropped.

## 9. Common failure modes
1. Mis-exported input event (`event` not function) throws during bundle load and can halt startup.
2. Event factory returns non-function listener; this is not validated in loader and will fail later at attach time.
3. Calling `EventManager.detach` with object/non-iterable events argument throws `TypeError`.
4. `detach` can unintentionally remove third-party listeners because it uses `removeAllListeners(event)`.

## 10. Gotchas and footguns
- Error message for invalid export is strong and tested; keep this stable if tooling parses it.
- `_getLoader` supports legacy function exports; both object and function module forms are accepted.
- `EventUtil.genSay` appends CRLF (`\r\n`) explicitly, which may matter on non-telnet transports.

## 11. Security considerations
- Dynamic `require` of bundle scripts executes arbitrary code at startup.
- Input handlers likely process untrusted user input, but actual parsing/dispatch path is **Unverified** in `node_modules/ranvier` because no direct dispatcher usage of `InputEventManager` was found in inspected files.
- No `eval` usage found in this topic files.

## 12. Tests and reproduction
- `test/unit/BundleManagerInputEvents.js`: verifies invalid `event` export errors include bundle name, event name, and received type.
- `test/unit/EventUtil.js`: verifies ANSI parsing and newline behavior for helper writers.

### Suggested tests
1. Valid input-event file registers handler in manager with filename stem key.
2. Loader handles legacy function export + object export consistently.
3. `EventManager.attach` binding semantics (`this === emitter`, config argument prepended).
4. `EventManager.detach` removing string vs iterable vs all events.
5. Failure when factory returns non-function listener (attach-time assertion).

### Minimal reproduction (pseudocode)
```js
// input-events/login.js bundle file
module.exports = {
  event: state => function (socket, args) { /* listener */ }
};

// during load
bundleManager.loadInputEvents('my-bundle', '/bundles/my-bundle/input-events/');
state.InputEventManager.attach(socketEmitter, { state });
```

## 13. Operational guidance
- Add logs in `BundleManager.loadInputEvents` for `eventName` + module shape before registration.
- At runtime inspect `state.InputEventManager.events` (`Map`) to verify loaded handlers.
- If event detach side effects appear, inspect whether `detach` was called without event filter.

## 14. Maintainer TODOs
1. Add validation that `event(this.state)` returns a function.
2. Add tests for successful input-event registration path (not only failure path).
3. Consider safer detach strategy that removes manager-owned listeners only.
4. Document expected invocation context for input-event listeners in code comments/tests.
