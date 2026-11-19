@~/.claude/icp/RULES.md

# Remohusen

Website and admin panel for Remohusen, a Swedish construction/renovation company.
Public site (sv/en) plus a lazy-loaded admin CMS: slides, news, about page, images,
contact messages, editors, and business documents (quotes/invoices/credit notes with
on-demand PDF, sharing links, and an accounting-preparation export).

## Layout: flat (one backend, one frontend)

- `canisters/backend` (`backend`): Motoko, `mo:core`, enhanced orthogonal persistence.
  `src/main.mo` composes `src/mixins/*`; pure logic in `src/lib/*`; Candid in `src/backend.did`.
- `canisters/frontend` (`frontend`): React 19 + Vite + Tailwind v4 + `react-router`
  (library mode, `app/main.tsx`), npm (`package-lock.json`). Static-site recipe, output `dist/`.
  Bindings are generated into `app/bindings/` from `../backend/src/backend.did`.

## Root commands

- `npm run check`: `mops check` in the backend
- `npm test`: mops tests + frontend vitest
- `npm run build`: frontend typecheck + build
- `npm run dev`: Vite dev server (needs the backend deployed locally)
- `npm run deploy:local`: `icp deploy -e local` as `anonymous` (or `$ICP_IDENTITY`)

Local URL: http://frontend.local.localhost:8010/ (admin at `/admin`).

## Boundaries

- The admin account is created by a controller with
  `icp canister call backend bootstrapAdmin '("admin", "<password>")'`; reset with
  `resetAdminCredentials`. The frontend shows this command, so keep the method names stable.
- `SITE_URL` in `canisters/frontend/.env.production` is still the local URL; set the real
  domain before any mainnet deploy.
- No mainnet canister IDs exist yet (`.icp/data` is empty).
- User-facing copy is Swedish first, English second (`L10n = { sv; en }`).
