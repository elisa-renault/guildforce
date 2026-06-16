# DE LQA Checklist

Date: 2026-02-05
Target locale: `de`

## Linguistic quality

- [ ] Terminology follows `docs/i18n/de-glossary.md`.
- [ ] No EN fallback text visible in release-scope screens.
- [ ] Placeholders/tokens are intact (`{{...}}`).
- [ ] Grammar and gender/number agreement are correct.
- [ ] Tone is consistent (du-form, concise action labels).

## UX and layout

- [ ] No truncation in primary CTAs (desktop, 1280px).
- [ ] No truncation in primary CTAs (mobile, 390px).
- [ ] Dialog titles and button groups fit without overlap.
- [ ] Table headers remain readable without clipping.
- [ ] Navigation/breadcrumb labels are not cut off.

## Functional checks (DE locale)

- [ ] Auth page (email + Battle.net copy).
- [ ] Home page hero + feature cards.
- [ ] Guild page (overview + wishes + polls + settings).
- [ ] Admin pages (users, guilds, legal, patch notes, support queues).
- [ ] Legal public pages render DE content without EN fallback.

## Technical checks

- [ ] `npm run i18n:check:strict` passes.
- [ ] `npm run test -- src/__tests__/i18n.translations.test.ts src/__tests__/i18n.semantic.test.ts src/__tests__/i18n.de.smoke.test.tsx` passes.
- [ ] `npm run build` passes.
- [ ] CI workflow includes DE guards and fails on regression.
