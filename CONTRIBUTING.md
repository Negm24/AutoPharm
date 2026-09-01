# Contributing to AutoPharm

AutoPharm is developed by a five-person graduation-project team. Changes should
remain small, reviewable, tested, and traceable to an issue or project task.

## Branch workflow

The `main` branch is protected and must remain releasable.

Create short-lived branches from an up-to-date `main`:

```text
feature/prescription-signing
feature/kiosk-session-timeout
fix/duplicate-dispense-guard
docs/insurance-model
chore/update-tooling
```

Do not push feature work directly to `main`. Open a pull request, obtain at
least one approval, resolve review conversations, and wait for required checks.

## Commits

Write short imperative commit subjects:

```text
Add clinician invitation workflow
Prevent duplicate prescription dispensing
Document offline reconciliation states
```

Keep unrelated changes in separate commits or pull requests. Never rewrite
shared history or force-push `main`.

## Pull requests

- Link the relevant issue with `Closes #<number>` when appropriate.
- Explain behavior and architectural impact, not only changed filenames.
- Include screenshots for visible UI changes.
- Add migrations in the same pull request as Django model changes.
- Update requirements or architecture documents when a decision changes.
- Obtain an additional domain review for authentication, prescriptions,
  inventory, payment, insurance, dispensing, audit, or device-agent changes.

Pull requests are squash-merged so each merged request becomes one clear commit
on `main`.

## Quality requirements

Before requesting review:

- Run formatting, linting, type checking, and relevant tests.
- Test Arabic and English when user-facing text changes.
- Test RTL when layout changes.
- Verify error, loading, empty, timeout, and offline states when affected.
- Add concurrency and idempotency tests for safety-sensitive workflows.
- Do not weaken authentication, authorization, audit, or data-minimization rules.

## Sensitive information

Never commit:

- `.env` files or service credentials.
- API, Supabase, SMS, email, payment, or signing secrets.
- Real patient, clinician, prescription, insurance, payment, or health data.
- Browser captures, session tokens, cookies, or downloaded settings pages.
- Production logs or database exports.

Use fictional data in development, tests, screenshots, issues, and demos.

If a secret is committed, do not merely delete it in a later commit. Revoke or
rotate it immediately and notify the repository owner.

