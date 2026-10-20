---
name: ship-day
description: Prepare the end-of-day commit for a course day (checks, review, commit). Asim runs it by hand.
disable-model-invocation: true
argument-hint: "[day-number] [commit message]"
allowed-tools:
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(pnpm check-types)
  - Bash(pnpm build)
---

# Ship Day $0

Day number: $0. Commit message: everything in "$ARGUMENTS" after the day number.

## Repo state right now

!`git status --short`

!`git diff HEAD --stat`

## Steps

Do the steps in order. **Stop at the first problem**, say what went wrong in simple English,
and do not continue.

1. **Checks.** Run `pnpm check-types`, then `pnpm build`. Both must pass.
2. **Safety check.** Use the file list above. Never run any command on `.env` files.
   - No `.env*` file is listed, except `.env.example`.
   - No `tsbuildinfo`, `.next`, `.turbo` or `node_modules` paths are listed.
   - Read `git diff HEAD` and make sure it has no real-looking key: `sk-ant-`, `sb_secret_`,
     `sk_live_`, `ghp_`, or a `service_role` JWT. Do not print the key if you find one;
     only name the file.
3. **Review.** Run the `code-reviewer` subagent on the diff. If the verdict is FIX FIRST, stop
   and show the Critical items.
4. **Commit.** Run `git add -A`, then `git commit` using the commit message from `$ARGUMENTS`
   (everything after the day number). If no message was given, ask Asim for one.
5. **Do NOT push.** Find the current branch name in the first line of `git status --short --branch`,
   then print this for Asim to run himself: `git push -u origin <current-branch>`, and add:
   "Open a PR and read Files changed."
