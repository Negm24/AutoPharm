# AutoPharm Kiosk Frontend

Frontend for the AutoPharm pharmacy kiosk. This is **one React + Vite + TypeScript application** with client-side routing, English/Arabic i18n, RTL/LTR support, and a session-based kiosk flow.

## Architecture

- Single React + Vite + TypeScript application
- Client-side routing via react-router-dom
- i18n via react-i18next (English + Arabic)
- RTL/LTR direction switching via `document.documentElement.dir`
- Session state via Zustand
- Tailwind CSS with semantic theme tokens in `src/index.css`
- Backend access through one shared API client in `src/shared/api`

## Current scope

This repository contains the **Kiosk frontend only** — one React + Vite + TypeScript application for the pharmacy kiosk touchscreen experience.

**AutoDoc** (the clinician web portal) is a planned separate React + Vite application. It is **not** implemented in this repository. When built, it will share the design system and communicate with the same Django backend, but will have its own routes, build, and authentication policy.

## Project structure

The code is organised **by feature**, so each owner works in their own folder and nobody
edits a shared route table or a shared translation file.

```
src/
├── App.tsx  main.tsx  index.css  env.d.ts
├── routes/index.tsx          composition seam: spreads every feature's routes
├── i18n/
│   ├── index.ts              composition seam: merges every feature's bundle
│   ├── types.ts              Localised<T> — keeps ar.ts in step with en.ts
│   └── locales/{en,ar}.ts    shell and shared chrome strings
├── shared/                   built by Feature 4, used by all features
│   ├── api/                  http client, ApiError, in-memory token store
│   ├── ui/                   KioskScreen, Button, TextField, Alert, Spinner,
│   │                         DigitBoxes, KeyboardSheet, SensitivePanel
│   ├── hooks/                useCountdown, useDirection, useAutoClear
│   └── format/               duration (M:SS), digits (ASCII folding)
└── features/
    ├── session/              Feature 1 — shell, language, session lifecycle
    ├── auth/                 Feature 4 — customer authorization
    ├── catalogue/            Feature 2 — stub, ready for FE Member 1
    └── symptoms/             Feature 3 — stub, ready for FE Member 2
```

**Adding a feature** is one import line and one spread in `src/routes/index.tsx`, plus one
import pair and one argument in `src/i18n/index.ts`. Nothing else is shared state.

Imports may use the `@/` alias (`@/shared/ui`) or relative paths; both resolve to `src/`.

## Scripts

- `npm install` — first time, use `npm install --legacy-peer-deps` if npm 10.4 fails resolving vitest's peers
- `npm run dev` — start dev server on :5173 (proxies `/api` to the backend)
- `npm run build` — typecheck + build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — oxlint
- `npm test` — vitest (validation, gateway rules, auth state machine)
- `npm run preview` — preview production build

## Environment

Copy `.env.example` to `.env.local`. Two groups:

- `VITE_*` are compiled into the browser bundle — never put a secret there.
- Everything else is read by `vite.config.ts` in Node and never reaches the browser.

`KIOSK_TERMINAL_KEY` is the important one: every `/api/v1/auth/kiosk/*` call needs an
`X-Terminal-Key` header, and the backend's `Terminal` model explicitly forbids putting that
credential in browser JavaScript. The **dev proxy injects it**, and `nginx.conf.template`
does the same in production via `TERMINAL_KEY`.

## Routes

| Path | Screen |
| --- | --- |
| `/` | redirects to `/kiosk/attract` |
| `/kiosk/attract` | Attract screen |
| `/kiosk/language` | Language selection |
| `/kiosk/menu` | Main menu |
| `/kiosk/auth/gate` | Sign-in gate — explains why before asking |
| `/kiosk/auth/phone` | Mobile number entry |
| `/kiosk/auth/pin` | Masked 4-digit PIN entry |
| `/kiosk/auth/signup` | Create an account, step 1 of 2 |
| `/kiosk/auth/signup/verify` | 6-digit SMS code, step 2 of 2 |
| `/kiosk/auth/reset/verify` | Forgot PIN — enter the reset code |
| `/kiosk/auth/reset/pin` | Set and confirm a new PIN |
| `/kiosk/auth/locked` | Lockout countdown |
| `/kiosk/auth/unavailable` | Sign-in unavailable, cash-and-OTC mode |
| `/kiosk/auth/qr` | QR handoff boundary (behind `VITE_AUTH_QR_ENABLED`) |
| `/kiosk/account` | Signed-in state and manual sign-out |

## Translations

- Shell strings: `src/i18n/locales/{en,ar}.ts`. Feature strings: `src/features/<name>/i18n/{en,ar}.ts`
- Write non-ASCII as `\uXXXX` escapes, as the rest of the codebase does
- Type the Arabic bundle as `Localised<typeof someEn>` so `npm run typecheck` catches drift
- Use `useTranslation()` in components; brand name is `Pharma` / `فارما` via `kiosk.brandName`

---

# Implementation Status

## Feature 1 — Session, Language and Shell

Owner: **Boda** — **Status: ✅ Implemented**

Attract screen, language selection, English/Arabic translations, RTL/LTR switching, main
menu, session state and countdown, session expiry, Start Over, theme tokens.

Moved into `src/features/session/` during the Feature 4 restructure. Behaviour unchanged.

---

## Feature 2 — Catalogue and Cart

Owner: **FE Member 1** — **Status: ⏳ Not implemented**

Purpose: the complete product browsing and cart experience.

