# Verb creation checklist

## Design the verb clearly up front

* [ ] Decide exactly what this verb is called, what short forms it supports, and what players are allowed to type.
* [ ] Do not rely on partial matches. If you want a shorthand, declare it explicitly.
* [ ] Define the supported grammatical shapes as named rule types like `direct` or `directIndirect`, not as an ordered list.
* [ ] If the verb uses a preposition like “in” or “on”, explicitly declare which prepositions are valid.
* [ ] Define where the resolver should search for targets for each role such as direct object and indirect object, and make the search order intentional and stable.

## Respect the phase boundaries

* [ ] Do not re-parse player input inside the command. Use the already-resolved bindings from `context.entityResolution`.
* [ ] The Target phase must only build a plan or return a structured failure. It must not modify the world.
* [ ] The command must never directly change game state.
* [ ] Capture logic must only check conditions using already-bound entities. It must not search or re-resolve.
* [ ] Bubble reactions may add to the plan but must never veto or cancel the action.
* [ ] The resolver must never emit player-visible output. It returns structured success or failure only.
* [ ] Every non-empty player input must result in visible feedback, whether success, failure, or unknown command.

## Make success and failure predictable

* [ ] Define error codes and map them to player-facing messages in metadata.
* [ ] Define what the player sees on success unless the verb is intentionally silent and documented.
* [ ] When rendering labels, prefer the exact wording the player used when available. Otherwise use the entity’s display name.
* [ ] If the verb requires new kinds of state changes, implement them as mutator instructions that are atomic and rollback-safe.

## Test at the right levels

* [ ] Write unit tests for the Target planner that verify both success and failure cases.
* [ ] Write resolver tests that confirm correct rule matching and failure behavior for this verb.
* [ ] If the verb uses prepositions, test that raw and canonical relation tokens behave correctly.
* [ ] If target binding order matters, test scope priority and ambiguity handling explicitly.
* [ ] Add an end-to-end integration test that exercises the full path from input to rendered output.
* [ ] In that integration test, assert both the world-state change and the player-visible success text.

## Verify stability

* [ ] Run the bundle’s test suite in serial mode.
* [ ] Run the repository test suite.
* [ ] Run the local CI command or document exactly why it cannot run cleanly.
