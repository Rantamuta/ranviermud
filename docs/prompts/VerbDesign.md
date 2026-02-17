# Verb Design Guide for Designers

This document is for **designers** authoring new in-game verbs in `bundle-rantamuta`. You do not need to be an engineer to use it, but you do need to be precise about what the verb should mean.

A verb here is not “a file that prints text.” A verb is a small, predictable contract with the engine:

* **The player types something.**
* The system **figures out what they meant** (which objects they referred to).
* The system **checks whether it is allowed.**
* The verb **plans** what would change.
* The system **commits** the change safely, or as it's often referred to, the *game state* is *mutated*.
* Then the system **renders output**.

That phase separation is the reason verbs stay understandable and testable over time.

---

## Sources of truth

If you only read two deeper docs, read these:

* `docs/normative/CommandArchitecture.md` (the phase model, who is allowed to do what, and when)
* `docs/normative/EntityResolution.md` (how “the bronze clapper” becomes a specific object in the world)

---

## First, a word about grammar

When we talk about `direct`, `indirect`, and `relation`, we are naming the **roles parts of the sentence play** so the system can bind them consistently.

Think in terms of: who is acting on what, and how they are connected.

### Direct object

The **direct object** is the primary thing the verb acts on.

* `take clapper`
  → *clapper* is the direct object.
* `read plaque`
  → *plaque* is the direct object.

In engine terms: this fills the `direct` role. If your rule includes `direct`, the resolver must bind exactly one entity into that slot.

### Indirect object

The **indirect object** is a secondary participant, usually introduced by a preposition.

* `give coin to beggar`
  → *coin* is direct, *beggar* is indirect.
* `put clapper in bell`
  → *clapper* is direct, *bell* is indirect.

In engine terms: this fills the `indirect` role. It only exists when you choose a rule such as `indirect` or `directIndirect`.

### Preposition (relation key)

The **preposition** is the connective word that explains how the objects relate.

* `in`
* `on`
* `from`
* `with`
* `to`
* `into`
* `onto`
* `off`
* `over`
* `under`

In `put clapper in bell`:

* `clapper` → direct
* `bell` → indirect
* `in` → preposition

In the engine, we call this the **relation key**. If your verb supports relations, you must explicitly declare which prepositions are accepted.

The system preserves exactly what the player typed, but also normalizes it to a canonical form for logic. That lets you decide whether `in` and `into` are treated as the same action or meaningfully different.

### Transitive and intransitive verbs

A **transitive** verb requires an object. It does something *to* something.

* `take clapper`
* `read plaque`
* `put clapper in bell`

All of these are transitive because they require at least one bound object. In engine terms, any rule that includes `direct`, `indirect`, or `directIndirect` is transitive.

An **intransitive** verb does not require an object. It stands on its own.

* `rest`
* `wait`
* `sing`

In engine terms, this corresponds to the `intransitive` rule form. If a player supplies extra words to a strictly intransitive verb, that form should fail predictably.

When designing a verb, decide up front whether it must bind objects to make sense. If it cannot stand alone, it is transitive. If it can, and you want to allow that shape, declare it intransitive explicitly.

### examples

* `intransitive` : "sing" is an example of an intransitive verb: no direct nor indirect object
* `direct` : "sing a lullaby" - one direct, the *lullaby*
* `indirect` : "sing to the baby" - one indirect, the *baby*
* `directIndirect` : "sing a lullaby to the baby" - the direct is the *lullaby* and the indirect is the *baby*

There is a rare one, used for when you might want to enable input like "get over", "move on", "keep off":

* `relationOnly` - "keep off"

### Why this matters

When designing a verb, be explicit about the grammatical shape:

1. Does it act on one thing only?
   → Use `direct`.

2. Does it require a second thing connected by a preposition?
   → Use `directIndirect` or `indirect`.

3. Does the preposition change meaning?
   → Declare accepted prepositions deliberately.

