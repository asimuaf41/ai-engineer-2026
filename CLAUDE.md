@AGENTS.md

## Claude Code in this repo

- Explain code in simple English — this is a learning repo.
- Use plan mode for any change touching more than 3 files, or any new feature.
- Before saying a feature is done, run the `code-reviewer` subagent on the diff.
- Hooks enforce the safety rules. If a hook blocks you, read its message and change
  approach — never work around it.
- Don't guess package or model versions — use the `version-checker` subagent.
- New Lab page → use the `/new-experiment` skill.
- End of day → Asim runs `/ship-day`.
