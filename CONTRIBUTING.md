# Contributing to Grocerease

Thanks for contributing. This guide keeps the repository easy to review and safe to evolve.

## Workflow

- Keep `main` stable and releasable.
- Create a branch for each logical change.
- Open a pull request for each branch, even for solo work.
- Merge only after a quick self-review and validation pass.

## Branching

Use short, descriptive branch names:

- `feat/...` for new behavior
- `fix/...` for bug fixes
- `docs/...` for documentation-only changes
- `refactor/...` for internal structure changes with no behavior change
- `test/...` for test-only changes

Examples:

- `feat/items-tab-search-improvements`
- `fix/history-undo-one-time-items`
- `docs/agent-and-requirements-guides`

## Commit Messages

Use clear, intention-focused commit messages. Prefer Conventional Commit prefixes:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`
- `chore: ...`

Good examples:

- `feat: add one-time item creation from shopping tab`
- `fix: preserve child order after reparenting`
- `docs: add agent and contribution guidelines`

### Commit quality rules

- Keep each commit focused on one concern.
- Avoid mixing unrelated changes in the same commit.
- Avoid `WIP` commits in public history.
- If behavior changes, include matching doc updates in the same branch.

## Pull Requests

Each PR should include:

- A short summary of what changed.
- Why the change was needed.
- A brief test plan (commands and/or manual checks).
- Notes about behavior changes, if any.

## Validation

Run the following before merge when relevant:

- `npm run lint`
- `npm run test:unit`

For UI or behavior changes, manually verify key flows in the app.

## Merge Strategy

- Prefer squash merge if the branch has many small iterative commits.
- Use rebase/merge if commits are already clean and meaningful.
- Avoid merge commits that add no value to history.

## Documentation Expectations

- `REQUIREMENTS.md` describes implemented app behavior.
- `AGENTS.md` describes agent operating guidance.
- Update docs when behavior or workflow changes.

## Security

- Never commit secrets, credentials, or private keys.
- Keep `.gitignore` up to date for local/private artifacts.
- Rotate any secret immediately if accidentally exposed.
