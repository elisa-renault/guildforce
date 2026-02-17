# Design System Governance

This document defines the guardrails that prevent design-system drift across public, player, and admin surfaces.

## CI Guards

- `npm run ci:design-token-guard`
: Blocks newly added hardcoded palette classes in changed `src/**/*.ts(x)` files.
- `npm run ci:a11y-focus-guard`
: Blocks focus-ring suppression and missing `focus-visible` fallback in changed components/pages.
- `npm run ci:pagecontainer-guard`
: Ensures all `src/pages/**/*.tsx` files reference `PageContainer`.
- `npm run ci:nav-style-guard`
: Ensures core nav components use shared `navItemClass` helper.
- `npm run ci:ds-coverage`
: Requires `AdminDesignSystem` UI coverage to stay at `100%`.

All these checks are included in `npm run verify:quick`.

## Review Checklist (PR)

- Tokens:
: New status/role/faction/class colors use semantic mappings from `src/lib/design-tokens.ts`.
: Canonical status vocabulary is `status-success|status-warning|status-error|status-info` (CSS aliases in `src/index.css` + Tailwind `status.*` colors). Avoid introducing parallel names in new code.
: Charts/analytics color palettes must use centralized helpers from `src/lib/design-tokens.ts` (`roleColorValue`, `rangeColorValue`, `wowClassColorValue`, `tierTokenColorValue`) instead of local hex/HSL literals.
- Layout:
: Route pages use `PageContainer` with explicit width strategy (`contained`, `wide`, or `full`).
- Navigation:
: Top nav, sub-nav, and admin sidebar use `navItemClass` for active/hover/focus consistency.
- Accessibility:
: Custom interactive elements show keyboard-visible focus; no hidden focus states.
- Documentation:
: Any new reusable UI primitive used in app code is documented in `src/components/admin/AdminDesignSystem.tsx`.

## Evolution Rule

When adding or changing a reusable UI pattern:

1. Update implementation (component/pattern).
2. Update or add semantic token/helper if needed.
3. Update `AdminDesignSystem` live example + recommended usage snippet.
4. Run `npm run verify:quick` before merge.
