# Conversation Authoring Tooling Design

## Status

- Status: draft
- Scope: authoring source of truth and tooling workflow for conversation state machines and adjacent interactive narrative systems

## Purpose

This document exists to define the authoring and tooling posture for conversation machines.

It is intentionally separate from `ConversationSystemDesign.md`.

That document is about runtime behavior and player-facing semantics.
This document is about what designers author, what the tooling validates, what the runtime consumes, and how visual inspection fits into that workflow.

## Core Position

The authored source of truth is a YAML-based DSL.

That DSL is not an arbitrary local format.
It is an ergonomic facade over statechart semantics.

SCXML is the semantic north star for that DSL.

Visualizations are derived artifacts only.
They are never an authored or canonical source of truth.

## Why This Matters

Tooling is upstream design.

If the authoring format is weak, the runtime will inherit weak semantics.
If the visual workflow is privileged over the machine model, the project will accumulate ambiguity, workarounds, and hidden complexity.

The goal is not merely to draw conversations.
The goal is to author machines cleanly, validate them rigorously, and inspect them visually without letting the visualization become the model.

## The DSL

Designers author a repository-local YAML DSL.

That choice is deliberate:

- it keeps authored content readable and reviewable
- it fits the repository's data-first authoring culture
- it allows a conversation machine to live alongside other authored game content
- it avoids asking designers to write raw SCXML

However, the DSL is constrained, not free-form.

It must be designed so that:

- states, transitions, events, guards, hierarchy, and execution flow remain coherent in statechart terms
- convenience features do not quietly introduce incompatible semantics
- growth happens by design rather than by patching in one-off exceptions

The DSL should be pleasant to author, but rigor takes precedence over convenience when the two conflict.

## SCXML

SCXML is not the intended designer-facing authoring format.

Designers should not be expected to author raw SCXML documents in this repository.

Reference standard:

- W3C Recommendation: [State Chart XML (SCXML): State Machine Notation for Control Abstraction](https://www.w3.org/TR/scxml/)

SCXML's role here is semantic, not editorial.

It serves as:

- the reference model for statechart semantics
- the discipline against which the DSL is judged
- the guardrail against inventing a convenient but incoherent bespoke format

The intended relationship is:

- designers author the YAML DSL
- the DSL remains constrained by statechart semantics
- new DSL features must be evaluated against SCXML rather than added ad hoc
- the DSL must not contradict SCXML's model of states, transitions, events, guards, hierarchy, and execution flow unless the divergence is explicit, justified, and documented as a deliberate deviation

The practical bar is:

- a valid authored machine should be representable in SCXML terms
- if a DSL feature cannot be explained coherently in SCXML/statechart terms, that is a warning sign

This does not mean the repository must literally emit `.scxml` files today.
It does mean SCXML should shape the semantics of the authored model.

## Visualization

Visualization is important, but it is downstream of the DSL.

The workflow is not:

- draw a diagram
- infer the machine from the diagram

The workflow is:

- author the machine in the DSL
- validate the DSL
- derive visualizations from the DSL

Any visualization format is therefore a projection, not a source of truth.

That includes:

- Markdown previews
- Mermaid
- any future graph export
- any editor-integrated diagram view

If a visualization cannot express something cleanly, the answer is not to distort the DSL to fit the visualization.
The answer is either:

- accept that the visualization is partial, or
- improve or replace the visualization layer

## Tooling Workflow

The current intended workflow is:

1. A designer authors a conversation machine in the YAML DSL.
2. Tooling validates the authored document structurally and semantically.
3. Tooling derives review artifacts from the DSL.
4. Runtime systems consume the validated DSL, not the visualization.

This separation is important.

It preserves a clean distinction between:

- authored source
- derived review artifacts
- runtime consumption

## Tooling Responsibilities

The tooling layer needs at least these responsibilities:

### Authoring

- define what designers write
- define the DSL's allowed machine concepts
- keep authored syntax readable and reviewable

### Validation

- reject structurally invalid machines
- reject semantically incoherent machines
- catch contradictions between authored structure and statechart expectations

### Visualization and Preview

- produce readable previews for collaboration and review
- produce graph views from the DSL
- help people inspect the machine without turning the preview into the source

### Runtime Loading

- consume the validated DSL
- reject unsupported constructs cleanly
- avoid reinterpreting authored semantics differently at runtime

## Generated Artifacts

Generated artifacts are expected and useful.

Current likely generated surfaces:

- validation output
- human-readable preview output
- graph or diagram output

These are derived artifacts.
They are disposable and inspectable outputs of the authored DSL.

They must not become parallel authored surfaces.

JavaScript code generation is not a primary goal at this stage.
It may be considered later only if it solves a demonstrated problem without weakening the clarity of the authoring workflow.

## Design Standard

The standard for this tooling is not "can it render a diagram?"

The standard is:

- does the DSL describe a machine clearly
- does that machine remain coherent under SCXML/statechart scrutiny
- can tooling validate it deterministically
- can visualizations be derived from it without becoming semantically authoritative
- can the same approach scale to future interactive narrative systems

## Reuse Beyond Conversation

This tooling should be reusable beyond NPC conversation.

Likely future consumers include:

- branching narrative encounters
- guided ritual or sequence-driven authored interactions
- other structured interactive narrative flows

That is another reason to center statechart semantics rather than conversation-specific shortcuts.

## Open Questions

The remaining open questions are now narrower:

1. What exact YAML DSL shape should we adopt first?
2. Which SCXML-aligned features are in scope for the first version of the DSL?
3. What validation failures belong at authoring time versus runtime load time?
4. What visualization outputs are worth generating first for collaborative review?
5. What, if anything, should be persisted as generated review artifacts in the repository?

## Provisional Recommendation

Proceed on this basis:

- designers author a YAML DSL
- the DSL is constrained by SCXML/statechart semantics
- tooling validates the DSL
- visualizations are derived from the DSL
- runtime consumes the validated model rather than any diagram format

That is the current center of gravity for the tooling design.
