# Feature 2 — Catalogue and Cart

Owner: **FE Member 1**. Status: ⏳ Not implemented.

Everything for this feature lives in this folder. Nothing outside it needs to change:

- `routes.tsx` — already spread into `src/routes/index.tsx`. Add screens here.
- `i18n/{en,ar}.ts` — already merged into the `kiosk` namespace by `src/i18n/index.ts`.
  Keep `ar.ts` typed as `Localised<typeof catalogueEn>` so `npm run typecheck` catches drift.
- Add `pages/`, `components/`, `catalogueStore.ts` alongside them as needed.

Reuse, do not duplicate:

- `@/shared/api` — `request<T>()`, `ApiError`, the kiosk session headers. The terminal key is
  injected by the proxy, never by client code.
- `@/shared/ui` — `KioskScreen` chrome, `Button`, `TextField`, `Alert`, `Spinner`,
  and `KeyboardSheet` (the 300px on-screen keyboard; `layout="en" | "ar" | "num"`) which the
  product search needs.
- `@/shared/hooks` — `useCountdown`, `useDirection`, `useAutoClear`.
- `@/features/session/sessionStore` — the kiosk session. Key carts off `session.sessionId`,
  never off a user id: guests have no user (FR-36).
- `@/features/auth/authStore` — read `mode === 'authenticated'` if something is account-only.
  Do not implement sign-in here; call `beginAuth()` and let Feature 4 handle it.
