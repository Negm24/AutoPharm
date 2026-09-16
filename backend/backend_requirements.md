# AutoPharm Backend Requirements

Status: Simplified subsystem structure approved and empty scaffold created. Authentication design is pending; no implementation code has been added.

## 1. Purpose and continuity

This document records backend decisions for developers and AI assistants across sessions, models, and reasoning settings. Read it before proposing or implementing backend changes, together with `../01-requirements.md` and `../02-technology-stack.md`.

Explicit current user instructions take precedence. This document records the latest agreed backend decisions; older architecture examples must not silently override them. Identify conflicting requirements and unresolved choices instead of inventing decisions. Keep this document updated when the owner accepts a change.

This file is not guaranteed to be automatically loaded by every AI tool. Include it in the task context or explicitly ask the assistant to read it when starting a new backend task.

## 2. Development workflow and approval gate

- Use incremental implementation: agree on a bounded increment, implement it, verify it, and obtain owner acceptance.
- The AI implements backend code, migrations, tests, API documentation, and Postman examples.
- The owner manually tests requests in Postman and confirms that response contracts match frontend expectations.
- The owner plans to use Codex Security for vulnerability discovery. Review and remediate validated findings together; do not automatically initiate scans or publish reviews without the relevant request.
- Finish the agreed authentication scope before proceeding to other business features. Dependencies needed to implement authentication may be added within that scope.
- "100% done" means the agreed acceptance criteria pass, manual API checks are accepted, and identified blocking defects are addressed. It is not a claim that no vulnerabilities exist.
- The owner approved the folder structure and authorized creation of empty files/folders plus updates to this document. This is scaffolding authorization only; do not add implementation code until requested.
- Do not commit, push, deploy, or modify unrelated work merely because a local implementation is authorized.

## 3. Confirmed architecture

- One shared Python/Django backend serves the independent kiosk and AutoDoc frontends.
- Use Django REST Framework for HTTP APIs and Django ORM/migrations for persistence.
- Use a modular monolith: focused business modules deployed as one backend, with PostgreSQL as the authoritative database.
- Supabase provides PostgreSQL hosting, not a replacement authentication or business-logic backend. Frontends do not access the database directly.
- Keep the shared backend in the repository-root `backend/` directory.
- Use OpenAPI documentation, with request/response examples for frontend integration.
- Add Celery/Redis when durable background work requires them; do not use them as substitutes for transactional records.
- A separate Python device agent owns local hardware integration and terminal secrets. Do not embed terminal credentials in frontend bundles.
- This is an academic prototype. Use fictional data and simulated external services according to the main requirements; do not claim commercial readiness.

## 4. Route groups ("blueprints")

The owner requires modular route groups and **every authentication endpoint under `/api/auth/...`**.

Django uses included URL configurations (`urls.py` and URL namespaces) for the grouping described as blueprints; Flask blueprints are not a reason to change frameworks.

- Patient registration/login, OTP verification/resend, PIN recovery/reset, clinician login/MFA, session renewal/logout/revocation, and QR authentication all belong under `/api/auth/...`.
- Group routes within the authentication namespace by actor or purpose where useful.
- Examples for discussion: `/api/auth/patient/login/`, `/api/auth/patient/reset-pin/`, `/api/auth/clinician/login/`, `/api/auth/clinician/mfa/`, `/api/auth/logout/`.
- These examples are not a finalized API contract. Approve exact endpoint names, methods, trailing-slash behavior, and response schemas before implementation.
- Do not substitute `/api/v1/auth/...` or `/api/autodoc/auth/...`; those older examples conflict with the owner's current prefix requirement.
- Versioning strategy remains undecided and must preserve the required authentication prefix.
- Non-authentication business resources (for example prescriptions and catalogue) must not be placed in the auth group simply because they require authentication.
- Invitation onboarding may have auth routes while clinician organization/profile administration remains a business responsibility.

## 5. Structure and SOLID principles

