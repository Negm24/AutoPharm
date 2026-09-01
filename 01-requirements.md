# Smart Pharmacy Kiosk — Requirements Specification

**Version** 0.6 · **Market:** Egypt (academic scope) · **Scope:** the application running on the vending machine plus the small, independent AutoDoc clinician portal that supplies structured prescriptions. Hardware selection, enclosure, and robotics are out of scope except where the app must talk to them.

---

## 0. Decisions

### 0.1 Resolved

| #   | Decision                | Resolution                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1 | Identity primitive      | **Mobile number + 4-digit PIN.** Verification by SMS one-time code. Fastest thing to enter on a wall-mounted terminal.                                                                                                                                                                                                                                         |
| D-2 | Target market           | **Egypt.** Currency EGP, Arabic primary with English secondary, Egyptian regulatory regime throughout.                                                                                                                                                                                                                                                         |
| D-7 | Guest proof of purchase | **Resolved by D-3.** A guest prints a receipt at the terminal (ALWAYS for user or guest), or + optionally types an email address, or optionally creates an account afterwards to retain it. No guest leaves with nothing.                                                                                                                                      |
| D-3 | Receipt delivery        | **Three routes: printed, emailed, stored in the account.** A thermal ESC/POS printer closes the guest gap. Signed-in users always get account storage, with email and print as options; guests get print, or email if they choose to type an address. Every sale also produces an ETA-format e-receipt, generated for real against a mock submission endpoint. |
| D-5 | Prescription source model | **Small independent AutoDoc web portal.** AutoDoc uses the same design system but its own frontend, routes, authentication policy and clinician roles. It sends structured, signed prescription records to the central backend; it never connects directly to kiosks. Clinicians are invitation-only and bound to a simulated professional-registry record. Clinical assistants may prepare drafts but only an authorized clinician may sign or revoke. Controlled/narcotic medicines are excluded from the prototype. |

### 0.2 Implementation scope — graduation project

This is an academic project and will not be operated commercially. Requirements are therefore tiered:

| Tier         | Meaning                                                                                   | Applies to                                                                        |
| ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **BUILD**    | Implemented in code and demonstrable                                                      | Everything in §2, §3, §4 unless noted                                             |
| **DOCUMENT** | Analysed and written up, not implemented                                                  | §5 regulatory and privacy requirements                                            |
| **SIMULATE** | Real logic, stubbed endpoint — the thing the endpoint would receive is genuinely produced | Payment, dispensing hardware, SMS gateway, insurance adjudication, ETA submission |

The receipt printer is real hardware and cheap, so it is BUILD rather than SIMULATE. Keep the print path behind an interface so the system still runs end-to-end if the printer is unavailable on demo day — a hardware failure in front of examiners should degrade to on-screen, not crash the flow.

The ETA e-receipt is the clearest example of SIMULATE done properly: the document structure, field set, digital signature, UUID and verification QR are all generated for real; only the HTTP call to the Tax Authority is mocked. A stub that returns `{"status":"ok"}` without building the document teaches nothing and demos nothing.

§5 is retained deliberately: a graduation project that identifies the legal constraints on its own product and explains why it cannot lawfully operate as-is demonstrates more engineering maturity than one that ignores them. **Write it up, present it, do not build to it.** Where a regulatory requirement is cheap to honour anyway (audit logging, data minimisation, PIN hashing), build it — it costs nothing and strengthens the demo.

### 0.3 Still blocking

| #       | Decision                                     | Why it blocks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **D-4** | **Recommendation engine: LLM or rule-based** | The only remaining decision that changes the architecture. Rule-based is deterministic, auditable, works offline, and costs nothing per session. An LLM needs connectivity, adds latency, costs per call, and can produce advice you cannot predict or defend. For a graduation project an LLM demos impressively; a rule-based engine is defensible under questioning. A hybrid is viable: rule-based triage with an LLM used only to phrase the explanation. **This blocks the data model — a rule engine needs symptom, rule, and mapping tables that an LLM approach does not.** |
| D-6     | Insurance data model                         | No real insurer to integrate with. Decide whether coverage rules are simple (flat percentage per policy) or realistic (per-category rules, caps, exclusions, co-pay). This changes the schema significantly.                                                                                                                                                                                                                                                                                                                                                                         |

