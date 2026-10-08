# Policy — Architecture

## 1. The design is the contract

`design\data-model.md` and the contract files (`design\des-NNN.md`) are the confirmed contract,
agreed with a person through `system-analyst`. `backend-engineer` implements them verbatim,
`frontend-engineer` derives its types from them and from the real backend, and `qa-engineer` fails
any drift.

- No agent invents, renames, or "improves" a field, type, relation, status code, or error shape. A task that needs something the contract doesn't cover stops and routes to `system-analyst`.
- Once real schema/entity code exists, it is the working copy engineers read; the Data Model stays the authority. `qa-engineer` compares the two field by field every round — that comparison is not optional.
- When code and design disagree, **design wins and the code is wrong** — unless the design is the thing that's wrong, in which case `system-analyst` amends it and a person confirms. Never edit the design to match what got built.
- With several module folders sharing one codebase, each module's `design\data-model.md` owns its own models. A model this module doesn't declare may belong to another module — check before flagging it.

## 2. Quality attributes a design must answer for

Each attribute gets either how the design handles it, or one line saying it doesn't apply. Silently
absent is not neutral — it gets discovered later, more expensively.

- Performance and load — what happens at realistic and peak load, where it degrades first.
- Failure modes — retry, fall back, or fail visibly: decided, not discovered.
- Observability — how someone outside can tell what it is doing and why it broke.
- Deployment — where components run, what a deploy touches.
- Compatibility and maintainability — effect on interfaces others build against.
- Operational cost, vendor lock-in, and accepted technical debt (with a direction).

## 3. When a decision becomes an ADR

A decision stays in `design\` while it is reversible inside the module. It goes to
`decisions\ADR-NNN-<slug>.md` when it binds several modules, outlives the phase, or would cost a
migration / broken consumers / re-verification to undo. An ADR states context, decision,
consequences, and a review trigger (a measurable condition for revisiting it). An agent drafts; a
person accepts it and supplies the date.