The owner approved the following simplified structure, replacing the earlier nested identity/patient/clinician scaffold. Python package directories contain empty `__init__.py` files (omitted below). Add business subsystems incrementally under `apps/`; do not create separate patient, clinician, terminal, or audit applications before their responsibilities justify them.

```text
backend/
  backend_requirements.md
  README.md
  manage.py
  pyproject.toml
  uv.lock
  .env.example
  config/
    settings.py
    urls.py
    asgi.py
    wsgi.py
  apps/
    authentication/
      apps.py
      admin.py
      models.py
      serializers.py
      views.py
      services.py
      permissions.py
      urls.py
      migrations/
  common/
    exceptions.py
  tests/
    conftest.py
    authentication/
  docs/
    authentication.md
  postman/
    AutoPharm.postman_collection.json
    Local.postman_environment.json
```

All newly scaffolded files are intentionally empty except this requirements document. The backend is not runnable yet; the Postman JSON files are placeholders, not importable collections, and `uv.lock` is a placeholder, not a generated dependency lock. Populate configuration and generate the real lockfile during an authorized implementation increment. Preserve unrelated existing files.

- Name the subsystem `authentication` to avoid Django's built-in `auth` application label. The HTTP prefix remains `/api/auth/`.
- `config/urls.py` will include `apps/authentication/urls.py` under that prefix. Actor-specific routes initially live in this single URL configuration, without nested API folders.
- Patient and clinician authentication, roles, credentials, and sessions initially belong to this subsystem. Their future clinical business workflows belong to later subsystems.
- Keep one environment-driven `config/settings.py` initially. Split settings only when complexity warrants it.
- Keep authentication tests together in `tests/authentication/`, not duplicated inside the app. Add cross-subsystem integration tests when needed.
- `manage.py` is Django's project command entry point for development, migrations, and administrative commands once implemented.
- Start with flat `models.py`, `services.py`, `serializers.py`, and `views.py`. Split a file into a package only when implementation complexity makes navigation clearer.

- Organize modules around business responsibilities, not a single application-wide models/views/services collection.
- Separate request handling, input/output schemas, permission checks, business use cases, persistence, and external adapters.
- Keep views small. Do not hide payment, dispensing, prescription, or reservation workflows inside signals or model `save()` methods.
- Prefer named use cases and ordinary functions where appropriate. Do not introduce classes, inheritance, empty layers, or generic base services solely to claim OOP/SOLID compliance.
- Use focused interfaces/protocols for external or replaceable dependencies such as SMS, insurance, payments, email, signing, and hardware.
- Mock and real adapters must have equivalent result and failure contracts.
- Django ORM is sufficient for normal persistence; do not require a repository class per model.
- Create modules and split files when needed by the current increment. Do not scaffold every future module prematurely.
- Keep settings/composition code separate from business policy. Shared utilities must remain small and must not become a home for unrelated domain logic.

## 6. Authentication scope

### Shared identity

- Design a custom Django human-user model before initial migrations.
- Maintain one underlying human identity with appropriate profiles and privileges rather than unrelated user tables for each frontend.
- Distinguish human identities from terminal/machine identities.
- Distinguish anonymous kiosk sessions from authenticated customer sessions.
- Separate patient PIN credentials from clinician password/MFA credentials; do not overload one field or grant privileges merely from the frontend used.

### Kiosk customers

- Mobile number plus four-digit PIN; normalize Egyptian mobile numbers to canonical E.164 form.
- Registration requires simulated SMS verification.
- PIN reset uses a six-digit, short-lived, single-use code. New codes invalidate older ones; resetting invalidates the used code.
- Enforce failed-attempt limits, temporary lockout/backoff, and rate limiting server-side by account/mobile, terminal, and source as appropriate.
- Reject trivially guessable PINs and hash credentials using established Django facilities with an appropriate configured hasher.
- Provide resend/failure handling and preserve anonymous guest access.
- Implement logout, expiry, revocation, terminal/session binding, and QR-login scope from the main specification.
- QR challenge approval and the companion-client simulation require an explicit contract; do not silently omit the feature.