---

## 1. Context and actors

**System boundary.** A kiosk application running locally on a 1024×600 touchscreen terminal and a separate AutoDoc clinician web portal, backed by one central service. One central backend serves the terminal fleet and AutoDoc. AutoDoc and kiosks never communicate directly.

| Actor                  | Interaction                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Guest customer         | Walks up, browses, uses symptom guidance, buys OTC, leaves. No account. Majority of traffic. |
| Account holder         | Signs in to access prescriptions, saved insurance, order history.                            |
| Prescribing doctor     | Uses AutoDoc to issue or revoke a structured prescription in a patient's central account. Never touches the kiosk. |
| Clinical assistant     | Uses AutoDoc to prepare delegated drafts; cannot sign, issue or revoke prescriptions.         |
| Remote pharmacist      | Reached from the kiosk for advice; may be required to authorise certain dispenses.           |
| Field technician       | Restocks, services, runs diagnostics. Uses a separate maintenance mode.                      |
| Operator / back office | Manages catalogue, pricing, planogram, fleet monitoring.                                     |
| Payment processor      | External, via the card terminal.                                                             |
| Insurance adjudicator  | External, per company, for eligibility and claim submission.                                 |
| Email service          | Transactional delivery of codes and receipts.                                                |

---

## 2. Functional requirements

### 2.1 Session lifecycle

- **FR-1** The terminal shall display an attract screen when idle and begin a session on first touch.
- **FR-2** Each session shall be anonymous by default; no identity is required to start.
- **FR-3** The app shall maintain an inactivity timer, warn the user before expiry, and allow extension.
- **FR-4** On expiry, cancellation, or completion, the app shall destroy all session state — cart, identity, prescription data, entered text, and cached personal data — and return to attract.
- **FR-5** A session shall never be resumable by the next person at the terminal.
- **FR-6** The app shall expose a Cancel / Start Over action from every in-session screen.
- **FR-7** Session termination during an in-flight payment or dispense shall be blocked until that operation reaches a terminal state.

### 2.2 Language

- **FR-8** The app shall support Arabic and English, non-switchable, decided by user initially.
- **FR-8a** Language shall be chosen explicitly by the user as the **first step of every session**, immediately after the attract screen — two equal side-by-side choices, ATM-style. No language is pre-selected and no default is assumed.
- **FR-9** All layouts shall mirror correctly for RTL.
- **FR-10** Product names, categories, dosage instructions, and warnings shall be stored and displayed in both languages.
- **FR-11** Numerals shall follow the selected locale convention (the design uses Arabic-Indic digits in the Arabic views).

### 2.3 Browse, search, product detail

- **FR-12** Browsing by category shall be the primary discovery path; any stocked item shall be reachable within two taps from the main menu.
- **FR-13** The app shall provide search across both languages, including partial matches, common misspellings, brand and generic names, and active ingredient.
- **FR-14** Search and browse shall show only items physically stocked in _this_ terminal.
- **FR-15** Prescription-only items shall be clearly badged and shall not be addable to the cart without a validated prescription.
- **FR-16** Product detail shall present price, active ingredient, dosage form, pack size, usage instructions, warnings, and stock status.
- **FR-17** Live stock levels shall be reflected in the UI; an item that goes out of stock mid-session shall be surfaced before checkout, not after payment.

### 2.4 Symptom guidance

- **FR-18** The app shall offer a guided, stepwise symptom flow available to guests without an account.
- **FR-19** The flow shall collect symptom, duration, and severity at minimum, and shall screen for red-flag conditions.
- **FR-20** On detecting a red flag (severe symptoms, long duration, pregnancy, paediatric age, chronic conditions, drug interactions), the app shall stop recommending and route to a pharmacist or emergency guidance.
- **FR-21** Recommendations shall be limited to OTC items stocked in this terminal, ranked, each with a plain-language rationale.
- **FR-22** A medical disclaimer shall be displayed on every recommendation screen.
- **FR-23** The app shall never state or imply a diagnosis.
- **FR-24** Symptom inputs shall be treated as health data and discarded at session end. If retained for analytics, they shall be irreversibly anonymised.

