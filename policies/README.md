# policies/ — shared rules

One file per area. Agents cite `policies/<file>.md §N` and read only that section.

| File | Sections |
|---|---|
| `agent-boundaries.md` | §1 handoffs · §2 human gates · §3 backend before frontend · §4 right-sizing and finishing |
| `architecture.md` | §1 the design is the contract · §2 quality attributes · §3 when a decision becomes an ADR |
| `coding.md` | §1 green before handoff · §2 stack comes from config · §3 verify real state · §4 senior habits · §5 comments · §6 the code's own conventions win |
| `communication.md` | §1 plain language, progressive questions, problem before solution |
| `data.md` | §1 database concerns · §2 restore verification |
| `documentation.md` | §1 module folder split layout + writers · §2 dates · §3 amend the sub-file + status column · §4 size budget, index formula, archiving · §5 read index-first · §6 language · §7 handoff messages |
| `git.md` | §1 no agent runs state-changing git |
| `security.md` | §1 stay inside the allowed roots · §2 no secrets in code · §3 threat modelling at design time |
| `standards.md` | §1–§10 external standards per role |
| `ux.md` | §1 accessibility and responsive baseline · §2 principles vs visual style |

Nothing here is enforced by code except the git deny list in `.claude/settings.json`. Every other
rule holds only because an agent reads it and the driver checks it — treat them that way.
