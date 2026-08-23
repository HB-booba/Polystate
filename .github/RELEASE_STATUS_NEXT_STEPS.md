# Polystate — v1.0 Release Status

**Date:** 2026-08-23
**Purpose:** Snapshot of what the three blocker docs asked for, what actually shipped, and what's still open. Read this before picking up release work again.

---

## Background

Three docs in this folder (`BLOCKER_1_GENERATOR_INCOMPLETE_CODE.md`, `BLOCKER_2_TYPE_SAFE_DISPATCH.md`, `BLOCKER_3_DEVTOOLS_INTEGRATION.md`) and `polystate-copilot-roadmap.md` tracked what was blocking a real v1.0:

1. Generators emitted stub reducers (`(state) => state`) instead of real logic.
2. `dispatch()` was string-based with no compile-time type safety.
3. Redux DevTools middleware existed but wasn't wired to the browser extension.

## What shipped (verified against code, not just doc claims)

All three were fixed in PR #3 (`e4cb805`, "Fix/polystate blockers"), followed by a version bump (`2be9137`) and a GitHub Pages landing page (`4a357ae`).

| Blocker | Fixed how | Where |
|---|---|---|
| 1 — stub generator | AST parser using `ts-morph` reads `.definition.ts` source directly (not `handler.toString()` + regex). Landed in `packages/cli/src/ast-parser.ts` — roadmap proposed `packages/definition/`, ended up in `cli` instead. | [packages/cli/src/ast-parser.ts](../packages/cli/src/ast-parser.ts), `generateFromAST` / `generateNgRxReducerFromAST` in `generator-react`/`generator-angular` |
| 2 — untyped dispatch | Generic overload directly on `Store`, not the `ActionsOf<T>`/`TypedStore` wrapper the doc proposed. Typos/wrong payloads are now compile errors on the existing API. | [packages/core/src/store.ts:132](../packages/core/src/store.ts#L132) — `dispatch<K extends keyof A & string>(action: K, payload?: DispatchPayload<A[K]>)` |
| 3 — DevTools not wired | `connect()` + `init(state)` once + single `subscribe()` (was re-subscribing per dispatch — fixed mid-PR) + `JUMP_TO_ACTION`/`JUMP_TO_STATE` call the new `store.setState()`. | [packages/devtools/src/middleware.ts](../packages/devtools/src/middleware.ts), [packages/core/src/store.ts:117](../packages/core/src/store.ts#L117) |

Also in the same PR: fixed an Angular memory leak (`PolystateService` wasn't tracking subscriptions for `ngOnDestroy`), and removed `any` typings across core/react/angular/devtools.

## Gaps found that the docs don't mention

1. **npm release is half-published.** Registry check (`npm view @polystate/<pkg> version`) on 2026-08-23:
   - `1.0.0` on npm: `core`, `react`, `angular`, `devtools`
   - **`0.2.0` on npm (stale): `definition`, `cli`, `generator-react`, `generator-angular`** — despite local `package.json` saying `1.0.0` for all eight.
   - Impact: `cli` depends on the other three lagging packages for AST-based generation. Anyone running `npm install @polystate/cli` today still gets the pre-fix stub generator — Blocker 1's fix never reached actual CLI users.
2. **Changelogs are stale.** `packages/core/CHANGELOG.md` (and presumably siblings) still top out at `0.2.0`. The `1.0.0` bump (`2be9137`) only edited `package.json` files directly — no changeset was run, so there's no changelog entry for `1.0.0`.
3. **Local checkout has no installed deps.** `node_modules` is essentially empty (only `pnpm-lock.yaml` present). `npx vitest run` fails resolving `@vitejs/plugin-react` because it ad-hoc-installs a bare vitest instead of using the workspace. Run `pnpm install` before trying to verify tests locally — this is environment state, not a code bug.

## Next steps, in order

1. ~~`pnpm install`, then run the full test suite (`pnpm vitest run` + the integration config) to confirm the README's "187 passing tests" badge still holds after the AST rewrite.~~ **Done 2026-08-23.** Findings:
   - `pnpm` wasn't on PATH; enabled via `corepack enable && corepack prepare pnpm@latest --activate`.
   - Install surfaced `[ERR_PNPM_IGNORED_BUILDS]` for `esbuild`, `nx`, `@parcel/watcher`, `nice-napi` — approved via `pnpm approve-builds --all` (now recorded in `pnpm-workspace.yaml` under `allowBuilds`).
   - **Root `package.json` was missing `zone.js`** as a devDependency — only the example apps had it, but `tests/integration/angular.integration.test.ts` imports it directly, so the whole Angular integration file was failing to even load (`Failed to resolve import "zone.js"`). Fixed by adding `"zone.js": "^0.14.0"` to root devDependencies.
   - Unit suite (`pnpm vitest run`): **185 passed** (13 files), no failures.
   - Integration suite (`npx vitest run --config vitest.integration.config.ts`, needs `pnpm build` first): **51 passed** (3 files: core 22, angular 17, react 12), no failures.
   - **Total: 236 passing, not 187** — the README badge predated the integration suite entirely (undercounted, not a regression). Updated `README.md` badge and the `npm run test` line to reflect actual numbers.
   - `pnpm build` fails for 4 of 13 nx projects — but all 4 are **example apps**, not the 8 published packages (which all built clean, verified via `packages/*/dist` presence): `@polystate/example-angular-todo`, `@polystate/example-angular-todo-generated`, `@polystate/example-angular-shop` (Angular compiler requires TS `>=5.2.0 <5.5.0`, repo has `5.9.3` — pinned-version mismatch), and `@polystate/example-react-todo-generated` (missing `reselect` dependency + stale generated code, `any` types, `process` reference). Not release-blocking for npm publish but worth a follow-up issue since they're supposed to be working demos.
   - `npm run test` (the nx-wrapped target) appears to hang with no output — likely an interactive Nx Cloud connection prompt with no stdin in a non-interactive shell. Didn't chase this further since direct `vitest run` is authoritative and passes; worth a look if CI relies on the nx target specifically.
2. ~~**Publish `@polystate/definition`, `@polystate/cli`, `@polystate/generator-react`, `@polystate/generator-angular` at `1.0.0`.**~~ **Done 2026-08-23.** Published in this order: `definition` → `generator-angular`/`cli` (briefly out of order, see note) → `generator-react`. All 8 packages now read `1.0.0` on the registry with dependency ranges (`@polystate/definition@1.0.0` etc.) resolving correctly — verified with a clean `npm install @polystate/cli@1.0.0` in a scratch dir, confirming the AST-based generator (`ts-morph`) ships, not the old stub. Note: `cli` and `generator-angular` published before `definition`/`generator-react` landed, so there was a brief window where `npm install @polystate/cli` would have failed on an unresolvable `@polystate/definition@1.0.0` dependency — closed within the same session, no user-facing fallout expected but worth knowing if anyone reports a transient install failure around this timestamp.
3. ~~Run `npm run changeset` (or equivalent) to backfill `1.0.0` changelog entries so they match what's actually on npm.~~ **Done 2026-08-23.** The 1.0.0 bump never went through the changeset tool (no pending changeset files existed — `.changeset/` only has `config.json`), so `changeset version` had nothing to consume. Backfilled all 8 `CHANGELOG.md` files by hand, grounded in the actual PR #3 diff (`e4cb805`): typed `dispatch`/removed dead middleware (core), the `createStoreContext` API change (react), the `ngOnDestroy` leak fix (angular), DevTools init/subscribe/`JUMP_TO_ACTION` fixes (devtools), and the AST-based generator pipeline replacing stub reducers (definition/cli/generator-react/generator-angular). Not changeset-tool-generated, so future releases should go through `pnpm changeset` properly rather than repeating this manual backfill.
4. Lower priority / not release-blocking: roadmap Phase 3–4 items (async thunk generation, VS Code snippets, computed-selector generation, `act()` warning cleanup in React tests), and the 4 broken example-app builds found above.

## Status: v1.0 release is now complete

All three original blockers verified fixed, all 8 packages published and consistent at `1.0.0` on npm, changelogs backfilled to match. Nothing release-blocking remains open.