### 2.5 Cart

- **FR-25** Users shall add, remove, and change quantities of items.
- **FR-26** Quantity shall be capped per item by stock level and by any regulatory maximum.
- **FR-27** Stock for cart contents shall be soft-reserved on add, with a timeout, so two adjacent terminals or a concurrent session cannot oversell the same unit.
- **FR-28** The cart shall show a running total, itemised, before any payment step.

### 2.6 Identity and accounts

- **FR-29** Sign-in shall be requested only at the point it is needed: prescriptions, saved insurance, order history.
- **FR-30** Sign-in shall use **mobile number + 4-digit PIN**, entered on a numeric keypad with masked PIN entry.
- **FR-30a** Mobile numbers shall be validated against Egyptian numbering (11-digit national format, 010/011/012/015 prefixes) and stored in a single canonical form (E.164) regardless of how the user types them.
- **FR-31** Sign-up shall be completable at the kiosk in under two minutes and shall require verification of the mobile number via an SMS one-time code.
- **FR-32** PIN reset shall be possible at the kiosk without staff involvement, in this exact sequence: enter mobile number → _Forgot PIN?_ → SMS containing a **6-digit reset code** → enter code → set a new **4-digit PIN** → confirm new PIN → signed in.
- **FR-32a** The 6-digit reset code shall be single-use, shall expire on a short timer, and shall be invalidated once a new PIN is set or a newer code is issued.
- **FR-32b** Note the deliberate asymmetry: the **PIN is 4 digits** (typed often, protected by lockout) while the **reset code is 6 digits** (typed once, must resist guessing because it can change the PIN).
- **FR-33** A QR fast path shall allow sign-in by scanning a code from the companion app.
- **FR-34** Repeated failed PIN attempts shall lock the account temporarily, with exponential back-off, and the attempt counter shall be enforced server-side.
- **FR-34a** Because a 4-digit PIN has only 10,000 combinations, the system shall additionally rate-limit per mobile number, per terminal, and per source, and shall reject trivially guessable PINs (repeated digits, sequences, common patterns).
- **FR-34b** _(DOCUMENT, not BUILD)_ Recycled mobile numbers: in production, prolonged account inactivity would force re-verification before prescription or insurance data is exposed, so a reassigned number could not inherit a stranger's medical history. Out of scope for the project build; worth a paragraph in the report as a known production gap.
- **FR-34c** SMS delivery failure shall not strand the user — offer resend, an alternative channel where available, and a clear route to continue as a guest.
- **FR-35** Sign-out shall be automatic at session end and available manually at any time.
- **FR-36** A guest shall be able to complete an OTC purchase without ever creating an account, and account creation shall never be a precondition for payment.

### 2.7 Prescriptions

- **FR-37** A signed-in user shall see their prescriptions split into current and previous, with issuing doctor, clinic, date, and status.
- **FR-38** Prescription detail shall show each line item with quantity prescribed, quantity already dispensed, refills remaining, and availability in this terminal.
- **FR-39** The app shall clearly mark line items this terminal cannot fulfil and state why (not stocked, out of stock, not dispensable by machine).
- **FR-40** Partial fulfilment shall be supported: the user may collect what is available while the remainder stays open for another kiosk or a branch.
- **FR-41** Every dispense against a prescription shall be recorded atomically against that prescription so the same units cannot be dispensed twice at two terminals.
- **FR-42** Expired, fully dispensed, and revoked prescriptions shall be non-dispensable and clearly labelled.
- **FR-43** The system shall enforce controlled-substance rules for the target jurisdiction, including any items the machine must refuse entirely.
- **FR-44** Prescription data shall be fetched per session and never cached on the terminal beyond session end.

### 2.8 Insurance

