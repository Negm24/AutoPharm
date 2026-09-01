# Smart Pharmacy Kiosk — Technology Stack and Architecture

**Version:** 1.2

**Status:** Confirmed

**Date:** 29 August 2026
**Related specification:** `01-requirements.md`

---

## 1. Decision summary

AutoPharm will use a **modular monolith** architecture with two independent React applications, one authoritative Django backend, PostgreSQL, and a small local Python service for kiosk hardware.

| Area | Confirmed choice |
|---|---|
| Kiosk frontend | React + Vite |
| Doctor portal | React + Vite |
| Frontend language | TypeScript only for application and shared-package source code |
| Styling | Tailwind CSS plus a shared AutoPharm design system |
| Backend | Python + Django + Django REST Framework |
| API style | Versioned REST API with OpenAPI documentation |
| Database | PostgreSQL hosted by Supabase |
| Supabase role | Managed PostgreSQL infrastructure only, not the application backend |
| Background work | Celery + Redis |
| Kiosk hardware | Local Python device-agent service |
| Repository | GitHub monorepo |
| Versioning | Semantic Versioning and GitHub Releases |
| Design principles | Pragmatic SOLID, composition, and interface-driven external boundaries |

The principal architectural rules are:

> Django is the only authoritative application backend. The kiosk and AutoDoc never access PostgreSQL or Supabase directly.

> SOLID is applied where it protects business rules, integrations, or testability. Simple code remains simple; abstractions are not created merely to satisfy a pattern.

---

## 2. High-level architecture

```text
┌──────────────────────┐       ┌──────────────────────┐
│ AutoPharm Kiosk      │       │ AutoDoc             │
│ React + Vite         │       │ React + Vite         │
│ 1024×600 touchscreen │       │ Doctor web portal    │
└──────────┬───────────┘       └──────────┬───────────┘
           │ HTTPS / REST API             │ HTTPS / REST API
           └──────────────┬───────────────┘
                          ▼
               ┌─────────────────────┐
               │ Django Backend      │
               │ Django REST         │
               │ Business rules      │
               │ Authentication      │
               │ Authorization       │
               │ Transactions        │
               │ Audit logging       │
               └──────┬────────┬─────┘
                      │        │
                      │        └──────────────┐
                      ▼                       ▼
            ┌─────────────────┐     ┌──────────────────┐
            │ PostgreSQL      │     │ Celery Workers   │
            │ Supabase host   │     │ Redis broker     │
            └─────────────────┘     └──────────────────┘

┌──────────────────────┐
│ Python Device Agent  │◄──── localhost ──── AutoPharm Kiosk
│ Printer / dispenser  │
│ scanner / sensors    │
└──────────────────────┘
```

The two frontends share design assets and API contracts but remain independently buildable and deployable.

The central backend is authoritative for accounts, prescriptions, prices, orders, and fleet-wide records. Each physical kiosk also owns a small, durable local operational journal through the device agent so an interrupted OTC cash dispense can be reconciled after a crash or network outage. This local journal contains operational identifiers and outcomes, not prescription or patient data.

---

## 3. Frontend applications

### 3.1 AutoPharm Kiosk

The kiosk is a React single-page application built with Vite. It is designed specifically for the fixed 1024×600 touchscreen described in the requirements.

Its responsibilities include:

- Session and language selection.
- Catalogue browsing and search.
- Symptom-guidance presentation.
- Customer authentication.
- Cart, insurance, payment, and dispensing flows.
- Prescription retrieval and selection.
- Designed offline and failure states.
- Communication with the local device agent.

The kiosk frontend is not trusted to make authorization, pricing, prescribing, payment, or dispensing-integrity decisions. Those decisions are enforced by the backend or the appropriate external/local service.

### 3.2 AutoDoc

AutoDoc is an independent React + Vite web application for prescribing clinicians and authorized clinical staff.

It shares AutoPharm's visual identity, but it has:

- Its own application entry point and build.
- Its own routes and login experience.
- A different authentication policy.
- Desktop-oriented layouts rather than kiosk layouts.
- Strict role and prescribing-permission controls.

Its initial scope is deliberately narrow:

- Clinician authentication and MFA.
- Patient lookup.
- Prescription drafting.
- Final review and signing.
- Prescription revocation.
- Current and previous prescription status.
- Audit-history viewing where authorized.

AutoDoc connects to the kiosk only through the central backend. It does not communicate directly with kiosk terminals. A prescription issued through AutoDoc is stored centrally and later retrieved by the authenticated patient at any kiosk.

AutoDoc submits a structured prescription—not a PDF or image upload—as the authoritative clinical record. The payload contains the patient identifier, prescriber, issue and expiry timestamps, medicine identifiers, dosage instructions, quantities, refill rules, and signature metadata. A rendered PDF may be generated as a human-readable representation, but it is never the source of truth.

The clinician must select a uniquely matched patient record and confirm identity details before signing. The system must not attach a prescription to an account solely because a mobile number was typed.

### 3.3 Why React + Vite

React is preferred over Vanilla JavaScript because both applications contain complex state, reusable components, validation, error handling, and asynchronous workflows.

Vite is preferred over Next.js because:

