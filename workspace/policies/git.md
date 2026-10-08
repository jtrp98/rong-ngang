# Policy — Version control

## 1. No agent runs state-changing git

No `init`, `add`, `commit`, `push`, `pull`, `merge`, `rebase`, `checkout`/`switch`, `branch`,
`tag`, `reset`, `stash`, or anything that writes inside `.git/`. Version control belongs to the
user. Read-only inspection — `status`, `log`, `diff`, `show`, `blame` — is fine and encouraged
(e.g. to list the files a task changed).

Writing a git-related *file* (`.gitignore`, a CI workflow) is fine for `setup` and `devops`.

`.claude/settings.json` denies the common mutating commands. That list is a safety net, not the
rule — a command it misses is still forbidden. If you need a commit, say what and why in your
handoff and let the user run it.
