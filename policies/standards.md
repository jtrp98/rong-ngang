# Policy — Standards baseline per role

Which external standards each role draws on, and how strongly. This file carries no normative text
from any standard and makes no compliance or certification claim.

## 0. How to read

- **MUST** — mandatory when the concern exists. "when applicable / available / defined / selected" decides whether the row applies; applicability is normally declared in the module's `design\` contracts.
- **SHOULD** — recommended default; follow unless the project documents a reason not to.
- **MAY** — optional; apply when useful.
- **REFERENCE** — body of knowledge to draw practice from; no compliance implied.

A MUST is never a certification claim.

## 1. business-analyst

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| ISO/IEC/IEEE 29148 | SHOULD | structured requirements | requirement artifacts and traceability; requirement review |
| BPMN 2.x | SHOULD | business/process modeling | process artifacts; BA/SA review |
| DMN | MAY | complex decision rules | decision artifacts; BA/SA review |
| BABOK Guide | REFERENCE | business analysis practice | human review |
| Agile / Scrum practices | REFERENCE | iterative delivery | team review |

No MUST row — requirement quality is carried by requirement review.

## 2. system-analyst

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| OpenAPI Specification | MUST when applicable | a REST/HTTP API contract exists | approved contract; schema/contract validation |
| HTTP Semantics (IETF) | MUST when applicable | HTTP services/APIs | API tests / review |
| Project Data Standard | MUST | persistent/project data | `policies/data.md`; SA/code review |
| Data classification policy | MUST when defined | sensitive or regulated data | security review; policy supplied by the project |
| ISO/IEC/IEEE 29148 | SHOULD | system/software requirements | design and requirement relations; SA review + human approval |
| ISO/IEC 25010 | SHOULD | quality requirements / NFR | measurable NFR sections; SA + QA review |
| UML 2.x | SHOULD | behavioral/structural modeling where useful | design review |
| C4 Model | SHOULD | architecture communication | context/container/component views |
| JSON Schema | SHOULD when applicable | JSON data contracts, payloads, events | schema validation |
| AsyncAPI Specification | SHOULD when applicable | formal event/message contracts | contract review |
| ISO/IEC/IEEE 42010 | REFERENCE | architecture descriptions | `policies/architecture.md`; ADRs |

MUST rows rest in existing mechanisms: the schema/contract confirmation gate plus contract tests in
the Target — the framework does not run those tests itself.

## 3. project-manager

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| Risk management practices | SHOULD | material delivery/technical risk | risk/dependency tracking; human review |
| Definition of Ready / Done | SHOULD | lifecycle gates | workflow policies; gate evidence |
| Agile / Scrum / Kanban practices | REFERENCE | delivery planning | team review |

These references never override role boundaries or human gates.

## 4. test-planner

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| ISO/IEC/IEEE 29119 | REFERENCE | test process and artifacts | test-plan structure |
| ISTQB terminology/practices | REFERENCE | testing vocabulary and techniques | QA guidance |
| BDD / Gherkin | MAY | behavior-focused acceptance tests | acceptance scenarios |

Test-level policy stays owned by `test-pyramid.yaml`, not this file.

## 5. uxui-designer

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| WCAG 2.2 Level AA | MUST | user-facing web UI unless explicitly exempted | UX sign-off + accessibility verification |
| WAI-ARIA Authoring Practices | MUST when applicable | custom interactive web components | keyboard / screen-reader checks |
| Apple Human Interface Guidelines | SHOULD when applicable | Apple-platform products | platform review |
| ISO 9241-210 | REFERENCE | human-centred design process | UX review |
| ISO 9241-110 | REFERENCE | interaction principles | UX review |
| Nielsen Usability Heuristics | REFERENCE | usability evaluation | heuristic review |
| Material Design | MAY | Material-based products | project design system / knowledge |

MUST rows rest in the existing UX gate: for MEDIUM+ frontend work, frontend cannot start without an
approved, current UX artifact carrying human uxui-signoff; `policies/ux.md` remains the working rule
set and QA rounds carry the verification.