- Neither application requires search-engine optimization.
- Server-side rendering is not required.
- Django is the authoritative backend.
- The frontends should remain simple static builds.
- Vite provides fast development and a small deployment surface.

Next.js would introduce a second server-side application layer and blur the backend boundary without delivering a meaningful benefit to this project.

---

## 4. TypeScript decision

TypeScript is the confirmed source language for both React applications and all shared frontend packages. New application source files shall use `.ts` or `.tsx`, not `.js` or `.jsx`.

The team is more familiar with JavaScript, so the project will avoid advanced generics, type-level programming, and unnecessary abstractions. TypeScript should look like ordinary JavaScript with explicit application contracts. This limits the learning cost without weakening type safety.

JavaScript files are permitted only where a tool requires them, for generated output, or for third-party configuration that does not support TypeScript. They are not an alternative implementation language for AutoPharm features.

TypeScript is valuable here because the system has:

- Five developers working on shared code.
- Multiple frontends consuming the same API.
- Prescription, insurance, order, payment, and dispensing data with many fields.
- Several user roles and permission states.
- Complex status transitions.
- Bilingual content structures.
- Safety-sensitive operations where property-name mistakes matter.

TypeScript shall be used primarily for:

- API request and response models.
- Component properties.
- Authentication and session state.
- Prescription and order status types.
- Shared design-system components.
- Form values and validation results.

Recommended compiler settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

API types should be generated from the backend's OpenAPI document where practical. Runtime validation is still required because TypeScript types disappear at runtime.

---

## 5. Frontend libraries

| Purpose | Library |
|---|---|
| Routing | React Router |
| Server-state management | TanStack Query |
| Forms | React Hook Form |
| Runtime validation | Zod |
| Translation | i18next + react-i18next |
| Styling | Tailwind CSS |
| Accessible primitives | Radix UI or selected shadcn-style components |
| Unit/component tests | Vitest + React Testing Library |
| End-to-end tests | Playwright |
| Offline browser storage | IndexedDB through Dexie, where allowed |

TanStack Query manages information received from the backend, including loading, caching, invalidation, mutations, retries, and synchronization. It should not be replaced with a large global store.

Zustand may be introduced later for genuinely global client-only state, but it is not a default dependency. Redux is not required for the initial architecture.

Sensitive or authoritative data must not rely solely on frontend storage. Prescription contents must not persist on a terminal after session termination. IndexedDB is limited to non-sensitive offline material such as catalogue data, translations, rule-based guidance content, and the latest per-terminal stock snapshot.

---

## 6. Shared design system

Tailwind CSS will be used as the styling engine, but Tailwind utility classes alone do not constitute the design system.

The repository will contain shared design tokens and reusable components:

```text
packages/
  design-tokens/
    colors.css
    typography.css
    spacing.css
    elevation.css
    motion.css
  ui/
    Button/
    TextField/
    NumberPad/
    Dialog/
    Alert/
    Badge/
    Card/
    StatusIndicator/
    LoadingState/
    EmptyState/
    ErrorState/
    LanguageSwitcher/
```

Components shall use semantic variables rather than scattered literal colors:

```css
--color-surface;
--color-surface-raised;
--color-text-primary;
--color-text-secondary;
--color-action-primary;
--color-status-success;
--color-status-warning;
--color-status-danger;
--touch-target-min;
```

The kiosk and AutoDoc share:

- Color palette.
- Typography.
- Icons.
- Form controls.
- Buttons.
- Status colors and badges.
- Dialog and alert patterns.
- Error, loading, and empty states.

They do not need to share identical page layouts. AutoDoc can use denser desktop layouts, while the kiosk must retain large touch targets and fixed-screen behavior.

All shared components must support Arabic, English, RTL mirroring, keyboard access where relevant, and WCAG 2.1 AA contrast.

---

## 7. Backend

### 7.1 Framework

The backend will use:

- Python.
- Django.
- Django REST Framework.
- `drf-spectacular` for OpenAPI generation.
- PostgreSQL through Django's ORM.

Django is preferred over Flask because AutoPharm requires substantial built-in application structure:

- User authentication.
- Roles and permissions.
- Admin interfaces.
- Database migrations.
- Transaction management.
- Model validation.
- Security middleware.
- Auditability.
- A consistent structure for five contributors.

Python's OCR, AI, email, SMS, data-analysis, invoice, and hardware libraries remain available in Django. They are properties of the Python ecosystem rather than Flask-specific advantages.

Flask would require the team to assemble and standardize more of the authentication, ORM, migration, validation, administrative, and authorization layers manually.

### 7.2 Architecture style

The backend will be a modular monolith. It may contain multiple Django applications, but they are deployed together and share one transactional database.

```text
backend/
  config/
  apps/
    identity/
    organizations/
    patients/
    clinicians/
    prescriptions/
    catalogue/
    inventory/
    orders/
    payments/
    insurance/
    dispensing/
    receipts/
    notifications/
    terminals/
    audit/
    integrations/
```

Microservices are explicitly rejected for the graduation-project scope. They would add deployment, distributed authentication, network failure, logging, and transaction complexity without providing a useful benefit to a five-person team.

### 7.3 SOLID and object-oriented design

