# Validation

## TypeScript

- Prefer `tsc --noEmit` when validating TypeScript changes.
- Avoid creating build artifacts unless emitted files are explicitly needed for the task.

## Verification scope

- Prefer narrow, targeted verification over broad noisy runs.
- For infra-heavy refactors, prefer build validation and ask the user to synth manually if required.
- If the default test command is blocked by an existing repo issue, use a targeted command when possible and note the limitation clearly.
