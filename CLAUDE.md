# okicalc

Client-side calculator comparing Poland's OKI (Osobiste Konto Inwestycyjne,
from 2027: annual fee on average asset value above an exemption limit, no
Belka tax) vs a regular brokerage account (19% Belka on realized gains and
dividends). Live: https://sobolevbel.github.io/okicalc/

Static site: no build step, no frameworks, no backend. ES modules served as-is.

## Commands

```bash
npm test        # node --test tests/engine.test.js — must stay green
npm run serve   # python3 http.server :8321 (ES modules require http://)
```

Browser smoke-testing: puppeteer-core driving system Chrome works well; note
that viewport/mouse CDP emulation is unreliable with current Chrome — test
narrow layouts with `--window-size` + `defaultViewport: null`, and tooltips
with synthetic `PointerEvent`s dispatched in page context.

## Architecture

- `js/engine.js` — pure math, DOM-free (imported by Node tests). Implements
  the model specified in `MODEL.md` (read that first for the recursions,
  assumptions and validation approach).
- `js/state.js` — UI state, bounds, defaults, URL query codec (short keys,
  only non-default values serialized; language is NOT part of scenario URLs).
- `js/i18n.js` + `js/locales/{pl,en,ru,be,uk}.js` — `en.js` is the canonical
  key set; every locale must define exactly the same keys. Plurals via
  `Intl.PluralRules` (`plural.*` entries hold one/few/many/other forms).
- `js/news.js` — news items + `STATUS_DATE`, all five translations
  co-located per item. **Adding a news item = editing only this file**
  (rendered by `js/ui/news.js`, sorted by date, dates localized via Intl);
  locale files stay untouched, so key parity never churns.
- `js/ui/` — controls (paired range+number inputs), chart (hand-rolled SVG),
  table (break-even heatmap; exact dead heats render as '=' with a neutral
  fill, not 0), summary (verdict + tiles), explain (methodology + year table
  + print params). `js/main.js` wires state → recompute → render.
- `css/style.css` — design tokens on `:root`, dark theme declared twice
  (media query + `[data-theme]`) so the 3-state toggle beats the OS setting;
  this duplication is deliberate, do not "deduplicate" it with `light-dark()`
  (breaks older Safari). Print styles turn the page into the PDF report.

## Hard invariants — do not "improve"

- The engine's floating-point **operation order is load-bearing**
  (fee computed from pre-growth value, contribution added before growth,
  `(1+r)^0.5` mid-year average, limit exponent `max(0, k − idxFrom + 1)`).
  Golden tests compare exact integers — do not reorder arithmetic.
- The crash stress test (`crisisEvery`/`crisisDrop`, MODEL.md §4.4) is
  deterministic (fixed year numbers, never random) and must stay
  **bit-identical to the base model when off** (a test enforces this).
  The heatmap deliberately ignores it, like contributions and dividends —
  and like the payout phase (`payoutYears`, MODEL.md §4.5), which never
  touches the accumulation loop.
- The "today's money" toggle (`td`) is a **render-time transform only**
  (`displayDerived()` in main.js) — never bake deflation into the engine.
- The FAQ exists in three places that must stay verbatim-identical:
  `pl.js` `faq.*` keys, the static HTML `<details>` blocks, and the
  FAQPage JSON-LD in `index.html` (JSON-LD stays Polish-only).
- `breakeven()` uses strict `>` and **stops at the first losing year** —
  scanning all 50 years breaks golden-table equality (e.g. 175k @ 2% = 2).
- Golden tests in `tests/engine.test.js` pin the engine to a precomputed
  dataset with frozen baseline assumptions (constant 0.85% fee, fixed 100k
  limit, no valorization). Never retune them to current law — current law
  only changes DEFAULTS/presets/locale copy (see the `verify-rates` skill).
- Charts read colors from CSS classes/custom properties, so theme switches
  need no re-render. Keep it that way.
- All dynamic text goes through `textContent` (never innerHTML).
- Raw floats live in state; rounding happens only at render via Intl.

## Deploy

GitHub Pages, "Deploy from a branch" → `main` / root, repo
`sobolevbel/okicalc` (personal account; `gh auth switch --user sobolevbel`
before pushing). All paths are relative (site lives under `/okicalc/`).
CI: `.github/workflows/test.yml` runs `node --test` on push/PR.

Google Analytics: enabled — `window.GA_MEASUREMENT_ID = 'G-R81XBHG17N'` in
`index.html`. GA loads only after the visitor accepts the localized cookie
banner (`initConsent`/`loadGa` in `js/main.js`); an empty ID disables both
the banner and GA. ImgBot is silenced via `.imgbotconfig` (ignores all
image types) — don't expect image-optimization PRs.

## i18n / SEO notes

- Static HTML text is Polish and must match `pl.js` strings (crawlable
  content; `applyI18n()` re-stamps at boot).
- `?lang=xx` is honored on load (hreflang links point there); the chosen
  language persists in localStorage, never in scenario URLs.
- SEO surface: title/description/OG/JSON-LD in `index.html`, `sitemap.xml`,
  `robots.txt`, `assets/og.png` (1200×630).