Scope: category browsing · product catalogue · listing · search (English/Arabic) · product
details · images · stock status · quantity controls · add/remove/update cart · cart summary ·
reservation UI and expiry · loading, empty, out-of-stock, offline and error states.

Integration: use the existing kiosk session, language, RTL/LTR, theme, and the shared API
client. `KeyboardSheet` already provides the on-screen keyboard the search box needs. Do not
implement symptom guidance or customer authentication here.

See `src/features/catalogue/README.md`.

---

## Feature 3 — Symptom Guidance

Owner: **FE Member 2** — **Status: ⏳ Not implemented**

Purpose: the guided symptom-assessment flow for appropriate stocked OTC recommendations.

Scope: symptom selection · questions · duration · severity · progression · progress
indicator · answer selection · red-flag handling · pharmacist escalation · recommendation
results and rationale · safety messaging · clear/restart · loading, error and no-result states.

Safety boundary: the frontend must not invent medical recommendations or implement rules
that conflict with the backend rules engine.

See `src/features/symptoms/README.md`.

---

## Feature 4 — Customer Authorization

Owner: **FE Member 3** — **Status: ✅ Implemented**

Mobile number + 4-digit PIN, SMS verification, PIN reset, lockout, and a guest route that is
never hidden.

**Screens**: sign-in gate · phone entry · masked PIN keypad · sign-up (2 steps) · 6-digit
code verification with resend timer · forgot-PIN reset · lockout countdown · sign-in
unavailable · QR handoff boundary · account and manual sign-out.

**Behaviour that mirrors the backend** (`apps/accounts/security/` and `services/kiosk.py`):

- PIN is exactly 4 ASCII digits and rejects repeated digits, sequences and a blocklist
- Verification codes are 6 digits, expire in 180s, and the 5th wrong entry destroys the challenge
- Resend is locked for 30s, matching the server's SMS rate limit
- Lockout runs 30s → 60s → 120s → 240s → 480s → 900s, and is **presentational only**: the
  server's 429 always wins
- Egyptian numbers are validated on 010/011/012/015 and sent as canonical E.164

**Security**: the access token lives in a module closure in `src/shared/api/tokenStore.ts`,
never in a store, `localStorage`, `sessionStorage` or a cookie. The PIN is never stored
anywhere — it is a component `useState`, passed as an argument, and cleared in a `finally`.
Everything is wiped on session end, Start Over and unload.

**Guest is the default.** It is the absence of a user on the kiosk session, not a call to an
endpoint, and "Continue as guest" appears on every auth screen including lockout and outage.

### Talking to the backend

The kiosk always calls the real Django API at `/api/v1/auth/kiosk/*`. There is no in-browser
substitute and no runtime switch: `mockGateway.ts` is imported only by its own Vitest file,
so it is absent from every dev and production build.

**The backend must be running before any auth screen works.** Otherwise every one of them
shows "Sign-in unavailable", which is the designed degradation — guest shopping still works.

```powershell
docker compose up -d db redis
cd backend
uv run python manage.py migrate
uv run python manage.py runserver
uv run python manage.py provision_terminal --name "Demo Kiosk"   # prints the secret ONCE
```

Put that secret in `kiosk/frontend/.env.local` as `KIOSK_TERMINAL_KEY`. Every kiosk call
needs an `X-Terminal-Key` header, and the backend forbids that credential being in browser
JavaScript, so the dev proxy attaches it (nginx does the same in production).

Local SMS and email are simulations. To read a verification code, as an operator would:

```powershell
uv run python manage.py show_demo_message --phone +201012345678
uv run python manage.py show_demo_message --email you@example.test
```

That command **consumes** the message — a second run reports none and you must resend.
Codes live 180 seconds. Rate limits are real: one SMS per 30s per number, ten OTP requests
per 300s per number, three signup emails per 600s per address.

Supplying an email at signup is optional, but when given the backend issues a **second**
code to it and `signup/verify/` requires both; the verification screen asks for them in
sequence.

---

# Feature boundaries

| Feature | Owner | Responsibility |
| --- | --- | --- |
| Feature 1 — Session, Language and Shell | Done (Boda) | Kiosk shell, language, RTL/LTR, session lifecycle |
| Feature 2 — Catalogue and Cart | FE Member 1 | Products, search, stock, cart, reservation |
| Feature 3 — Symptom Guidance | FE Member 2 | Assessment, red flags, recommendations |
| Feature 4 — Customer Authorization | Done | Login, PIN, OTP, signup, recovery, lockout |

All features integrate through the existing routing, shared UI/theme, i18n, session state,
API client and shared contracts. Do not duplicate language state, session state, routing, API
configuration, theme, authentication state, or i18n.

Keep every feature inside this application. Do **not** create another frontend, Vite app,
`package.json`, build, micro-frontend, or a separate AutoDoc frontend.

## Known issues

- The Arabic strings in `src/i18n/locales/ar.ts` (Feature 1) are machine-translated and
  several decode to non-words — `kiosk.startOver` and `kiosk.terminalLabel` among them. They
  need a native reader before any Arabic demo.
- `kiosk.emergency` says "Dial 997", which is Saudi. FR-70 requires the Egyptian numbers
  (112 unified, 123 ambulance).
- `src/features/session/constants.ts` is imported by nothing; `sessionStore` hardcodes the
  10-minute duration twice. FR-3's warn-before-expiry and extend is still unimplemented, and
  the backend now offers `sessions/extend/` for exactly that.