### Clinicians and other privileged humans

- Clinician onboarding is invitation-only with simulated professional-registry verification.
- Require strong passwords and MFA; the architecture specifies TOTP for the academic implementation.
- Provide a recent-authentication/reauthentication mechanism for later prescription signing.
- Separate prescriber, assistant, administrator, and technician privileges. Administrative access does not imply prescribing permission.
- Assistants cannot sign, issue, or revoke prescriptions. Prescription operations are implemented in their later increment, using auth-provided identity and privileges.
- Audit authentication events and privilege changes without recording credentials or unnecessary personal data.

### Sessions and unresolved auth design

- Customer credentials/sessions must be short-lived, terminal/session-bound, and invalidated on session end.
- Session cleanup must prevent the next kiosk user from retrieving the previous user's identity or personal data.
- Financial/dispense operations already in progress require controlled completion/recovery, not cancellation that loses the transaction record.
- Decide cookie sessions versus bearer tokens, client deployment origins, CSRF/CORS behavior, renewal policy, lifetimes, and credential transport before coding.
- Do not assume JWT or implement a generic "token handler" before that decision. Use established cryptography and authentication primitives.
- Do not persist authentication credentials or personal health data in frontend local storage.

## 7. Confirmed future business decisions

### Guidance (D-4)

- Deterministic decision tree followed by a product lookup table.
- Each leaf is a defined answer; recommendation leaves map to explicitly ranked products. Red-flag leaves return escalation, not products.
- No model, LLM, training process, or training dataset.
- Version questions, branches, outcomes, mappings, ranks, and bilingual explanations together for offline use and auditability.
- Restrict results to eligible OTC products stocked in the terminal; define no-recommendation outcomes.
- Explain recommendations in one sentence without retaining individual symptom answers after session end.

### Insurance (D-6)

- One fictional insurer with fictional members and policies, implemented behind a simulated provider boundary.
- Initial coverage: configurable percentage for eligible products, explicit exclusions, valid/expired policies; caps and deductibles deferred.
- Demonstrate approval, rejection, and timeout. Rejected/unverifiable insurance must not reduce the price; allow full-price checkout.
- Reconcile claims against actually dispensed items, not the initial cart.

## 8. Data integrity and external operations

- Backend authorization and validation are authoritative on every protected request.
- Use database constraints and short transactions/locking or conditional updates to prevent overselling and double prescription fulfilment.
- Keep reservation, prescription allowance, actual stock consumption, and physical dispense outcomes distinct.
- Use persisted workflow states and stable idempotency keys for external commands and retries.
- Unknown outcomes after timeouts require reconciliation; they are not equivalent to confirmed failures.
- Do not hold database transactions open while waiting for external services or hardware.
- Plan durable event delivery/outbox and duplicate handling where asynchronous side effects are required.
- Store prices/financial amounts with exact decimal or integer minor-unit semantics, not binary floating-point.
- Offline capability is restricted by the main requirements; prescription, authentication, insurance, and card flows require connectivity.

## 9. Deliverables and auth completion gate

For each increment provide:

1. Code and associated migrations.
2. Automated behavior, validation, authorization, and failure-path tests.
3. OpenAPI schema and documented errors/request/response examples.
4. Importable Postman collection and local environment template without secrets.
5. Reproducible setup instructions and fictional seed data where needed.
6. A short manual acceptance checklist and an honest statement of checks run and limitations.

Before leaving auth, verify registration, verification, login, recovery, code replay/expiry, throttling/lockout, logout/revocation, session isolation, terminal binding, clinician invitation/MFA, privilege separation, and agreed QR behavior. Test denied access as well as successful requests. The owner validates frontend compatibility in Postman. Address blocking test failures and validated security findings, and obtain acceptance before proceeding.

## 10. Next step

Folder structure approval is complete. Stop after creating the empty scaffold and updating this document. Next, discuss and finalize the authentication/data/API design and acceptance criteria with the owner before implementing code. No backend implementation is authorized by this document alone.
