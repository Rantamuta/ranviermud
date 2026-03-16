![Rantamuta Sand Castle](https://avatars.githubusercontent.com/u/259600333?s=200&v=4)

# Rantamuta Mud engine

**Rantamuta/ranviermud** is a modern upgrade of the [**RanvierMUD/ranviermud**](https://github.com/RanvierMUD/ranviermud) engine. The repo name is kept for compatibility.

At this point, one should be able to clone this repository, run `npm install`, `npm run init`, followed by `npm start`, and have a working MUD. You can log in using a telnet client with `telnet 127.0.0.1 4000`. This assumes Node.js 22+ is installed.

The v1.0 release is intended to be a **pure maintenance upgrade**: updating the runtime to modern Node.js, adding CI via GitHub Actions, fixing long-standing crashes and sharp edges, and restoring a reliable out-of-the-box experience. There is no engine redesign and no intentional change to the core architecture.

If any of the original contributors would like this work merged upstream, please do reach out. I'm happy to help.

## v1.0 Maintenance Checklist

This is a checklist outlining the scope of this work and the current status.

### v1.0 Release prep

* [x] Release `ranvier` (core) v1.0
* [x] Release `ranvier-datasource-file` v1.0
* [x] Release `ranvier-telnet` v1.0
* [x] Pin releases in `package.json`
* [x] Update `package.json` metadata fields like `version`
* [x] Update CHANGELOG release info

### Runtime & Tooling

* [x] Upgrade runtime target to Node.js 22+
* [x] Remove legacy Node version constraints
* [x] Establish deterministic installs (`npm ci`, modern lockfile)
* [x] Add GitHub Actions CI

### Boot & Playability

* [x] Server boots successfully on a clean clone
* [x] Telnet networking works out of the box
* [x] User can log in and create an account
* [x] User can create/select a character
* [x] User can reach the game world and execute basic commands (`look`)

### Stability & Error Handling

* [x] Add smoke tests that catch regressions in boot/login/play flow
* [x] Add scenario tests for crafting, NPC dialog, and quest completion (npm test)

### Dependencies

* [x] Fix manifest version placeholders (e.g., `optimist`, `sty`)
* [x] Capture `npm audit` advisory data in CI (artifact only)
* [x] Remove or replace legacy CLI parser (`optimist`)
* [x] Upgrade `semver` to a non-vulnerable modern version
* [x] Address `git-url-parse` critical vulnerabilities (upgrade or replace)
* [x] Establish a clean install baseline (no critical vulnerabilities on `npm install`)
* [x] Audit and modernize remaining dependencies incrementally

#
## Verb-local syntax prototype CLI

This repository includes an exploratory CLI harness for evaluating verb-local syntax matching behavior without wiring into the production runtime parser/dispatcher flow.

Run it with one player-input example:

```bash
npm run syntax:cli -- "say hello there to bob"
```

The CLI always prints pretty JSON that includes the resolved verb, outcome (`success`, `ambiguous`, or `nonViable`), selected rule when available, and deterministic artifact details from the prototype matcher/resolver.

## Documentation

* [x] Clarify project scope and intent (this README)
* [x] Document baseline bundle set and expected layout
* [x] Document CI and smoke test expectations

---

## Node.js-based MUD engine

Ranvier is a [MUD](https://en.wikipedia.org/wiki/MUD) game engine whose goal is to be a simple but powerful way to build whatever MUD you want with special care given to extensibility. The core code strives to be completely unopinionated toward any specific style of game while using the bundle system to build the game you want without having to dig through the engine's code.

## Special Features

* Robust bundle system: Nearly every aspect of the game can be modified without changing the core and allows for easy
  packaging and sharing of commands/areas/items/npcs/channels/behaviors
* Unopinionated network layer: easily swap out telnet for any network layer you like. No need to gut the whole codebase
  just to support a different transport type, just drop in a file.
* Customizable data layer: You are not tied to saving in any particular database or file storage sytem
* Optional coordinate based room system allowing for the flexibilty of a standard MUD world with the easy mappability of
  a strict 3D world.
* Scripting for all entities in the game for any event along with behaviors to create shared, composable scripts
* Skill system with passive/active skills
* Effects e.g., buffs/debuffs
* Quest system allowing for starting/progress/completion from any event in the game
* Communication channels with custom audiences


## Verb-local syntax prototype CLI

This repository includes an exploratory CLI harness for evaluating verb-local syntax matching behavior without wiring into the production runtime parser/dispatcher flow.

Run it with one player-input example:

```bash
npm run syntax:cli -- "say hello there to bob"
```

The CLI always prints pretty JSON that includes the resolved verb, outcome (`success`, `ambiguous`, or `nonViable`), selected rule when available, and deterministic artifact details from the prototype matcher/resolver.

## Documentation

Ranvier prides itself on having thorough documentation which is available on our website: [ranviermud.com](https://ranviermud.com)
Baseline bundle set and expected layout: [docs/BaselineBundles.md](docs/BaselineBundles.md)

## Slack

We have a Slack channel you can use to ask questions, suggest features, or just keep up to date with the project: [https://ranviermud.slack.com](https://ranviermud.slack.com)

[Get an invite](https://join.slack.com/t/ranviermud/shared_invite/enQtODA1NTI4MTc5MjgyLWU1OTI2YTYxMTcwYTBjNmIyMzhmMWZmNTQ3ZmFiMWEwYjQ5N2MyYWQzODFhZDUwNmZiODE1ODVlNWE5NTlmYzU)

## Requirements

* [Node.js](https://nodejs.org) >= v22.0.0

## Demo

Point your favorite client or telnet to `ranviermud.com` port 4000. This demo server is wiped and updated from the `master` branch every hour.
