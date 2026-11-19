---
paths:
  - "canisters/backend/**"
---

# Backend

- After a public-interface change: `cd canisters/backend && mops generate candid backend`,
  commit `src/backend.did`, then rebuild the frontend (bindings come from it).
- `deployed/backend.most` is the stable-type baseline; refresh it with `mops deployed backend`
  right after each successful deploy, and commit it.
- Tests live in `test/` (`mops test documents` covers the documents logic).