The backend, device agent, and integration layer shall follow **pragmatic SOLID** design. SOLID is guidance for meaningful boundaries, not a requirement to turn every function into a class or to reproduce textbook Clean Architecture mechanically.

Plain functions are preferred for small deterministic operations such as formatting a mobile number, calculating a line total, mapping a status to display text, or validating one value. Classes and interfaces are appropriate when an object owns state, coordinates a business use case, represents a replaceable dependency, or creates a useful test boundary.

#### Single Responsibility Principle

Each module and class should have one primary reason to change.

Examples:

- A prescription service applies prescription business rules.
- A prescription queryset or selective repository handles complex persistence queries.
- A signing service creates and verifies prescription signatures.
- An SMS provider sends SMS messages.
- A receipt renderer creates receipt content.
- A printer adapter communicates with a printer.

A Django view must not contain an entire clinical workflow. Views should authenticate the request, validate input, call an application service, and serialize the result.

```python
class IssuePrescriptionService:
    def __init__(
        self,
        prescriptions: PrescriptionRepository,
        privileges: PrescribingPrivilegeChecker,
        audit_log: AuditLog,
    ) -> None:
        self.prescriptions = prescriptions
        self.privileges = privileges
        self.audit_log = audit_log

    def execute(self, command: IssuePrescriptionCommand) -> Prescription:
        ...
```

Application services should name real use cases, such as `IssuePrescriptionService`, `RevokePrescriptionService`, `ReserveStockService`, and `CompleteDispenseService`. Avoid vague containers such as `CommonService`, `UtilityManager`, `SystemHandler`, or a single application-wide `BaseService`.

#### Open/Closed Principle

Stable business workflows should be extendable through implementations rather than repeatedly edited for each external provider or hardware device.

Examples:

- Add a new SMS provider by implementing `SmsGateway`.
- Add a new insurer by implementing `InsuranceGateway`.
- Replace the simulated payment processor with a real adapter.
- Replace a mock printer with an ESC/POS implementation.
- Add a different recommendation engine behind a common interface.

```python
from typing import Protocol


class SmsGateway(Protocol):
    def send(self, destination: str, message: str) -> str: ...


class MockSmsGateway:
    def send(self, destination: str, message: str) -> str:
        ...


class ProductionSmsGateway:
    def send(self, destination: str, message: str) -> str:
        ...
```

#### Liskov Substitution Principle

Any implementation of an interface must satisfy the same behavioral contract.

For example, `MockReceiptPrinter` and `EscPosReceiptPrinter` must return equivalent result types and failure categories. Code using `ReceiptPrinter` must not need device-specific conditionals to determine whether the implementation behaves correctly.

Substitutable implementations are particularly important for demonstration resilience. Switching from real hardware to a mock must not require changing checkout or dispensing business logic.

#### Interface Segregation Principle

Interfaces should be small and focused. A component must not depend on operations it does not use.

Prefer:

```python
class PrinterStatusReader(Protocol):
    def status(self) -> PrinterStatus: ...


class ReceiptPrinter(Protocol):
    def print_receipt(self, receipt: RenderedReceipt) -> PrintResult: ...
```

Avoid one large `KioskHardwareManager` interface containing printing, dispensing, scanning, payments, drawer control, and health monitoring.

#### Dependency Inversion Principle

Clinical and transactional business rules must depend on abstractions rather than Supabase, Celery, an SMS vendor, a printer model, or another external implementation.

Dependencies are wired at the composition boundary, normally Django settings/application startup or the device-agent startup module.

```text
Business use case
      │ depends on
      ▼
Application interface / port
      ▲ implemented by
      │
External adapter
```

Examples:

| Business abstraction | Possible implementations |
|---|---|
| `PaymentGateway` | `MockPaymentGateway`, future acquirer adapter |
| `SmsGateway` | `ConsoleSmsGateway`, production SMS adapter |
| `EmailGateway` | `ConsoleEmailGateway`, SMTP/API adapter |
| `InsuranceGateway` | `MockInsuranceGateway`, insurer-specific adapter |
| `TaxReceiptGateway` | `MockEtaGateway`, future ETA adapter |
| `TrackAndTraceGateway` | `MockEpttsGateway`, future EPTTS adapter |
| `RecommendationEngine` | `RuleBasedEngine`, future hybrid engine |
| `ReceiptPrinter` | `MockReceiptPrinter`, `EscPosReceiptPrinter` |
| `DispenserController` | `MockDispenser`, hardware-specific controller |

An abstraction should normally be introduced only when at least one condition is true:

1. Two implementations already exist.
2. A second implementation is explicitly planned.
3. The dependency is external, unstable, privileged, or hardware-specific.
4. The boundary is needed for isolated testing.
5. The operation contains important business policy.
6. The implementation must be replaceable for the graduation demonstration.

Otherwise, start with the simplest clear implementation and extract an abstraction when evidence appears.

### 7.4 Layer boundaries

Each Django module should use the following dependency direction:

```text
API layer
  serializers, permissions, views
               │
               ▼
Application layer
  commands, queries, use-case services
               │
               ▼
Domain layer
  entities, value objects, policies, state transitions
               ▲
               │
Infrastructure layer
  Django ORM, Celery, Supabase/PostgreSQL, external adapters
```