Matching the input to these rules is how the engine knows to return "You can't put a bear in a mailbox!" rather than just "What?"

## The mental model

### A verb is a promise about meaning

When you design a verb, you are defining:

1. **What forms of input are valid**
   Example: `take clapper` is valid. `take` alone might be valid or might not be.

2. **What kinds of targets it can bind**
   Example: `go` binds exits. `take` binds items and maybe room details.

3. **What is allowed vs not allowed**
   Example: “You can’t take the prayer stone” is a game design decision (allowed/denied), not a parsing decision.

4. **What changes in the world on success**
   Example: “Item moves from room to inventory.”

5. **What the player sees** on success and failure
   Example: “You take the clapper.” or “You cannot take that.”

The engine requires this separation so behavior stays deterministic and composable.

---

## The phases

You will see references to phases 0–6. Here is what they mean in plain terms.

### Phase 0: Receive Input

The player typed something. The system picks the verb by **exact name or exact alias**. No prefix guessing.

### Phase 1: Entity Resolution

The system binds words to concrete things in the world. This phase is **read-only** and **output-free**. It is not allowed to change the world or print messages. This is where "sing lullaby to baby" might search the room, the containers in the room, even the player inventory for the lullaby and the baby.

### Phase 2: Capture

This is the "veto" phase, where designers get to stop the action. Maybe the room is dark, or the area is stormy, or the stars are not aligned, or the player is too drunk. The world, then the quest system, then the area, then the room and then finally the player objects all get a chance to see the action and send back a "Nope". That's all they are allowed to do at this stage. The first deny wins. Assuming the command passes the gauntlet, we move to...

### Phase 3: Plan

This is the main phase where the verb assigns instructions to the queue. We don't want to make changes just yet, but this is where the changes are decided. This is “the verb script” in bundle terms. It is a **planner**. It decides: given the bound targets and context, do we succeed, and if so what mutation plan should be committed. No direct mutation here. Depending on the verb, the target objects might get a chance to override the default behavior and default success message of the verb.

### Phase 4: Bubble

Reactions. "The audience gasps."  "The sky goes dark." Other entities can add extra narrative. They cannot veto and they cannot change the game state. But first the target objects get a chance to comment: "The sword glows." Then the player gets to comment on the action: "Your stomach rumbles!" Then the room: "The lights flicker!" Then the quest: "Not yet, chief. But close. So, so, close!" Then the world: "And the moon became as blood."

### Phase 5: Commit

The mutation plan is applied atomically, all or rollback. This is the "mutation" phase, where game state is changed.  The reason that we take such care is that if any code anywhere just injects any old random changes to anywhere from anywhere, then effects clash and there could be errors.  For instance, if we were to copy an object into the room from a player's inventory, and then the deletion from the inventory were stopped, there would be two items.

### Phase 6: Render/Dispatch

Only after a successful commit do we narrate success. We broadcast messages to the player, the room, targets, and the area. Failure messages are also owned here, via stable failure codes mapped to text.

---

# 1) Agent Prompt Template

Use this as copy/paste for an implementation agent. Your job is to fill in the blanks with clear intent and unambiguous constraints.

A key idea: you are not describing code. You are describing a **semantic contract** that code must implement.