- **FR-45** A signed-in user may have multiple insurance policies linked to their account.
- **FR-46** Insurance shall be applied as an optional, skippable step immediately before payment.
- **FR-47** Applying a policy shall recalculate the total live and show an itemised breakdown: subtotal, covered amount, patient pays.
- **FR-48** Per-item coverage differences shall be visible, including items not covered at all.
- **FR-49** Eligibility shall be verified against the insurer before the amount is treated as covered; an unverifiable policy shall not reduce the price.
- **FR-50** Insurer timeout or rejection shall degrade gracefully to full-price checkout, never blocking the sale.
- **FR-51** Claim submission shall be reconciled against actual dispensed items, not the pre-dispense cart, so a partial dispense does not over-claim.

### 2.9 Payment

- **FR-52** The app shall support card payment via the integrated terminal, and cash if the hardware is fitted.
- **FR-53** The app shall never handle raw card data; all capture occurs on the certified reader.
- **FR-54** Payment screens shall give explicit physical instructions ("insert your card") and live status.
- **FR-55** Authorisation shall precede dispensing; capture shall follow successful dispensing.
- **FR-56** A failed or declined payment shall return the user to a recoverable state with the cart intact and an alternative offered.
- **FR-57** Payment shall be idempotent: no retry, timeout, or reconnect may charge a customer twice.

### 2.10 Dispensing

- **FR-58** The app shall command the dispensing subsystem per item and track per-item outcome.
- **FR-59** Dispensing progress shall be shown live, with a clear instruction to collect from the drawer.
- **FR-60** A dispense failure after a successful charge shall trigger an automatic refund or credit, notify the user on screen with a reference number, and raise an operational alert.
- **FR-61** The app shall not consider an order complete until every item is confirmed dispensed or explicitly reconciled as failed.
- **FR-62** Inventory shall be decremented on confirmed dispense, not on payment.
- **FR-63** The app shall detect and report an uncollected drawer.

### 2.11 Receipts and order history

- **FR-64** Every completed order shall generate a receipt available by three routes: **printed** at the terminal, **emailed**, and **stored in the account**.
- **FR-64a** For a signed-in user the receipt shall **always** be stored against the account immediately on completion, independently of any delivery choice made at the terminal, and shall be retrievable from **any terminal in the fleet** at any time. Account storage is the durable copy; print and email are convenience copies.
- **FR-64b** Print shall be offered to every user, signed in or guest. It is the primary route for guests, who have no account to store into and may not wish to type an email address.
- **FR-64c** Email shall be offered alongside account storage for signed-in users, pre-filled where an address is on file so it costs a single tap.
- **FR-64d** The completion screen shall also **display** the receipt — line items, insurance breakdown, total, order reference — so it can be read or photographed before the user leaves.
- **FR-64e** Printer faults (paper out, jam, offline) shall be detected **before** the print option is offered; the option shall be hidden or disabled rather than failing after selection. Paper level shall be reported on the fleet monitoring heartbeat (FR-74).
- **FR-64f** A print failure after a completed sale shall never lose the receipt: fall back to on-screen display and offer email.
- **FR-64g** PDF download shall be offered in the web/companion account, not on the kiosk. A kiosk has no user device attached, so a download there would write a file to the terminal's own filesystem where the user can never retrieve it.
- **FR-65** A user choosing email shall enter the address via the keyboard overlay; a visible skip shall always be present and skipping shall not block completion.
- **FR-66** A guest shall be offered optional account creation after payment, which shall retroactively attach the just-completed receipt to the new account; this shall be skippable and shall not block completion.
- **FR-67** Signed-in users shall access receipt history from any terminal, with full line items, insurance breakdown, reprint and resend-by-email at the kiosk, and PDF download on the web.
- **FR-68** _(SIMULATE)_ Every sale shall generate an **Egyptian Tax Authority e-receipt** in ETA's structured format, carrying issuer and branch identifiers, terminal serial, timestamp, item lines, VAT detail, totals, currency, and a UUID. Since a real taxpayer registration and e-seal certificate are unobtainable for an academic project, the document shall be signed with a self-generated key and the submission endpoint mocked — structure, signing, UUID and QR generation are real; only the transmission is stubbed.
- **FR-68a** The ETA verification QR shall be generated as part of the e-receipt and shall appear on the printed and emailed forms. It is a tax-verification artifact, not a download link; for this project it will not resolve against the real ETA portal, so point it at your own verification page or state plainly in the demo that it is inert.
- **FR-68b** ETA submission shall be queued and retried within the permitted submission window; an ETA outage shall never block a sale or hold the customer at the machine.
- **FR-68c** ETA acceptance and rejection responses shall be processed, persisted, and alerted on.