The domain layer must not import Django REST Framework, Celery, Supabase clients, HTTP libraries, or hardware libraries.

Django models may be used as persistence models, but important multi-step rules should live in named domain/application services rather than signals, serializers, views, or model `save()` methods.

Django's ORM is already a strong persistence abstraction. Do not create a repository class for every model. Ordinary CRUD should use models, custom querysets, and managers directly. Introduce a dedicated repository only for complex reusable queries, aggregate persistence, locking behavior, or a genuine substitution/testing boundary. Likely candidates are prescriptions, inventory reservations, and orders; simple catalogue and configuration models normally do not need repositories.

Use Django signals only for genuinely decoupled notifications. Do not hide critical payment, dispensing, stock, or prescription state transitions inside signals.

### 7.5 Domain objects and state machines

Use value objects and explicit state transitions for safety-sensitive concepts.

Suggested value objects include:

- `Money` with amount and currency.
- `Quantity` with validated positive units.
- `MobileNumber` stored in canonical E.164 form.
- `PrescriptionId`, `OrderId`, and `TerminalId` identifiers.
- `PrescriptionStatus`, `PaymentStatus`, and `DispenseStatus` enums.
- `PrescriptionSignature` containing signer, payload hash, and timestamp.

Illegal transitions must be rejected by the domain layer:

```python
class Prescription:
    def sign(self, signer: VerifiedPrescriber, signature: Signature) -> None:
        if self.status is not PrescriptionStatus.READY_FOR_REVIEW:
            raise InvalidPrescriptionTransition(...)
        self.status = PrescriptionStatus.ISSUED

    def revoke(self, actor: VerifiedPrescriber, reason: str) -> None:
        ...
```

The application service decides the transaction boundary; Django ORM transactions and locking implement that boundary around the domain operation.

For concurrency-sensitive operations, the application service owns the transaction boundary and the infrastructure uses row locks or conditional updates. `select_for_update()` is appropriate when recording a prescription dispense, reserving stock, completing a dispense, or reconciling an interrupted order. Locks must be held only for short database work and never while waiting for a payment processor, insurer, printer, dispenser, email provider, or another network call.

### 7.6 Composition over inheritance

Prefer small collaborating objects over deep inheritance trees.

Use inheritance only where the subtype relationship is stable and behaviorally valid. External providers, payment processors, insurers, printers, and recommendation engines should normally implement protocols/interfaces and be composed into services.

Avoid patterns such as:

```text
BaseService
  └── MedicalService
       └── PrescriptionService
            └── ControlledPrescriptionService
```

Prefer:

```text
IssuePrescriptionService
  ├── PrescribingPrivilegeChecker
  ├── InteractionChecker
  ├── PrescriptionRepository
  ├── SignatureService
  └── AuditLog
```

### 7.7 SOLID in React

React applications should follow the intent of SOLID through component composition, hooks, and separated responsibilities. React function components should not be rewritten as classes merely to claim OOP compliance.

Frontend rules:

- Page components orchestrate a screen but do not contain API implementation details.
- Reusable UI components receive data and callbacks through props.
- API access is isolated in the generated client and query/mutation hooks.
- Form schemas are separated from visual form components.
- Authentication and authorization checks use dedicated hooks and route guards.
- Hardware access is behind a `DeviceAgentClient` interface.
- Components should depend on semantic design-system primitives rather than duplicate Tailwind class collections.

Example:

```text
PrescriptionReviewPage
  ├── usePrescriptionQuery
  ├── useSignPrescriptionMutation
  ├── PrescriptionSummary
  ├── PrescriptionLineList
  └── ConfirmSignatureDialog
```

This preserves single responsibility and dependency inversion without introducing unnecessary class hierarchies.

### 7.8 Testing implications

SOLID boundaries must make business rules testable without real infrastructure.

Unit tests should inject fakes or mocks for:

- Time and clock behavior.
- ID generation.
- Repositories.
- SMS and email gateways.
- Payment and insurance gateways.
- Printers and dispensers.
- External regulatory simulations.

Core prescription, inventory, payment, and dispensing rules must be testable without starting React, Redis, Celery, Supabase, an SMS gateway, or physical hardware.

### 7.9 API conventions

The backend exposes a versioned REST API:

```text
/api/v1/
```

Example resources and actions:

```text
POST /api/v1/auth/patient/login
POST /api/v1/autodoc/auth/login

GET  /api/v1/patients/{id}/prescriptions
POST /api/v1/prescriptions
POST /api/v1/prescriptions/{id}/sign
POST /api/v1/prescriptions/{id}/revoke

POST /api/v1/orders
POST /api/v1/orders/{id}/reserve
POST /api/v1/orders/{id}/dispense
```

REST is preferred over GraphQL because it is simpler to document, mock, test, audit, and explain during the project defense.

The OpenAPI specification is the source for API documentation and, where practical, generated frontend clients and types.

### 7.10 Transaction boundaries and external workflows

Database transactions cannot make a card terminal, dispenser, insurer, email provider, and PostgreSQL commit atomically together. The architecture must not describe those multi-system operations as one database transaction.

Use two different consistency mechanisms:

1. **Database atomicity** for records inside PostgreSQL, including prescription quantities, stock reservations, order state, and idempotency records.
2. **A persisted process manager** for workflows that cross external systems, including payment authorization, physical dispensing, capture, void/refund, receipts, and alerts.

The payment/dispensing workflow should use explicit durable states:

```text
CREATED
  -> STOCK_RESERVED
  -> PAYMENT_AUTHORIZED
  -> DISPENSING
  -> DISPENSE_CONFIRMED
  -> PAYMENT_CAPTURED
  -> COMPLETED
```

Failure and recovery states include:

```text
PAYMENT_DECLINED
DISPENSE_FAILED
PAYMENT_VOID_PENDING
REFUND_PENDING
REFUNDED
RECONCILIATION_REQUIRED
```

Every external command carries a stable idempotency key. Repeating a request after a timeout must return or reconcile the existing operation rather than create another charge or dispense.

Do not keep a database transaction open while physical hardware or a remote service responds. Persist the intended state, commit, perform the external action, then persist the observed result using a compare-and-set state transition.

### 7.11 Practical module structure

The layer guidance should remain lightweight inside each Django application. A safety-sensitive module may use:

```text
prescriptions/
  models.py
  querysets.py
  services/
    issue_prescription.py
    revoke_prescription.py
    record_dispense.py
  api/
    serializers.py
    permissions.py
    views.py
  tasks.py
  tests/
```

A simple reference-data module may remain only `models.py`, `admin.py`, `api/`, and `tests/`. The project does not require empty domain, repository, factory, or adapter files in every Django application.

---

## 8. Database and Supabase

### 8.1 Database choice

PostgreSQL is the authoritative database.

It is required for:

- Relational integrity.
- Foreign-key constraints.
- Transactions and savepoints.
- Row locking.
- Atomic prescription and inventory updates.
- Reporting.
- Structured JSON fields where appropriate.
- Strong migration support.

Database rules should enforce important invariants in addition to application validation:

- Foreign keys for ownership and references.
- Unique constraints for idempotency keys and external event IDs.
- Check constraints for non-negative quantities and monetary amounts.
- Conditional uniqueness where only one active record is allowed.
- UTC timestamps at rest.
- UUIDs or similarly non-enumerable public identifiers at API boundaries.

Audit records are append-only from the application's perspective. Corrections create new events; they do not rewrite historical prescription, payment, dispense, or privilege actions.

### 8.2 Supabase boundary

Supabase will host PostgreSQL, but Supabase will not replace Django.

The project uses:

- Supabase PostgreSQL hosting.
- Supabase database dashboard where useful.
- Supabase connection pooling where required by the deployment environment.

The initial architecture does not use:

- Direct frontend database access.
- Supabase Auth.
- Supabase Edge Functions.
- Supabase's Data API from the kiosk or AutoDoc.
- Supabase Row Level Security as a duplicate application-authorization system.

If the hosted project exposes Supabase Data API features by default, public/anonymous access must be disabled or restricted to a schema containing no AutoPharm application tables. No Supabase anonymous or service-role key is shipped in either frontend.

Django connects to Supabase using a normal PostgreSQL connection string. Django owns migrations, authentication, authorization, validation, and business rules.

This boundary keeps the application portable. The database can later move from Supabase to another PostgreSQL provider without rewriting either frontend.

### 8.3 Environments

Local development uses PostgreSQL through Docker Compose. Shared staging uses Supabase. The graduation demonstration defaults to the local/LAN container profile, with the hosted environment available as a secondary option.

Recommended environments:

| Environment | Database | Purpose |
|---|---|---|
| Local | Docker PostgreSQL | Individual development and tests |
| Test/CI | Temporary PostgreSQL | Automated tests |
| Staging | Supabase PostgreSQL | Team integration and examiner rehearsal |
| Demo | Local/LAN Docker PostgreSQL | Internet-independent graduation demonstration |

Developers must not run experimental migrations against the shared demonstration database.

Supabase free hosting is convenient but must not be the only demo-day plan. The repository will include a local/LAN demonstration profile using the same Django and PostgreSQL containers with seeded fictional data. This provides a recoverable fallback if venue internet or the hosted free tier is unavailable.

---

## 9. Background jobs

Celery and Redis will process operations that should not keep an HTTP request open or must be retried independently.

Candidate jobs include:

- SMS delivery.
- Transactional email.
- Receipt and PDF generation.
- Simulated ETA e-receipt submission.
- Simulated EPTTS events.
- Insurance requests.
- Alert dispatch.
- Stock-reservation expiry.
- Failed-dispense reconciliation.
- Prescription-expiry processing.
- Analytics aggregation.

Every critical job should carry:

- A unique idempotency key.
- A clear status.
- Attempt count.
- Retry limit.
- Exponential backoff.
- Last-error details.
- A terminal failed/dead-letter state.
- Administrative visibility.

Celery is a delivery mechanism, not the source of truth. Critical work must first be represented by a durable database record.

Use a transactional outbox for work that must be emitted after a successful database change:

```text
Database transaction
  1. update order/prescription state
  2. insert outbox event
  3. commit

Outbox dispatcher
  4. publish or execute job
  5. record delivery result
```