```md
Implement a new bundle-layer verb:

verbId: 
aliases:
rules: // choose at least one of `intransitive / direct / indirect / directIndirect / relationOnly`
relationship keys: // e.g. in, on, near, under, out


## Hard constraints

- Code in the bundle-layer only (`bundles/bundle-rantamuta/**`)
- The only directories that should be needed for this task are:
  - `commands/`
  - `lib/`
  - `tests/`
  - If you find it necessary to touch files in any other directory, STOP and describe the problem.
- For verb implementation tasks, `areas/**` is out of scope.
- If behavior appears to require `areas/**` changes, STOP and request a separate content task.
- CommonJS style
- Do not modify engine internals (`node_modules/ranvier/**`)
- Keep changes small and reviewable
- Command lookup semantics are exact-key only (command name or explicit alias)


## Mandatory preflight (print before coding)
```

### How to choose the right “rule” form

Rules describe the grammatical shape the verb accepts. These are not “nice to have,” they are how Entity Resolution knows what to bind.

* `intransitive`
  No targets. Example: `rest`, `sing`, `look` (bare).

* `direct`
  One target. Example: `take clapper`, `read plaque`.

* `indirect`
  Relation + one target. Example: `pray at altar` (depending on your relation design).

* `directIndirect`
  Direct target + relation + indirect target. Example: `put clapper in bell`.

* `relationOnly`
  Requires a relation token but no object role targets. Example: “keep off” style commands where the relation word is the meaning.

**Relation-bearing forms must declare `acceptedRelations`** per rule (for `indirect`, `directIndirect`, `relationOnly`). Missing that is a compile-time error by design.

### What “relationship keys” means in practice

This is your verb’s controlled vocabulary for relation words.

Example for `put`:

* accepted relations might include: `in`, `into`, `on`, `onto`
  Entity Resolution preserves what the player typed (`relationTokenRaw`) but also produces a canonical relation (`relationTokenCanonical`) so logic does not accidentally treat “in” and “into” as different actions unless you truly want that.

---

## Preflight tables: what they are really doing

These tables are not busywork. They are a way to force all hidden ambiguity into the open before anyone writes code.

### Verb semantic contract

Print this table and fill every row with `KNOWN` or `UNKNOWN`:

| Field                                                                     | Status | Value/Notes |
| ------------------------------------------------------------------------- | ------ | ----------- |
| verbId                                                                    |        |             |
| aliases                                                                   |        |             |
| supported rule keys                                                       |        |             |
| relation-bearing rules                                                    |        |             |
| acceptedRelations per relation rule                                       |        |             |
| scopeProfile.direct                                                       |        |             |
| scopeProfile.indirect                                                     |        |             |
| nested traversal policy (if any)                                          |        |             |
| planner failure codes                                                     |        |             |
| message mapping ownership (`metadata.errorMessages`)                      |        |             |
| expected success outcome                                                  |        |             |
| success narration contract (required, unless explicitly silent)           |        |             |
| success label source policy (`directSpan`/`indirectSpan` vs entity names) |        |             |
| expected failure behavior                                                 |        |             |
| output expectation for every non-empty input                              |        |             |
| ambiguity and indistinguishable resolution behavior confirmation          |        |             |
| failure-output matrix (`code -> renderer/dispatch mapping ownership`)     |        |             |

Definitions:

* **scopeProfile.direct / scopeProfile.indirect**
  scope means all of the boxes that the verb will check when trying to find the item that the player is referring to, and profile refers to the *order* it should check them
  “Where do we look for the thing the player named?”
  Typical scopes: player inventory, room items, room details, room exits. The order matters because it is tie-breaking precedence.

* **nested traversal policy**
  “If the room has a chest and the chest contains an item, are we allowed to match it?”
  If yes, it must be bounded and deterministic. Entity Resolution supports bounded breadth-first traversal with cycle protection.

* **planner failure codes**
  These are stable symbolic reasons for failure, like `TARGET_NOT_FOUND`, `FORM_NOT_SUPPORTED`, `AMBIGUOUS_TARGET`. The resolver owns some codes, the planner owns others. Your verb must decide what additional planner-owned failures exist.

* **success narration contract**
  Describe the player-facing story on success. Be explicit: is it silent, one line, or multiple lines. Also note who should see it: self only, room, target, and so on.

* **label source policy**
  Do we echo the player’s words (spans) or do we use the entity’s canonical display name. This matters for immersive correctness.

* **ambiguity vs indistinguishable**
  If two candidates differ in visible ways, the resolver returns ambiguity. If they are indistinguishable to the player, the resolver deterministically auto-picks. This is a designed behavior, not an accident.

### Implementation support audit

Print this table and fill every row with `KNOWN` or `UNKNOWN`:

| Field                                       | Status | Value/Notes |
| ------------------------------------------- | ------ | ----------- |
| required tests list                         |        |             |
| mutation instruction types needed           |        |             |
| mutator support exists for each instruction |        |             |

Designer translation:

* “What needs to be proven with tests?”
* “What kinds of world changes does this verb require?”
* “Do those world changes already exist as mutator instructions, or are we inventing a new one?”

---

## Preflight gate

* If any required row is `UNKNOWN`, STOP and ask focused questions.
* Do not edit files until all required rows are `KNOWN`.

This is what keeps verbs from turning into “we guessed what the designer meant.”

---

## STOP conditions (must halt and ask)

These are the common failure modes where the agent would otherwise improvise, which is exactly what we do not want.

1. Missing/ambiguous `verbId` or aliases.
2. Missing rule keys, or zero rule keys.
3. Relation-bearing rule without explicit rule-level `acceptedRelations`.
4. Missing per-role scope policy.
5. Mutation semantics not explicit.
6. Failure codes or message-mapping ownership not explicit.
7. Unclear expected committed outcome for happy path.
8. Success narration contract is missing or ambiguous.
9. Ambiguity and indistinguishable resolution behavior not explicitly confirmed.
10. Proposed edits include `areas/**` files for a verb implementation task.

---

## Implementation requirements

These requirements are written as engineering constraints, but they exist to protect your design intent:

1. **Command metadata must declare keyed `entityResolution.rules`.**
   This is how the system knows what shapes your verb accepts.

2. **Command must consume `context.entityResolution`; no ad hoc matching inside command.**
   Otherwise different verbs invent different targeting rules and the game becomes inconsistent.

3. **Command returns envelope only:**

   * success: `{ ok: true, plan }`
   * failure: `{ ok: false, error: { code, details? } }`

4. **Mutations occur only through mutator/commit path.**
   Ensures rollback safety and predictable hooks.

5. **Resolver/capture remain read-only and side-effect free.**

6. **Player-facing failure text emitted by dispatch via code mapping.**
   The resolver returns codes, it does not talk to the player.

7. **Non-empty input must yield player-visible output.**
   Even if the action fails, the player should see something.

8. **No mutation of `context` or entities during planning.**

9. **`render.instructions` is delivery-only dispatch data (not mutation).**

10. **Bubble contributions may include render data only; bubble must not return mutation operations.**
    This is the normative model. (If the implementation currently allows more, treat that as legacy and keep new verbs clean.)

11. **If using `planDirect` / `planIndirect`, those contributions are advisory data only.**
    No veto, no mutation, no direct output.

---

## Tests required

The test list is not about code coverage. It is about proving your verb’s player-facing semantics are stable:

* rule/form outcomes and errors
* intransitive offramp (if applicable)
* relation raw/canonical behavior (if relation-bearing)
* scope precedence and deterministic tie behavior
* ambiguity vs indistinguishable auto-pick (if applicable)
* resolver has no mutation/output side effects
* dispatch integration path for this verb (`resolve -> capture -> plan -> commit -> render`)
* happy-path success rendering assertions

Note: “ambiguity vs indistinguishable” is an explicit part of the resolver contract. If you design a verb that can commonly hit ambiguous targets, you should expect to design how that feels.

---

## Validation

Run and report:

* `cd bundles/bundle-rantamuta && npm test -- --runInBand`
* `npm test`
* `npm run ci:local` (if blocked, report exact blocker output)

---

## Deliverable report format

1. Files changed
2. Behavior implemented mapped to phases 0–6
3. Tests added/updated
4. Test results
5. Assumptions made beyond preflight inputs
6. Deferred items and reason

As a designer, that report is your audit trail: it tells you whether your semantic contract was actually implemented.

---

# 2) Implementation Skeleton

You do not need to write this, but you should recognize the pieces so you can sanity-check that the implementation matches your design.

```js
'use strict';

module.exports = {
  name: '<verbId>',
  aliases: [/* ... */],
  command: state => ({
    metadata: {
      entityResolution: {
        rules: {
          // intransitive / direct / indirect / directIndirect / relationOnly
        },
      },
      errorMessages: {
        // CODE: 'Player-facing text'
      },
    },

    execute: (args, player, alias, context) => {
      const er = context && context.entityResolution;
      if (!er) {
        return { ok: false, error: { code: 'FORM_NOT_SUPPORTED' } };
      }

      // planner-only:
      // - consume resolved bindings from er
      // - validate
      // - build mutation plan
      // - attach render payload/instructions as needed

      return {
        ok: true,
        plan: [
          // mutator instructions only
        ],
        render: {
          // lines: [ ... ], // info commands only
          // instructions: [ ... ], // delivery-only
        },
      };
    },
  }),
};
```

### How to read this as a designer

* `metadata.entityResolution.rules` is where your “allowed command shapes” live.
* `metadata.errorMessages` is where stable failure codes become player text. This is phase 6 ownership, not phase 1 ownership.
* `execute` is the planner: it consumes the resolver’s bindings and produces a plan, or fails with a code.

---

# 3) Human Review Checklist (Designer Edition)

Use this when reviewing a verb design or a PR. It is phrased as “what to verify,” not “how to code.”

### Design the verb clearly up front

* [ ] Decide verb name and explicit aliases.
* [ ] No prefix matching assumptions.
* [ ] Declare supported rule keys as keyed rule objects.
* [ ] If relation-bearing, declare accepted relations.
* [ ] Define per-role resolver scope order intentionally.

### Respect phase boundaries

* [ ] No re-parse or re-resolve in the command.
* [ ] Plan returns envelope only (`ok true plan` or `ok false error`).
* [ ] No direct world mutation in the command.
* [ ] Verb implementation PR touches only `commands/`, `lib/`, and `tests/` (no `areas/**` edits).
* [ ] Capture checks are read-only.
* [ ] Bubble is non-veto, render contribution only.
* [ ] Resolver emits structured results, not player text.
* [ ] Every non-empty input yields visible feedback.

### Make outcomes predictable

* [ ] Stable failure codes defined.
* [ ] Player-facing text mapped in `metadata.errorMessages`.
* [ ] Success narration contract is explicit.
* [ ] Label policy is deterministic.
* [ ] New mutation types, if needed, are mutator instructions with rollback support.
* [ ] If using `planDirect` / `planIndirect`, contributions are data-only and command-validated.

### Test at the right levels

* [ ] Plan-phase unit tests (success + failure).
* [ ] Resolver tests (rule matching, failure behavior, scope order).
* [ ] Relation normalization tests (if relation-bearing).
* [ ] Ambiguity/disambiguation tests (if applicable).
* [ ] Integration test across full dispatch pipeline.
* [ ] Success output assertions and state-change assertions.

### Verify stability

* [ ] `cd bundles/bundle-rantamuta && npm test -- --runInBand`
* [ ] `npm test`
* [ ] `npm run ci:local` (or exact blocker output documented)

---

## Small designer example: designing `place` as a nicer `put`

If you were designing `place`:

* **Rules**: `directIndirect` (place X in Y), maybe also `direct` (place X) if you want an intransitive-style default behavior.
* **Accepted relations**: `in/into/on/onto` (explicitly).
* **Direct scope**: player inventory first (you can only place what you have).
* **Indirect scope**: room items then player inventory (depending on whether you allow placing into a carried container).
* **Success outcome**: transfer item from player inventory to container.
* **Failure codes**: unsupported relation, not found, ambiguous, container full, container closed, etc.
* **Success narration**: one clear line to actor, one to room.

That is the level of clarity the preflight tables are trying to force, before an agent writes a single line.

---

If you want this to feel even more designer-facing, the next step would be to add a one-page “choose your verb shape” flowchart and a couple of fully worked examples (like `take`, `put`, `go`, and a pure “info” verb).
