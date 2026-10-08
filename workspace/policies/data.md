# Policy — Data

Read this when the work involves a destructive migration, a high-volume table, transactions or
concurrency, indexes or query plans, retention, capacity, or a database provider change. Otherwise
skip it.

## 1. Database concerns

**Design time — `system-analyst`:** normalization vs denormalization decided in the Data Model;
expected volume and growth; partitioning if volume demands it; retention (how data leaves);
isolation level chosen for the concurrency the feature actually has.

**Implementation time — `backend-engineer`:** queries on real volume checked against the actual
plan (no N+1, no unindexed scans); bounded connection pooling; locks in a consistent order and held
briefly; transactions short and wrapping exactly what must succeed together — never a whole request
or a network call.

Answer these in the terms of the database the project actually uses (`CLAUDE.md`), not a default vendor.

## 2. Restore verification

A backup counts only after a restore has been performed and its result recorded. "Recorded" means
someone else can check it: the restore ran against a disposable target, and the command output plus
a check that the restored data is intact are written into that migration's `deploy.md` Deploy
History entry. Without it, no shared/production migration — unless the user explicitly acknowledges
"not verified, because …" in this session.
