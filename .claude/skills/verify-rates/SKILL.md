---
name: verify-rates
description: Verify okicalc's real-world constants (OKI fee rate, NBP reference rate and presets, exemption limits, Belka rate, law status and dates) against current sources; update defaults, locale copy and docs when they drift. Use when the user asks to check/refresh the calculator's numbers or after NBP/legislative changes.
---

# Verify okicalc's real-world numbers

The calculator hardcodes facts that change over time. This skill is the
checklist for auditing them against reality and updating the code safely.

## 1. Establish current facts (web search, cross-check ≥2 sources)

- **NBP reference rate** (stopa referencyjna) — current value and the value
  as of 31 October of the previous year (that one sets this year's OKI fee).
  Sources: nbp.pl, bankier.pl, money.pl.
- **OKI fee rate for the current/next year** — statute: 19% of the NBP
  reference rate on 31 Oct of the prior year, floored to 2 decimals, min
  0.1%. Check for announcements of the actual published rate and for any
  amendments to the act of 3 July 2026. Sources: gov.pl (Ministerstwo
  Finansów), sejm.gov.pl, inwestomat.eu, bankier.pl.
- **Exemption limits** — 100 000 zł investment limit and the 25 000 zł
  savings sub-limit; valorization is frozen through 2029, indexed from 2030.
  From 2030 on, find the announced valorized limit for the current year.
- **Belka tax rate** — 19% unless amended.
- **Anything structural**: average-asset-value definition (secondary
  regulations), qualifying-instrument list, fee collection mechanics
  (from assets vs external payment). These affect the model, not just
  constants — if they changed, flag to the user before coding.

## 2. Where each fact lives

| Fact | Files |
|---|---|
| Default fee rate from 2028 (`0.71` = NBP 3.75%) | `js/state.js` DEFAULT_STATE.feePct; `js/engine.js` DEFAULTS.f |
| Transitional 2027 rate `0.85%` | `js/engine.js` (f2027, feeRateFromNbp docs), `js/state.js`, all `js/locales/*.js` (`controls.use2027`), `index.html` static label + formulas `<pre>` |
| NBP presets `[2.00, 3.00, 3.75, 5.00, 6.00]` | `js/state.js` NBP_PRESETS (labels derive automatically) |
| Limit `100 000 zł` default | `js/engine.js` DEFAULTS.L0, `js/state.js`, locale strings (`app.tagline` in some locales, `explain.*` use runtime values — check for hardcoded mentions), `index.html` meta/JSON-LD, `README.md` |
| Sub-limit `25 000 zł` | locale `assumptions.i3` |
| Belka `19%` default | `js/engine.js` DEFAULTS.t, `js/state.js` belkaPct, locale strings (`app.tagline`, `explain.regBody` uses runtime var — check tagline!), `index.html` description |
| Years 2027/2028/2029/2030 | locale strings (`controls.fee`, `controls.inflation`, `assumptions.i7`), `index.html`, `CLAUDE.md`, `README.md` |
| Law date "3 July 2026" | locale `disclaimer.text` (all 5), `README.md` |

## 3. Update rules

- The frozen reference `oki-vs-belka-model.md` was removed from the working
  tree; read it from history (`git show 7e7066a:oki-vs-belka-model.md`) and
  never re-add or alter it — the golden tests are pinned to it.
- **Never retune `tests/engine.test.js` golden values** to new rates: they
  encode the document's baseline (constant 0.85%, fixed 100k limit). They
  stay valid forever. Only add NEW tests for new statutory helpers (e.g. if
  the min/rounding rule in `feeRateFromNbp` changes, change that function
  and its test together, citing the amendment).
- When changing a default, update **all five locales in the same commit** —
  `en.js` is the canonical key set; the others must mirror it exactly.
- Update the disclaimer "as understood on" framing only if the law itself
  changed; note the amendment date in the commit message with source URLs.
- After edits: `npm test` (must stay green) and a browser smoke pass
  (verdict renders, presets relabel, all 5 languages).

## 4. Report format

Produce a short table: fact → value in code → current real value → action
(ok / updated / needs user decision). Structural law changes (model-shape
changes, new limits mechanics) go to the user as questions, not silent edits.
