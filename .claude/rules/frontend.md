---
paths:
  - "canisters/frontend/**"
---

# Frontend

- Unit tests: `tests/*.test.ts(x)` (vitest). Browser tests: `tests/e2e/` (Playwright, `npm run test:browser`).
- Live integration and browser tests run only against a fresh, isolated local canister with
  the anonymous principal as controller (`DOCUMENT_TEST_CANISTER` + `DOCUMENT_TEST_WASM=../backend/.mops/.build/backend.wasm`,
  or `DOCUMENT_BROWSER_CANISTER`). Never point them at a real/company canister; delete only
  the test canisters you created.
- The accounting export is "preparation only / not filed". Keep that labelling, and never
  present field codes as validated official declaration forms.
- `scripts/seo-plugin.ts` calls `icp canister call backend listNews` at build time to write
  sitemap.xml/robots.txt.
