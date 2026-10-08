# Policy — Agent boundaries

## 1. Handoffs

**No agent invokes the next agent.** Subagents have no `Agent` tool. Every run ends by telling the
driver (the main session) what was produced, what state the module is in, and which role should go
next — then stops.

- **Manual mode (default):** the driver reports each handoff to the user, who decides whether and when to run the next stage.
- **Continuous mode (opt-in, per request):** when the user explicitly asks for an unattended run, the driver invokes each next stage itself as soon as the current one finishes cleanly. This permission lasts for that request only. The human gates in §2 still stop it.

Never assume your output was accepted, and never act as if the next stage was decided for you.

## 2. Human gates — stop in both modes

1. **Business:** a material unresolved business choice or a missing confirming owner. The run stops with the exact question and who must answer. A generic "go ahead" does not answer a specific question.
2. **Design:** schema change, migration/backfill, breaking contract, or Critical security consequence — confirmed by a person before anyone builds on it.
3. **UX:** frontend work that depends on a UX artifact waits for a person to sign it.
4. **QA:** a Critical failure, or the third failed round on the same task.
5. **Security:** any Critical/Important finding — fixed and re-audited, or the risk accepted by a person in writing.
6. **Deploy:** any real deploy or migration against a shared environment.
7. **Release cut:** what ships in this release and what goes to backlog.

Outside these, an agent that cannot decide something from the documents still stops and routes it
— that is not a gate, it's an agent out of things it may decide.

The normal flow and the loops back:

```
business-analyst → system-analyst → project-manager → [test-planner]
   → backend-engineer → [uxui-designer → sign-off] → frontend-engineer → reviewer → qa-engineer
                                                         ↓            ↓             ↓
                                                  code bug      contract gap    business gap
                                                     ↓              ↓               ↓
                                                  engineer    system-analyst  business-analyst
   qa-engineer ✅ → [security if 🔒] → devops (human-confirmed)
```

## 3. Backend before frontend, never at the same time

When a backend and a frontend task share an API contract, the backend task finishes first. The
frontend reads types and calls off what the backend **actually built**, not off the design alone —
running both at once means the frontend guesses the wire format, and the guess is wrong often
enough to cost a whole fix round. Tasks that share no contract may run in any order.

## 4. Right-sizing and finishing

**Running the full chain for a small change is waste, not diligence.** Match the entry point to the
change (table in `CLAUDE.md`). If you were invoked for work clearly below your stage's threshold,
say so and name the cheaper route — then do it if the user confirms. The reverse also holds: a
schema change that skips `system-analyst` is exactly the failure this pipeline exists to prevent.

**Finishing is a rule too.** A pipeline that never stops generating work never ships:

- **Done = released.** Verified tasks that never deploy are inventory, not delivery.
- **Release scope is frozen** in `plan\index.md` `## Release Scope`. Anything new goes to `backlog.md`; only the user moves an item into the current release.
- **Non-blocking findings go to backlog.** Reviewer and QA findings that don't break an in-scope AC or contract (hygiene, hardening, robustness beyond the AC, test-quality nits) never create tasks on their own.
- **Two fix rounds per task, then a human decides** — accept, re-scope, or drop.
- **Human decisions first.** `plan\index.md` `## Waiting on Human` is reported before any agent work. Don't queue agent work behind an unanswered human question.
- **Docs that outgrow their budget are a scope signal** (`policies/documentation.md` §4), not just a formatting problem.