## 6. backend-engineer

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| Secure Coding practices | MUST | production code | security/QA evidence; security review and scans |
| OpenAPI contract | MUST when applicable | contract-defined REST APIs | implementation conforms to the approved contract; contract tests |
| HTTP Semantics (IETF) | MUST when applicable | HTTP APIs | contract/integration tests |
| OWASP API Security Top 10 | MUST when applicable | exposed/internal APIs with security impact | security tests |
| Project Data Standard | MUST | persistent/project data | `policies/data.md`; SA/code review |
| Data classification policy | MUST when defined | sensitive or regulated data | security review; policy supplied by the project |
| Retention / disposal requirements | MUST when defined | stored data, logs, backups | operational evidence; requirement supplied by the project |
| Semantic Versioning | SHOULD when applicable | versioned packages/APIs | release review |
| Conventional Commits | SHOULD | git history when the project adopts it | commit/CI validation by humans or CI — an agent never runs state-changing git |
| SOLID principles | REFERENCE | software design | code review; `policies/coding.md` |

MUST rows are carried by the security gate (Critical/Important findings stay behind a human gate), by `security` being the only role that closes a finding, and by contract tests in the codebase.

## 7. frontend-engineer

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| Approved Design System | MUST when available | UI implementation | the signed UX artifact / knowledge design source; UX + QA review |
| WCAG 2.2 Level AA | MUST | user-facing web UI unless explicitly exempted | UX sign-off + accessibility verification |
| WAI-ARIA Authoring Practices | MUST when applicable | custom interactive web components | keyboard / screen-reader checks |
| Secure Coding practices | MUST | production code | security/QA evidence |
| Apple Human Interface Guidelines | SHOULD when applicable | Apple-platform products | platform review |
| Semantic Versioning | SHOULD when applicable | versioned packages/APIs | release review |
| Conventional Commits | SHOULD | git history when the project adopts it | commit/CI validation by humans or CI — an agent never runs state-changing git |
| Material Design | MAY | Material-based products | project design system / knowledge |
| SOLID principles | REFERENCE | software design | code review; `policies/coding.md` |

MUST rows rest in the UX sign-off gate (approved current UX artifact + human uxui-signoff before
frontend starts — see §5) and the security gate as in §6.

## 8. qa-engineer

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| WCAG 2.2 AA | MUST when applicable | user-facing UI | accessibility verification; automated + manual checks |
| ISO/IEC 25010 | SHOULD | quality attribute validation | test evidence for NFRs |
| OWASP testing guidance | SHOULD when applicable | security-relevant behavior | test evidence |
| ISO/IEC/IEEE 29119 | REFERENCE | test process and artifacts | test plan / test evidence |
| ISTQB terminology/practices | REFERENCE | testing vocabulary and techniques | QA review |
| BDD / Gherkin | MAY | behavior-focused acceptance tests | executable/manual evidence |

Accessibility verification rides the normal QA rounds. QA never closes a security finding.

## 9. security

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| OWASP API Security Top 10 | MUST when applicable | exposed/internal APIs with security impact | security tests; `policies/security.md` |
| OAuth 2.0 / OpenID Connect | MUST when selected | delegated authorization / identity | architecture/API contract; security review + tests |
| Principle of Least Privilege | MUST | access control | role/permission design; review / tests |
| OWASP ASVS | SHOULD | web application security requirements | security review; `policies/security.md` |
| OWASP Top 10 | REFERENCE | common web application risks | review / scan |
| ISO/IEC 27001 | REFERENCE | organizational ISMS | organization-level evidence, not a framework claim |
| ISO/IEC 27002 | REFERENCE | security controls | control evidence in company/project knowledge |

MUST rows are carried by the human security gate, by `security` being the only role that closes a finding, and by each role writing only the paths it owns.

## 10. devops

| Standard | Level | Applies when | Evidence expected |
|---|---|---|---|
| CI/CD practices | MUST for automated delivery pipelines | build/test/deploy | CI evidence from the Target pipeline |
| Backup / recovery requirements | MUST when defined | stateful production systems | restore test evidence; requirement supplied by the project |
| Retention / disposal requirements | MUST when defined | stored data, logs, backups | operational evidence; requirement supplied by the project |
| Infrastructure as Code | SHOULD | managed infrastructure | review + plan/apply evidence |
| OpenTelemetry | SHOULD when applicable | distributed/service observability | logs/metrics/traces evidence |
| CIS Benchmarks | SHOULD when applicable | supported infrastructure/platforms | scan / audit evidence; hardening policy supplied by the project |
| SRE principles | REFERENCE | reliability-sensitive services | SLI/SLO/runbook design |

Stated plainly: IaC, OpenTelemetry, retention/backup, and CIS hardening are carried only by evidence recorded in the project and its CI pipeline — nothing in this kit checks them.