This prevents a successful sale from being committed while its required receipt, ETA submission, or reconciliation task is silently lost between the database commit and Celery publication. Consumers must still be idempotent because delivery may occur more than once.

Use `transaction.on_commit()` for convenience notifications that can be regenerated. Use the persisted outbox for events whose loss would violate a functional, financial, audit, or regulatory requirement.

Celery and Redis should be introduced after the core Django API and data model are stable, not during the first project setup commit.

---

## 10. Kiosk hardware integration

Printer and dispenser communication will not run inside the central Django backend.

Each kiosk will run a small local Python device agent that abstracts physical hardware:

```text
AutoPharm React application
          │
          │ localhost HTTP or WebSocket
          ▼
Python device agent
  ├── ESC/POS receipt printer
  ├── dispensing controller
  ├── collection-drawer sensor
  ├── QR/camera interface
  └── terminal health checks
```

Possible local endpoints:

```text
GET  /health
GET  /printer/status
POST /print
POST /dispense
GET  /drawer/status
```

The device agent must listen on loopback only, reject browser origins other than the installed kiosk application, and require a per-installation authentication secret or mutually authenticated local channel. A public web page must never be able to call `/dispense` merely because it runs in the same browser.

For online prescription or centrally authorized orders, Django issues a short-lived signed dispense authorization containing the terminal, order, permitted line items, quantities, expiry, and nonce. The device agent verifies it before moving hardware. The browser cannot construct or widen this authorization.

For offline OTC cash mode, the agent accepts only the locally authenticated kiosk installation and enforces a signed offline policy snapshot that excludes prescription-only/controlled products and card payments. Offline capability must not become a general bypass of backend authorization.

Each hardware command includes:

- Terminal ID.
- Session/order correlation ID.
- Idempotency key.
- Requested item and quantity.
- Command timestamp and expiry.
- Authenticated caller information.

The device agent stores a small durable operational journal before and after irreversible actions. On restart it reports incomplete commands to the backend reconciliation endpoint. The journal must not store prescription contents, symptoms, customer names, mobile numbers, or other health/personal data.

Every hardware interface must have a real implementation and a mock implementation:

```python
class ReceiptPrinter:
    def status(self): ...
    def print_receipt(self, receipt): ...


class EscPosReceiptPrinter(ReceiptPrinter): ...
class MockReceiptPrinter(ReceiptPrinter): ...
```

The mock path is mandatory so the complete application can still be demonstrated if hardware is unavailable or fails on demo day.

The device agent must follow the same SOLID rules as the backend: focused device interfaces, adapter implementations, dependency injection at startup, and no hardware-specific branches inside application workflows.

The payment terminal remains a separate certified device boundary. Raw card details never pass through React, the Python device agent, Django, logs, or PostgreSQL.

---

## 11. Authentication boundaries

The central backend owns all authentication and authorization. Different actors use different authentication policies.

### 11.1 Kiosk customer

- Mobile number and four-digit PIN.
- SMS verification and reset code.
- Short-lived session bound to terminal and kiosk session.
- Server-side lockout and rate limiting.
- No access to AutoDoc.
- PIN hashes stored with Argon2id or the strongest supported Django password hasher configured for the project.

### 11.2 AutoDoc clinician

- Invitation-only account.
- Strong password.
- TOTP MFA for the academic implementation.
- Verified simulated professional-registry record.
- Explicit prescribing privilege.
- Reauthentication before signing a prescription.
- No public "register as a doctor" route.

### 11.3 Clinical staff and administrators

- Individual named accounts.
- Roles with least-privilege permissions.
- Assistants may prepare drafts when delegated.
- Only an authorized prescriber may issue a prescription.
- An administrator does not gain prescribing authority merely by being an administrator.

### 11.4 Identity model

Use one base human-principal model with organization membership, roles, and application-specific policies. Authentication credentials are separate records so a patient PIN, clinician password, MFA enrollment, and recovery method are not overloaded into one field. Do not build unrelated human user tables for every frontend.

The domain should distinguish:

- Login identity.
- Organization membership.
- Professional credential.
- Prescribing privilege.
- Delegation.
- Transaction signature.

Customer, clinician, staff, and technician profiles may contain different domain data while still referencing the same base principal abstraction. API authorization is based on both the authenticated principal and the active role/privilege for the requested application.

### 11.5 Terminal identity

A kiosk terminal is a machine principal, not a human user. Each installation receives a unique terminal ID and revocable cryptographic credential.

The backend binds customer session tokens to:

- The authenticated customer when present.
- Terminal identity.
- Kiosk session ID.
- Short expiration.
- Allowed audience and operations.

A terminal credential does not grant the ability to enumerate customer or prescription data. Prescription access still requires an active customer session and per-request authorization.

Terminal secrets must not be embedded in the frontend JavaScript bundle. They are stored by the locked-down device agent or operating-system credential store and used to authenticate terminal-to-backend communication.

---

## 12. Offline operation and recovery

Offline support is intentionally limited and follows `NFR-7` and `NFR-8`.

### 12.1 Available offline

- Attract screen and language selection.
- Cached catalogue and bilingual product information.
- Browse and search.
- Rule-based symptom guidance using a versioned local rules snapshot.
- Cart operations.
- Per-terminal stock checks using the last trusted local snapshot.
- Cash-only OTC checkout when cash hardware and the local device agent are healthy.

