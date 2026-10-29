---
name: versions
description: Check current npm versions (with publish dates and the pnpm 24-hour rule) before installing or upgrading packages.
argument-hint: "[packages...]"
allowed-tools:
  - Read
---

# Check versions

Packages: "$ARGUMENTS". If that is empty, check `next`, `react`, `motion`, `typescript` and every
package in the `catalog:` block of `pnpm-workspace.yaml`.

## Steps

1. Read `pnpm-workspace.yaml` to see what the repo pins now for each package.
2. Use the `version-checker` subagent for **every** package. Do not answer from memory.
3. For each package, find:
   - the latest stable version and its publish date;
   - the newest version that is **older than 24 hours** (pnpm 12 blocks newer ones, so this is the
     one we can actually install);
   - what our repo pins now (from step 1);
   - whether a security advisory exists for **our pinned version**.

## Output

One short table, one row per package: package, pinned, latest stable (date), newest installable,
advisory (yes/no). Under it, one line per package with a recommendation: stay, upgrade to X, or
upgrade urgently (advisory).

**Never change files.** This skill only reports; Asim decides what to upgrade.