### 2.12 Help, emergencies, edge cases

- **FR-69** A pharmacist contact action shall be available from every screen.
- **FR-70** An emergency screen shall provide Egyptian emergency numbers — **112 unified, 123 ambulance** — the nearest hospital, and this terminal's exact physical location, and shall state plainly that the kiosk cannot help in an emergency.
- **FR-71** The app shall present designed states for: out of stock, partial fulfilment, payment declined, insurance rejected or unreachable, network offline, session timeout warning, dispense failure, and terminal out of service.
- **FR-72** Every error state shall offer at least one forward action and shall never dead-end.
- **FR-73** When the terminal cannot trade, the attract screen shall say so before the user invests effort in a session.

### 2.13 Operations and administration

- **FR-74** The terminal shall report health, stock levels, peripheral status, and connectivity to the central service on a heartbeat.
- **FR-75** Catalogue, pricing, and planogram shall be centrally managed and pushed to terminals.
- **FR-76** The system shall track batch and expiry per stocked unit and shall block dispensing of expired stock.
- **FR-77** A maintenance mode shall be reachable by an authenticated technician for restocking and diagnostics, and shall be inaccessible to the public.
- **FR-78** Software updates shall be deployable remotely to the fleet and shall never interrupt an active session.
- **FR-79** The system shall retain a full audit trail of every dispense, payment, prescription action, and insurance claim.

### 2.14 AutoDoc clinician portal

- **FR-80** AutoDoc shall be an independent web application that shares AutoPharm design tokens and core UI components but has its own routes, build, authentication policy and authorization boundary.
- **FR-81** AutoDoc shall communicate only with the central backend and shall never connect directly to a kiosk terminal.
- **FR-82** Clinician accounts shall be invitation-only; AutoDoc shall not offer a public "register as a doctor" workflow.
- **FR-83** A clinician account shall be bound server-side to a fictional record in the project's simulated Egyptian professional registry before prescribing access can be approved.
- **FR-84** Clinicians shall use a strong password and multi-factor authentication. Signing a prescription shall require recent authentication or explicit reauthentication.
- **FR-85** AutoDoc shall distinguish organization administrator, prescriber and clinical-assistant roles. Administrative authority shall not imply prescribing authority.
- **FR-86** A clinical assistant may prepare a prescription draft when delegated but shall not issue, sign or revoke a prescription.
- **FR-87** The prescriber shall select a uniquely matched patient record and confirm patient identity details before signing. A prescription shall not be attached solely from an unverified typed mobile number.
- **FR-88** The authoritative prescription shall be structured data, not an uploaded PDF or image. It shall record patient, prescriber, clinic, issue and expiry timestamps, medicine identifiers, dosage instructions, quantity, refill rules, status and signature metadata.
- **FR-89** Only an authorized prescriber within valid simulated scope shall move a prescription from ready-for-review to signed/issued.
- **FR-90** AutoDoc shall support prescription revocation with a required reason, actor and timestamp. Signed clinical content shall be versioned rather than overwritten.
- **FR-91** Every AutoDoc login, invitation, privilege change, draft, signature, issue and revocation action shall be audit-logged.
- **FR-92** Controlled and narcotic medicines shall be excluded from the AutoDoc prototype.
- **FR-93** AutoDoc shall show prescription delivery/status information from the central backend but shall not directly command dispensing hardware.

---

## 3. Non-functional requirements

### 3.1 Performance

- **NFR-1** Touch feedback within 100 ms; screen transitions under 300 ms.
- **NFR-2** Search results within 500 ms for the local catalogue.
- **NFR-3** Cold boot to attract screen within 60 s after power-on.
- **NFR-4** A complete guest OTC purchase achievable in under 90 seconds.
- **NFR-5** Any operation exceeding 500 ms shall show progress feedback.