### 12.2 Unavailable offline

- Account sign-in and signup.
- Prescription retrieval or dispensing.
- Insurance verification.
- Card payment.
- AutoDoc.
- Cross-terminal receipt history.
- Any operation requiring a current central authorization decision.

The UI must state these limitations before the customer invests effort in an unavailable path.

### 12.3 Local data policy

The kiosk web application's IndexedDB cache may store only versioned, non-sensitive operational data:

- Catalogue and translations.
- Rule-based symptom-guidance content, but not a customer's answers.
- Terminal planogram.
- Per-terminal stock snapshot.
- Content/configuration version metadata.

The application shell, fonts, icons, translations, and required frontend assets are installed locally or cached by a controlled service worker. The kiosk must not depend on third-party CDNs at runtime.

The device agent may store an append-only OTC transaction/dispense journal required for crash recovery. It must use opaque event/order identifiers and exclude patient, prescription, symptom, insurance, and payment-card data.

### 12.4 Synchronization

Every offline-capable dataset carries a server-issued version. On reconnect, the terminal:

1. Authenticates with its terminal credential.
2. Uploads pending operational events using stable event IDs.
3. Receives acknowledgement for accepted or already-seen events.
4. Reconciles incomplete dispenses or cash orders.
5. Downloads newer catalogue, price, rule, content, and planogram versions.
6. Replaces local snapshots only after validation succeeds.

The backend must tolerate duplicated events and process each event ID once. Conflicts are recorded for operator review rather than silently overwritten.

## 13. Security, observability, and deployment

### 13.1 Security boundaries

- Browser frontends are untrusted clients.
- Django enforces authentication, authorization, validation, rate limits, and state transitions.
- The device agent has only terminal-scoped permissions.
- PostgreSQL is reachable by backend infrastructure, not public frontends.
- Redis and Celery are private infrastructure and never exposed to kiosk networks.
- Logs and analytics exclude PINs, reset codes, tokens, prescription contents, symptoms, and unnecessary identifiers.

### 13.2 Observability

All services use structured JSON logs with correlation IDs spanning API request, order, payment, hardware command, dispense, background job, and reconciliation event.

Required operational views include:

- Backend and database health.
- Terminal heartbeat and last-seen time.
- Printer, dispenser, drawer, and network status.
- Queue depth and failed jobs.
- Payment and dispensing anomalies.
- Low stock and expired batches.
- Failed ETA/EPTTS simulations.
- Audit events for privileged actions.

Metrics must use anonymous or operational identifiers and must not contain personal or health data.

### 13.3 Deployment profiles

The same containerized backend must support:

- Local developer profile.
- CI test profile.
- Shared hosted staging profile using Supabase PostgreSQL.
- Local/LAN graduation-demo profile with seeded fictional data.

Production-like deployments place Django behind an HTTPS reverse proxy. Configuration is supplied through environment variables or a secrets manager; environment-specific URLs and credentials never appear in source code.

Database backups and a tested restore procedure are required for staging/demo readiness. A backup is not considered useful until it has been restored successfully in a rehearsal environment.

---

## 14. Repository structure

AutoPharm will use a GitHub monorepo.

```text
AutoPharm/
  apps/
    kiosk-web/
    autodoc-web/
    device-agent/
  backend/
  packages/
    ui/
    design-tokens/
    api-client/
    validation/
    i18n/
  infrastructure/
    docker/
    nginx/
  docs/
  tests/
  package.json
  pnpm-workspace.yaml
  compose.yaml
```

TypeScript packages use `pnpm` workspaces. Python dependency management should use `uv` or Poetry; `uv` is preferred for its speed and simple lockfile workflow.

Docker Compose should provide at minimum:

- PostgreSQL.
- Redis.
- Django API.
- Celery worker when introduced.

The frontend development servers may run directly on developer machines for faster hot reload.

---

## 15. Testing and quality controls

### Frontend

- ESLint.
- Prettier.
- TypeScript compiler checks.
- Vitest.
- React Testing Library.
- Playwright end-to-end tests.

### Backend

- Ruff for linting and formatting.
- Pyright or mypy for selected static checking.
- Pytest and pytest-django.
- Factory Boy or model-bakery for fixtures.
- OpenAPI schema validation.

### Required integration tests

At minimum, automated tests should cover:

- Patient authentication and lockout.
- Doctor invitation and activation.
- Prescribing-permission enforcement.
- Staff draft versus prescriber signing.
- Prescription expiry and revocation.
- Atomic partial dispensing.
- Prevention of double dispensing.
- Stock reservation and timeout.
- Concurrent reservation/dispense attempts using real PostgreSQL transactions.
- Payment idempotency.
- Timeout after payment authorization and before/after dispense confirmation.
- Failed dispense and refund reconciliation.
- Transactional-outbox redelivery and duplicate-event handling.
- Power-loss recovery from each irreversible workflow state.
- Offline OTC cash sale synchronization after reconnect.
- Rejection of prescription, account, insurance, and card flows while offline.
- Device-agent authentication and duplicate hardware commands.
- Session destruction.
- Arabic/English and RTL critical flows.

---

