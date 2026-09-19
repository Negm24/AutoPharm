# AutoPharm Kiosk Frontend

Frontend foundation for the AutoPharm pharmacy kiosk. This is **one React + Vite + TypeScript application** with client-side routing, English/Arabic i18n, RTL/LTR support, and a session-based kiosk flow.

## Architecture

- Single React + Vite + TypeScript application
- Client-side routing via react-router-dom
- i18n via react-i18next (English + Arabic)
- RTL/LTR direction switching via `document.documentElement.dir`
- Session state via Zustand
- Tailwind CSS with semantic theme tokens in `src/index.css`

## Current scope

This repository contains the **Kiosk frontend only** — one React + Vite + TypeScript application for the pharmacy kiosk touchscreen experience.

**AutoDoc** (the clinician web portal) is a planned separate React + Vite application. It is **not** implemented in this repository. When built, it will share the design system and communicate with the same Django backend, but will have its own routes, build, and authentication policy.

## Project structure

```
src/
├── App.tsx
├── main.tsx
├── index.css
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── en.ts
│       └── ar.ts
├── pages/
│   ├── KioskAttract.tsx
│   ├── KioskLanguagePage.tsx
│   └── KioskMenuPage.tsx
├── routes/
│   └── index.tsx
├── stores/
│   └── sessionStore.ts
└── components/
    └── SessionTimer.tsx
```

## Scripts

- `npm run dev` — start dev server
- `npm run build` — typecheck + build
- `npm run preview` — preview production build

## Routes

- `/` → redirects to `/kiosk/attract`
- `/kiosk/attract` — Kiosk Attract screen
- `/kiosk/language` — Language selection
- `/kiosk/menu` — Main Menu

## Translations

- Add keys to `src/i18n/locales/en.ts` and `src/i18n/locales/ar.ts`
- Use `useTranslation()` in components
- Brand name is `Pharma` / `فارما` via `kiosk.brandName`

---

# Implementation Status

## Feature 1 — Session, Language and Shell

**Status: ✅ Implemented**

Current implementation includes:

- Kiosk Attract screen
- Language selection (English / Arabic)
- English and Arabic translations
- RTL/LTR switching (`document.documentElement.dir`)
- Main Menu
- Navigation between kiosk screens
- Session state (Zustand)
- Session countdown timer
- Single session timer (`setInterval` in `sessionStore.startSession`)
- Session expiration handling
- Start Over
- Session cleanup
- Return to Attract (`/kiosk/attract`)
- Theme / semantic color foundation (`--color-emergency`, `--color-warning`, etc.)
- Pharma / فارما branding
- Route structure:

  - `/kiosk/attract`
  - `/kiosk/language`
  - `/kiosk/menu`

Frontend remains **one React + Vite + TypeScript application**:

```
src/pages/
├── KioskAttract.tsx
├── KioskLanguagePage.tsx
└── KioskMenuPage.tsx
```

---

# Upcoming frontend features

## Feature 2 — Catalogue and Cart

Owner: **FE Member 1**

**Status: ⏳ Not implemented**

Purpose: Implement the complete product browsing and cart experience inside the existing AutoPharm React application.

Scope:

- Category browsing
- Product catalogue
- Product listing
- Product search
- English/Arabic product search
- Product details
- Product image/visual information where provided by the backend
- Stock status
- Quantity controls
- Add to cart
- Remove from cart
- Update cart quantities
- Cart summary
- Reservation UI
- Reservation expiration handling
- Loading states
- Empty states
- Out-of-stock states
- Offline/error states

Integration:

- Use the existing kiosk session.
- Respect selected language.
- Respect RTL/LTR.
- Use the existing theme and semantic color system.
- Use backend APIs once available.
- Mock APIs may be used during backend development when necessary.
- Do not implement symptom guidance here.
- Do not implement customer authentication here.

Architecture: Feature 2 must remain inside the existing React/Vite/TypeScript application. Do NOT create another frontend, Vite app, package.json, build, micro-frontends, or separate AutoDoc frontend.

---

## Feature 3 — Symptom Guidance

Owner: **FE Member 2**

**Status: ⏳ Not implemented**

Purpose: Implement the guided symptom-assessment flow for appropriate stocked OTC recommendations.

Scope:

- Symptom selection
- Symptom questions
- Duration
- Severity
- Question progression
- Progress indicator
- Answer selection
- Red-flag handling
- Pharmacist escalation
- Recommendation results
- Recommendation rationale
- Safety/disclaimer messaging
- Clear/restart assessment
- Loading state
- Error state
- No-results state

Integration:

- Use the existing kiosk session.
- Respect English/Arabic.
- Respect RTL/LTR.
- Consume backend symptom-guidance APIs.
- Display recommendations returned by the backend/rules engine.
- Respect stock availability where required by the backend contract.
- Do not implement customer authentication here.
- Do not implement cart ownership or checkout logic here.

Safety boundary: The frontend must not invent medical recommendations or implement independent medical rules that conflict with the backend rules engine. The backend remains responsible for deterministic symptom/risk evaluation and recommendation logic.

Architecture: Feature 3 must remain inside the existing React/Vite/TypeScript application.

---

## Feature 4 — Customer Authorization

Owner: **FE Member 3**

**Status: ⏳ Not implemented**

Purpose: Implement customer authentication and authorization flows required by the kiosk.

Scope:

- Phone number entry
- Login
- PIN keypad
- PIN authentication
- Customer signup
- SMS/OTP verification
- OTP resend
- Forgot PIN
- PIN reset
- Failed-attempt handling
- Lockout state
- Guest fallback
- Authenticated customer state
- QR authentication boundary

Integration:

- Use backend authentication APIs.
- Never store raw PINs in the frontend.
- Respect the existing kiosk session.
- Respect English/Arabic.
- Respect RTL/LTR.
- Handle loading, error, verification, lockout, and recovery states.
- Clearly separate guest and authenticated flows.
- Do not implement catalogue logic here.
- Do not implement symptom guidance here.

Architecture: Feature 4 must remain inside the existing React/Vite/TypeScript application. Do NOT create another frontend, Vite app, package.json, build, micro-frontends, or separate AutoDoc frontend.

---

# Feature boundaries

| Feature                                 | Owner       | Responsibility                                    |
| --------------------------------------- | ----------- | ------------------------------------------------- |
| Feature 1 — Session, Language and Shell | Done (Boda) | Kiosk shell, language, RTL/LTR, session lifecycle |
| Feature 2 — Catalogue and Cart          | FE Member 1 | Products, search, stock, cart, reservation        |
| Feature 3 — Symptom Guidance            | FE Member 2 | Assessment, red flags, recommendations            |
| Feature 4 — Customer Authorization      | FE Member 3 | Login, PIN, OTP, signup, recovery, lockout        |

All features integrate through the existing routing, shared UI/theme, i18n, session state, API client, and shared contracts. Do not duplicate language state, session state, routing, API configuration, theme, authentication state, or i18n.