### 3.2 Availability and resilience

- **NFR-6** Target 99.5% terminal availability during trading hours.
- **NFR-7** The catalogue, browse, search, symptom guidance, and cart shall function with the network down.
- **NFR-8** Prescriptions, insurance, account sign-in, and card payment require connectivity; their unavailability shall degrade gracefully to a clearly explained cash-and-OTC mode rather than taking the terminal offline.
- **NFR-9** No single failure — network, backend, insurer, email — shall be able to take money without delivering goods, or deliver goods without recording the transaction.
- **NFR-10** Transactions interrupted by power loss shall be reconciled automatically on restart.
- **NFR-11** Outbound transactional email shall be queued and retried.

### 3.3 Usability and accessibility

- **NFR-12** Fixed 1024×600 landscape; no layout may require scrolling as its primary interaction.
- **NFR-13** Touch targets ≥56 px; primary actions ≥64 px.
- **NFR-14** Body text ≥18 px; nothing below 15 px.
- **NFR-15** Contrast shall meet WCAG 2.1 AA at minimum, chosen for readability under bright ambient light.
- **NFR-16** The interface shall be operable by a first-time user with no instruction and no prior exposure.
- **NFR-17** Content shall be written at a general-public reading level in both languages, avoiding clinical jargon.
- **NFR-18** No interaction shall depend on hover, precise pointing, multi-touch, or sustained fine motor control.

### 3.4 Maintainability and fleet scale

- **NFR-19** The architecture shall support a fleet of terminals from one central service, with per-terminal catalogue and planogram.
- **NFR-20** Content, pricing, and copy shall be changeable without redeploying the terminal application.
- **NFR-21** Terminals shall be individually identifiable in all logs, transactions, and receipts.
- **NFR-22** The terminal app shall self-recover from a crash back to the attract screen without manual intervention.

### 3.5 Observability

- **NFR-23** Structured logging of session funnel, errors, peripheral events, and abandonment points.
- **NFR-24** Alerting on dispense failure, payment anomaly, low stock, peripheral fault, and terminal unreachable.
- **NFR-25** Analytics shall never log personal or health data in identifiable form.

---

## 4. Security requirements

- **SEC-1** All traffic between terminal and backend shall be TLS 1.2+ with certificate validation; a terminal shall refuse to operate on an untrusted connection.
- **SEC-2** Each terminal shall hold its own cryptographic identity and authenticate to the backend; terminal credentials shall be revocable centrally.
- **SEC-3** PINs shall be stored only as salted hashes with a modern KDF, never in plaintext or recoverable form, and never on the terminal.
- **SEC-4** Authentication, rate limiting, lockout, and all authorisation decisions shall be enforced server-side. The terminal is untrusted.
- **SEC-5** PIN and code entry shall be masked, resistant to shoulder-surfing, and shall not appear in logs, analytics, crash reports, or screenshots.
- **SEC-6** The terminal shall run in a locked-down kiosk mode with no access to the OS, browser chrome, file system, developer tools, external navigation, or system settings.
- **SEC-7** Ports, debug interfaces, and remote-access channels shall be disabled or authenticated in production.
- **SEC-8** Card data shall never enter application scope; the integration shall be designed to keep the app out of PCI DSS scope as far as possible, and the residual scope shall be documented.
- **SEC-9** Session tokens shall be short-lived, bound to the terminal and session, and invalidated on session end.
- **SEC-10** Personal and health data shall be encrypted at rest centrally and shall not be persisted on the terminal.
- **SEC-11** Prescription access shall be authorised per request against the authenticated account; a terminal shall never be able to enumerate prescriptions.
- **SEC-12** All privileged actions — maintenance mode, restock, price change, refund — shall require authenticated identity and shall be audit-logged immutably.
- **SEC-13** Input from every source shall be validated server-side; the recommendation engine, if LLM-based, shall be treated as an untrusted output channel and constrained to a fixed catalogue of permitted recommendations.
- **SEC-14** The system shall defend against automated abuse of the code-sending endpoints (email bombing, enumeration of registered accounts).
- **SEC-15** Physical tamper events shall be detectable and shall raise an alert.