## 16. GitHub workflow

The repository will use:

- A protected `main` branch.
- Short-lived feature branches.
- Pull requests for all production changes.
- At least one reviewer before merge.
- Automated lint, type-check, and test jobs.
- Squash merging to keep history readable.
- GitHub Issues or Projects for task tracking.
- GitHub Releases for milestones and demo builds.

Suggested branch names:

```text
feature/prescription-signing
feature/kiosk-session-timeout
fix/duplicate-dispense-guard
docs/insurance-model
```

Database model changes and their migrations must be committed in the same pull request.

Secrets, `.env` files, Supabase keys, SMS credentials, signing keys, and production database URLs must never be committed.

---

## 17. Versioning

The project will use Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

- `MAJOR`: incompatible architectural or API change.
- `MINOR`: backward-compatible feature or milestone.
- `PATCH`: backward-compatible correction.

Suggested project milestones:

| Version | Milestone |
|---|---|
| `0.1.0` | Repository and development environment |
| `0.2.0` | Customer authentication and sessions |
| `0.3.0` | Catalogue, inventory, search, and cart |
| `0.4.0` | AutoDoc and prescriptions |
| `0.5.0` | Payment and dispensing simulation |
| `0.6.0` | Insurance simulation |
| `0.7.0` | Receipts and ETA simulation |
| `0.8.0` | Hardware integrations |
| `0.9.0` | Feature complete and examiner rehearsal |
| `1.0.0` | Graduation demonstration release |

For the graduation project, all components should normally share one project version. This is simpler than independently versioning the kiosk, AutoDoc, backend, and device agent.

The version should be available in:

- Git tag, such as `v0.4.0`.
- GitHub Release.
- Application build metadata.
- AutoPharm maintenance/about screen.
- AutoDoc footer or about screen.
- Backend health/version endpoint.

---

## 18. Explicit non-decisions and rejected alternatives

| Alternative | Resolution |
|---|---|
| Vanilla JavaScript frontend | Rejected; insufficient structure for the application complexity |
| Mixed JavaScript/TypeScript application source | Rejected; application and shared-package source use TypeScript consistently |
| Next.js as frontend and backend | Rejected; duplicates Django responsibilities and provides no needed SSR benefit |
| Flask as the main backend | Rejected; Django provides more of the required security and data-management foundation |
| Node.js main backend | Rejected; the selected Python ecosystem better matches integrations and device tooling |
| Supabase as full backend | Rejected; Django remains the authoritative application layer |
| Direct frontend-to-Supabase access | Rejected; bypasses central business and authorization rules |
| Microservices | Rejected for the graduation-project team and scope |
| GraphQL | Rejected initially; REST is simpler for this system |
| Redux by default | Rejected; TanStack Query plus local state is sufficient initially |
| One combined kiosk/doctor frontend | Rejected; AutoDoc is an independent application and security boundary |
| Deep inheritance-based OOP | Rejected; use interface-driven composition and small focused objects |
| Repository class for every Django model | Rejected; use the ORM/querysets unless a meaningful boundary exists |
| One database transaction across payment and hardware | Impossible/rejected; use durable states, idempotency, and compensation |
| Sensitive browser offline cache | Rejected; offline cache is restricted to non-sensitive operational content |

---

## 19. Implementation order

1. Create the monorepo and development tooling.
2. Create Django, PostgreSQL, the initial domain model, and only the core interfaces justified by external or replaceable boundaries.
3. Define identity, terminal identity, audit events, idempotency records, and state-machine conventions.
4. Establish OpenAPI and the shared frontend API client.
5. Create the shared design tokens and core UI components.
6. Create the AutoPharm React shell with Arabic/English, RTL, and explicit offline capability guards.
7. Implement customer accounts and kiosk sessions.
8. Implement catalogue, inventory, cart, stock reservations, and safe local catalogue snapshots.
9. Create AutoDoc with invitation-only clinician authentication and patient matching.
10. Implement structured prescription drafting, signing, retrieval, and revocation.
11. Implement order, payment, and dispensing process states with idempotency and compensation.
12. Add the authenticated local device-agent interface, durable journal, mocks, and recovery path.
13. Add Celery/Redis and the transactional outbox for notifications, receipts, and simulated integrations.
14. Complete insurance, receipts, ETA, monitoring, and designed failure states.
15. Rehearse local/LAN demo deployment, restore from backup, power-loss recovery, and network loss.
16. Harden, test, complete accessibility review, and release `1.0.0`.

---

## 20. Final decision

The confirmed AutoPharm system technology is:

```text
React + Vite + TypeScript
Tailwind CSS + shared AutoPharm design system
Django + Django REST Framework
PostgreSQL hosted on Supabase
Celery + Redis
Authenticated local Python kiosk device agent
Pragmatic SOLID + dependency inversion + composition
Explicit state machines + idempotency + transactional outbox
Non-sensitive offline cache + durable recovery journal
GitHub monorepo + Semantic Versioning
```

This architecture keeps the project understandable for five developers, supports the kiosk and AutoDoc as separate applications, preserves transactional correctness without pretending external systems share a database transaction, allows Python-based integrations, supports the required offline degradation, and avoids letting a hosting platform replace the project's own backend design.
