---
name: review
description: Review today's diff with the code-reviewer subagent, focused on the areas I name.
argument-hint: "[focus areas]"
allowed-tools:
  - Read
  - Bash(git diff *)
  - Bash(git status *)
---

# Review the diff

Extra focus areas from Asim: "$ARGUMENTS" (if empty, only the always-on checks below).

## What changed against main

!`git diff main --stat`

## Steps

Use the `code-reviewer` subagent on `git diff main`. Besides its normal review, it must always check:

1. **Old APIs our hook bans.** The list is in `.claude/hooks/repo-rules.mjs`.
2. **Secrets, or `process.env` outside `env.ts`.** Never print a key; only name the file.
3. **Missing loading, empty or error states.**
4. **Icon buttons without an `aria-label`.**
5. **New dependencies nobody asked for.**
6. **`useEffect` used to sync state that could be derived.**
7. **Client components that could be server components.**

Then check the focus areas above.

## Output

Three lists: **Critical**, **Should fix**, **Nice to have**. Each item: file and line, what is wrong,
and the fix, in simple English. End with one line: **SHIP** or **FIX FIRST**.

**Never change files.** This skill only reviews.
