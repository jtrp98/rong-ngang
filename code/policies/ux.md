# Policy — UX

Read when the work renders UI. `uxui-designer` drafts, `frontend-engineer` implements, `qa-engineer`
verifies. Nothing here replaces the human sign-off on a UX artifact.

## 1. Accessibility and responsive baseline

Target: WCAG 2.2 Level AA (สมมติฐาน — ยังไม่ยืนยัน until the project confirms its target).

- **Keyboard and focus** — everything works by keyboard, with a visible, logical focus order and no trap.
- **Semantics** — native elements before ARIA; icon-only controls have an accessible name; ARIA states stay true.
- **Contrast** — text and meaningful indicators meet AA against the background actually rendered.
- **Reduced motion** — honour the preference; nothing essential is carried by animation alone.
- **Touch targets** — meet the AA minimum size, or offer an equivalent path.
- **Responsive** — content and function survive mobile, tablet, desktop; no horizontal scroll of reading content.
- **Design system** — reuse the project's components and tokens; a new one is a design decision recorded in the artifact.
- **Information architecture** — a screen carries the decisions its step needs, ordered by the user's task, not the data model.
- **Enumerated states** — loading, empty, error, success, and no-permission are each specified, built, and verified. "Handle states" is not a spec.
- **Long text** — layouts survive longer/shorter strings and enlarged text.

## 2. Principles vs visual style

Principles (§1, reuse before create, smallest change) are the same in every project. Visual style —
palette, typography, spacing, imagery, tone — comes from the project's existing UI and the design
sources provided. Never a house aesthetic; where the project is silent, ask the person.
