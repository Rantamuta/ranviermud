# channels

## 1. Title
- **Topic:** channels
- **Ranvier package identity:** `rantamuta-core@1.0.0`, CommonJS entry `index.js`, Node engine `>=22` (`node_modules/ranvier/package.json`).
- **Primary entry files for this topic:**
  - `node_modules/ranvier/src/BundleManager.js` (`loadChannels`)
  - `node_modules/ranvier/src/Channel.js`
  - `node_modules/ranvier/src/ChannelManager.js`
  - `node_modules/ranvier/src/ChannelAudience.js`
  - `node_modules/ranvier/src/WorldAudience.js`
  - `node_modules/ranvier/src/PrivateAudience.js`
  - `node_modules/ranvier/src/PartyAudience.js`
  - `node_modules/ranvier/src/RoleAudience.js`

## 2. Status
- **binding:** informational
- **audience:** engine maintainers, agents
- **scope:** ranvier internal deep dive

## 3. What it is
Channels are message broadcast abstractions with pluggable audience selection and formatting. Bundles provide channel definitions (from `channels.js`), which are registered in `ChannelManager` and later used to deliver channel traffic to sender and targets, including channel receive events emitted on recipients.

## 4. Where it lives in ranvier
- Feature registration: `BundleManager.loadBundle` includes `channels.js`.
- Loading/registration: `BundleManager.loadChannels`.
- Runtime channel behavior + error classes: `Channel.js`.
- Registry and alias lookup: `ChannelManager.js`.
- Audience base and built-ins:
  - `ChannelAudience` (all players by default)
  - `WorldAudience`
  - `PrivateAudience`
  - `PartyAudience`
  - `RoleAudience`

**Export surface**
- Exported through package root `index.js` (`require-dir('./src/')`), so all classes are reachable via root module object keys.

## 5. How it works
- `BundleManager.loadChannels` requires `channels.js`, accepts object or array, stamps `channel.bundle`, and registers each via `state.ChannelManager.add`.
- `ChannelManager.add` indexes by canonical name and aliases to same channel object.
- Sending flow (`Channel.send`):
  1. Validate non-empty message and valid audience.
  2. `audience.configure({state, sender, message})`.
  3. Resolve targets via `audience.getBroadcastTargets()`.
  4. Special-case errors: private with no target => `NoRecipientError`; party with no party targets => `NoPartyError`.
  5. Let audience mutate message (`alterMessage`), then format sender/targets.
  6. Emit `channelReceive` on each target with stripped-color raw message.

- Defaults/implicit behavior:
  - Default formatter uses `formatToSender` for both sender and recipient.
  - `colorify` applies tag wrappers; if color is array, close tags use reversed order (array mutation via `reverse()`).
  - Base audience `getBroadcastTargets` returns all players from `PlayerManager`; `WorldAudience` excludes sender.

## 6. Public surface and invariants
- **Primary APIs**
  - `BundleManager.loadChannels(bundle, channelsFile)`.
  - `Channel` constructor with required `name` and `audience`.
  - `Channel.send(state, sender, message)`.
  - `ChannelManager.get/add/remove/find`.
  - Audience contract: `configure`, `getBroadcastTargets`, optional `alterMessage`.

- **Required shapes/call order**
  - Channel definition must include `.name` and `.audience` or constructor throws.
  - `Channel.send` assumes `message` string supports `.length` and `.replace`.
  - Audience implementations depend on `configure` being called before `getBroadcastTargets`.

- **Errors**
  - Constructor: throws on missing name/audience.
  - `send`: throws `NoMessageError`, `NoPartyError`, `NoRecipientError`, or generic error for invalid audience.

- **Sync/async**
  - Entire path is synchronous.

- **Invariants**
  - Registered aliases map directly to same channel instance.
  - `channelReceive` event consumers receive color-stripped `rawMessage`.

## 7. Internal integration contract
- **Expects**
  - `state.ChannelManager` registry.
  - `state.PlayerManager` with `getPlayersAsArray`, `filter`, and `getPlayer` used by built-in audiences.
  - `Broadcast` module (`sayAt`, `sayAtFormatted`).

- **Provides**
  - User-facing channel output on sockets via broadcast calls.
  - `channelReceive` events on all targets.

- **Coupling points**
  - Shared manager singleton (`ChannelManager`).
  - Audience classes depend on player/party role state.

## 8. Performance characteristics
- `ChannelManager.find` is linear scan over `Map` entries.
- `Channel.send` target fanout cost is O(number of recipients).
- Private audience lookup likely O(1)-ish depending on `PlayerManager.getPlayer` implementation (unverified here).
- No caching in channel core; repeated formatting allocates strings per message.

## 9. Common failure modes
1. Missing message causes `NoMessageError`.
2. Private channel without valid target token causes `NoRecipientError`.
3. Party channel used while not in party causes `NoPartyError`.
4. Audience implementation forgetting to return array-like from `getBroadcastTargets` breaks broadcast/iteration assumptions.
5. `ChannelManager.remove` removes only canonical name; aliases remain mapped (stale alias risk).

## 10. Gotchas and footguns
- `colorify` mutates `colors` array via `reverse()`. When `this.color` itself is an array, `open` and `close` sequencing may be surprising across calls.
- Recipient formatter method name is misspelled `formatToReceipient` (publicly referenced internally).
- Alias collisions in `ChannelManager.add` silently overwrite previous entries.
- `Channel.send` strips tags using regex `/<\/?\w+?\>/gm`; non-word tag names or malformed tags are not handled.

## 11. Security considerations
- Channel traffic is user input; output formatting includes tag parsing downstream (`Broadcast`/ANSI layer), so sanitization expectations matter.
- No direct `eval` or unsafe deserialization in channel classes.
- Dynamic `require` of `channels.js` executes bundle-provided code when loading channels.

## 12. Tests and reproduction
- **Tests in ranvier:** no channel-focused unit tests found under `node_modules/ranvier/test/unit`.

### Suggested tests
1. `Channel.send` throws each custom error in correct scenarios.
2. Alias registration/removal behavior in `ChannelManager` (including stale alias case).
3. `PrivateAudience.alterMessage` with single-token input (empty message after target).
4. `colorify` behavior for array colors across repeated sends.
5. `channelReceive` gets raw message without color tags.

### Minimal reproduction (pseudocode)
```js
const chan = new Channel({ name: 'chat', audience: new WorldAudience(), color: 'cyan' });
state.ChannelManager.add(chan);
chan.send(state, senderPlayer, 'hello world');
// sender gets formatted self message, others get target format + channelReceive event
```

## 13. Operational guidance
- Log points:
  - `BundleManager.loadChannels` for what bundle registered each channel.
  - `Channel.send` before and after audience resolution (`targets.length`, altered message).
- Runtime inspection:
  - `state.ChannelManager.channels` map keys (names + aliases).
  - Audience object `state/sender/message` after `configure`.
- Stack clues:
  - `Channels must have a name to be usable.` => invalid channel config export.
  - `Channel <name> is missing a valid audience.` => misconfigured bundle channel.

## 14. Maintainer TODOs
1. Fix `ChannelManager.remove` to clean aliases too (compatibility-reviewed).
2. Add unit tests for channel send and audience behaviors.
3. Consider immutable handling in `colorify` to avoid mutation surprises.
4. Add validation of channel config shape during load for clearer startup errors.
