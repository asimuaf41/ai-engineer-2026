# Prompt library

Prompt templates for the repeated jobs in this repo. Only templates that exist are listed here.

> TODO: templates 1-8 are not written yet. Template 9 below is drafted from the prompts we used in Day 15; compare it with
> the course's Day 15 Part P before relying on it.

## 9. Advanced feature prompt

For a feature that touches several files, needs a contract, and must be proven (a pipeline, an eval, a data feature).
Eight headings, in this order:

| Heading | What goes in it |
|---------|-----------------|
| **GOAL** | One sentence a stranger could check: "runIndex(indexId) builds a complete, ready code index for one app, paying only for changed chunks." |
| **CONTEXT** | Every file, doc and rule it must read first, and what already exists (names, paths, the previous parts). |
| **CONTRACT** | The exact names, inputs and outputs: file path, function signature, what it returns, what it must not change. |
| **RULES** | The steps and the constraints, as short bullets: order of work, what to reuse, what is forbidden. |
| **LIMITS** | The numbers: sizes, counts, time, cost, rate limits. |
| **ON FAILURE** | What each failure does: the error type, the message the person sees, what is logged, what is left behind. |
| **PROCESS** | How to work: plan first, how many questions to ask, what to install, what not to touch. |
| **PROOF** | What to run and paste before saying done: tests, build, a real run with the numbers. |

Short example:

```
GOAL: fetchRepo() returns the text files of one repo at one exact commit, safely, in memory.
CONTEXT: installationOctokit() in src/lib/github/app.ts; the repo row has repo_full_name + default_branch.
CONTRACT: src/lib/code-index/fetch-repo.ts: fetchRepo({ installationId, repoFullName, ref }) -> { commitSha, files, skipped, totalBytes }
RULES: size check first; download the SHA, not the branch; never write to disk or run anything.
LIMITS: max 200 MB repo, 300 KB per file, 5,000 files, 400 MB unpacked.
ON FAILURE: RepoTooBigError, RepoNotFoundError, RepoFetchError; log only the status and the repo name.
PROCESS: ask up to 3 questions first; stop before adding any other dependency.
PROOF: a unit test with a small .tar.gz built in the test; paste the run.
```

### 5 questions before you press Enter

1. Is the **GOAL** one sentence that someone else could check as done or not done?
2. Does **CONTEXT** name every file, doc and rule the work depends on, so nothing is guessed?
3. Is the **CONTRACT** exact (names, inputs, outputs), so the tests can be written from it?
4. Are the **LIMITS** and **ON FAILURE** written down, instead of left for the code to decide?
5. Is the **PROOF** something I can run and paste, with real output, before anyone says "done"?