---

## 5. Privacy and regulatory — Egypt

> **Scope: DOCUMENT, not BUILD.** This section is written up for the report and defence, not implemented. It is a legal summary, not legal advice. If this project were ever commercialised, every item here would need confirmation by an Egyptian lawyer with pharmacy-sector experience.

### 5.1 Pharmacy practice — the project's largest open risk

Pharmacy practice in Egypt is regulated by the Ministry of Health and the **Egyptian Drug Authority (EDA)**, with **Law No. 127 of 1955** as the foundational statute. That law frames pharmacy as a licensed technical profession: the pharmacist prepares and dispenses medicines, dispensing of prescription-only medicines follows a licensed physician's prescription, and the pharmacist may not determine treatment or dosage for prescription-only drugs.

Nothing in the available public material establishes a framework authorising an **unattended machine** to perform dispensing without a licensed pharmacist. Three consequences:

- **REG-1** In a commercial deployment the legal basis for automated dispensing would have to be established with the EDA before development. This project proceeds on the explicit stated assumption that it is a non-operational prototype.
- **REG-2** A commercial version would likely need a **pharmacist-in-the-loop**: a licensed pharmacist reviewing and authorising dispenses remotely, with identity and decision recorded per transaction. Worth naming in the report as the single largest gap between the prototype and a deployable product, since it is architectural rather than cosmetic.
- **REG-3** The symptom-recommendation feature sits close to the line Law 127 draws around determining treatment. Even in a prototype, constrain it strictly to OTC guidance and keep the disclaimer prominent — an examiner will probe this, and "we recognised the boundary and designed within it" is a much better answer than not having noticed.

### 5.2 Other Egyptian regulatory requirements

- **REG-4** Only products registered with the EDA may be dispensed; displayed product information shall match approved labelling.
- **REG-5** Pricing shall respect Egypt's regulated medicine pricing regime.
- **REG-6** Controlled and narcotic substances shall be handled per the Egyptian schedule, up to and including outright exclusion from the machine. Recommended default for v1: **exclude entirely.**
- **REG-7** The system shall be able to report dispensing events to Egypt's pharmaceutical **track-and-trace regime (EPTTS)**, which monitors EPCIS events including dispensing. This implies capturing serialisation data per pack at restock and at dispense.
- **REG-8** Recall handling: the system shall be able to identify and immobilise affected batches across the fleet on command.
- **REG-9** VAT shall be applied per Egyptian rules, with medicine-specific treatment confirmed with a tax adviser.

### 5.3 Data protection — PDPL

Egypt's **Personal Data Protection Law No. 151 of 2020** became fully operational with Executive Regulations issued by Decree No. 816 on 1 November 2025, supervised by the **Personal Data Protection Centre (PDPC)**. A one-year grace period runs to **31 October 2026** — which is roughly two months from now, so this system will be built into a fully enforced regime, not a permissive one.

- **PRV-1** Prescription contents, symptom inputs, and purchase history constitute **health data** and shall be treated as sensitive personal data under the PDPL.
- **PRV-2** The applicable **PDPC licences or permits** shall be identified early — the licensing regime attaches to collecting, storing, transferring and processing electronic personal data, with separate licences for cross-border transfer, electronic marketing, and video surveillance. **Any camera on the kiosk may trigger the surveillance licence.** The PDPC application portal was expected to open around mid-2026; confirm current status.
- **PRV-3** A **Data Protection Officer** shall be appointed if the Regulations require one for this processing profile.
- **PRV-4** **Data residency:** hosting personal data outside Egypt is a cross-border transfer requiring authorisation. This constrains cloud region choice and must be settled before infrastructure is procured.
- **PRV-5** Consent shall be explicit, informed, and recorded; the privacy notice shall be reachable on the terminal in Arabic and English before any personal data is entered.
- **PRV-6** Data minimisation: guests shall remain unidentified, and the kiosk shall collect only what the transaction requires.
- **PRV-7** Screens showing personal or prescription data shall auto-clear on a short timer independent of the main session timeout.
- **PRV-8** Users shall be able to exercise access, correction, erasure, and objection rights.
- **PRV-9** Retention shall be defined per data class: dispensing records kept as long as pharmacy and tax law require (tax records at least five years), symptom and analytics data anonymised early.
- **PRV-10** Breach notification procedures shall meet the PDPC's timelines.
- **PRV-11** Processor contracts (SMS gateway, payment processor, cloud host, email provider) shall carry PDPL-compliant terms.
- **PRV-12** No camera imagery shall be retained beyond the decode operation it was captured for.

