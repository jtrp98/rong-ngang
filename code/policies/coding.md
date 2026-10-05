# Policy — Coding discipline

## 1. Green before handoff

The engineer → QA round trip is the most expensive loop in the pipeline: a type error QA finds costs
a full QA run plus a full engineer run. So engineers run the project's **typecheck and lint**
(commands in `CLAUDE.md`) before handing off, fix their own failures once, and report the actual
result. Build and tests stay with `qa-engineer`.

Not a licence to improvise: a failure caused by a schema gap or an unanswered contract question is
reported in the handoff, not edited around. "Not run" is a valid report; "passed" for a check that
didn't run is never valid.

## 2. The stack comes from config

`CLAUDE.md`'s project config declares the stack, code roots, and commands. Agents implement that
stack with the libraries already in the repository. Changing the stack is a human decision. If the
config is blank, ask — never guess from a single file.

## 3. Verify against real state, not memory

A recalled fact — from earlier in the run, a summary, or "this project does X" — is a hypothesis.
Read the current file, schema, or code before stating it or acting on it. When a belief and the file
disagree, the file wins and the belief is corrected on the spot. The project keeps its memory in
documents with Change Logs precisely so nobody has to hold it in their head.

## 4. Habits a green build doesn't prove

Reviewers read the diff for these:

- **Transactions** — writes that must succeed or fail together get one explicit transaction.
- **Idempotency** — anything that can run twice leaves the same state as once.
- **Concurrency** — before adding shared mutable state, name who else touches it.
- **Error semantics** — propagate what failed, where, with what input; never swallow.
- **Observability** — a path that can fail in production logs what a reader needs.
- **Performance** — a new query or loop in a hot path is weighed; no N+1.
- **Backward compatibility** — what others consume is extended, not broken, or the break is a confirmed contract change.
- **Blast radius** — before anything destructive or wide, state what it touches and how to undo it.
- **No premature abstraction** — the second concrete case earns the generalization.

An architectural decision found mid-implementation goes to `system-analyst`, not into the edit.

## 5. Comments answer why, not what

A comment is **required** where a real why exists: a business rule the code doesn't state (cite the
`REQ`/`DES` id), an external constraint, a named workaround, a non-obvious performance or security
choice, a deliberate deviation from local convention, an ordering/concurrency invariant.

Rejected: restating the next line, narrating structure ("loop through items"), decorative
separators, commented-out code. Allowed: API doc comments on public surfaces, `TODO` with an owner
or task id, regex/algorithm explanations, test comments naming the scenario.

## 6. The code's own conventions win

Before editing a file, read its neighbours and follow their naming, layout, error shapes, test
placement, and import style. A new file follows the files beside it, not a convention invented for
the task. A deliberate departure carries a why-comment. QA checks each new file with one yes/no:
does it match its neighbours?