---

## 6. Integration requirements

| Integration                                                                                        | Direction            | Criticality                     | Failure behaviour                                                                   |
| -------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| Dispensing controller                                                                              | Bidirectional, local | Blocking                        | Terminal cannot trade; report out of service                                        |
| Payment terminal (Meeza, Visa/Mastercard via local acquirer; mobile wallets, InstaPay if in scope) | Bidirectional, local | Blocking for card               | Fall back to cash if fitted, else out of service                                    |
| Thermal receipt printer (ESC/POS, USB or serial)                                                   | Outbound, local      | Optional                        | Hide the print option; fall back to on-screen and email                             |
| QR / camera                                                                                        | Inbound, local       | Optional                        | Fall back to manual entry                                                           |
| Central backend                                                                                    | Bidirectional        | Partial                         | Offline mode: OTC + cash only                                                       |
| SMS gateway (OTP)                                                                                  | Outbound             | Blocking for sign-in/sign-up    | Retry, offer resend, guest route stays open                                         |
| **ETA e-receipt system**                                                                           | Outbound             | Deferred-blocking               | Queue and retry within the permitted window; never hold the customer                |
| **EPTTS track & trace**                                                                            | Outbound             | Deferred-blocking               | Queue dispense events; reconcile when connectivity returns                          |
| Insurance adjudicator / TPA                                                                        | Outbound             | Optional                        | Skip insurance, full price                                                          |
| AutoDoc prescription source                                                                        | Internal via central API | Optional for kiosk operation | AutoDoc unavailable: existing central prescriptions remain available; creating new prescriptions is unavailable; OTC kiosk mode continues |
| Email service                                                                                      | Outbound             | Optional                        | Queue and retry; never block a sale                                                 |
| Remote pharmacist                                                                                  | Bidirectional        | **Possibly blocking — see D-4** | If pharmacist authorisation is legally required, no dispense may proceed without it |

---

## 7. Constraints and assumptions

- **C-1** 1024×600 landscape touchscreen, finger input, no physical keyboard.
- **C-2** 50–150 SKUs per terminal — small enough to browse exhaustively.
- **C-3** Unattended public placement; every user is assumed to be a stranger and a first-time user.
- **C-4** Bilingual Arabic/English is mandatory. The user picks the language at the start of every session; neither is pre-selected.
- **C-6** Currency is EGP. Prices are regulated and change by government decision, so pricing must be centrally updatable at short notice.
- **C-7** Cash remains significant in the Egyptian retail market; a card-only terminal will exclude a meaningful share of customers.
- **C-5** Network connectivity is assumed intermittent, not guaranteed.
- **A-1** Doctors issue structured digital prescriptions through AutoDoc into the central backend and never interact directly with a kiosk terminal.
- **A-2** Restocking is manual and periodic; the app does not control inventory arrival.
- **A-3** A licensed pharmacist is reachable during defined hours. **If D-4 requires pharmacist authorisation per dispense, this assumption becomes a hard requirement with implications for operating hours and staffing.**
- **A-4** The operator holds, or can obtain, the pharmacy licence under which these machines trade.

---

## 8. Explicitly out of scope (v1)

Enclosure, robotics, refrigeration, and physical security design · the insurer's own systems · back-office ERP and procurement · delivery of any kind · real professional-registry, EDA, Ministry, Surescripts or pharmacy-network integration · controlled/narcotic prescribing in AutoDoc.
