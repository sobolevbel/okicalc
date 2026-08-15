# okicalc

Client-side calculator comparing Poland's OKI (Osobiste Konto Inwestycyjne,
from 2027: annual fee on average asset value above an exemption limit, no
Belka tax) vs a regular brokerage account (19% Belka on realized gains and
dividends). Live: https://sobolevbel.github.io/okicalc/

Static site: no build step, no frameworks, no backend. ES modules served as-is.

## Commands

```bash
npm test        # node --test tests/ — must stay green, see "Golden tests"
npm run serve   # python3 http.server :8321 (ES modules require http://)
```

Browser smoke-testing: puppeteer-core driving system Chrome works well; note
that viewport/mouse CDP emulation is unreliable with current Chrome — test
narrow layouts with `--window-size` + `defaultViewport: null`, and tooltips
with synthetic `PointerEvent`s dispatched in page context.

## Architecture

- `js/engine.js` — pure math, DOM-free (imported by Node tests). Mirrors the
  reference Python in `oki-vs-belka-model.md` §7 **operation for operation**.
- `js/state.js` — UI state, bounds, defaults, URL query codec (short keys,
  only non-default values serialized; language is NOT part of scenario URLs).
- `js/i18n.js` + `js/locales/{pl,en,ru,be,uk}.js` — `en.js` is the canonical
  key set; every locale must define exactly the same keys. Plurals via
  `Intl.PluralRules` (`plural.*` entries hold one/few/many/other forms).
- `js/ui/` — controls (paired range+number inputs), chart (hand-rolled SVG),
  table (break-even heatmap), summary (verdict + tiles), explain (methodology
  + year table + print params). `js/main.js` wires state → recompute → render.
- `css/style.css` — design tokens on `:root`, dark theme declared twice
  (media query + `[data-theme]`) so the 3-state toggle beats the OS setting;
  this duplication is deliberate, do not "deduplicate" it with `light-dark()`
  (breaks older Safari). Print styles turn the page into the PDF report.

## Hard invariants — do not "improve"

- Engine keeps the reference model's floating-point **operation order**
  (fee computed from pre-growth value, contribution added before growth,
  `(1+r)^0.5` mid-year average, limit exponent `max(0, k − idxFrom + 1)`).
- `breakeven()` uses strict `>` and **stops at the first losing year** —
  scanning all 50 years breaks golden-table equality (e.g. 175k @ 2% = 2).
- Golden tests in `tests/engine.test.js` pin the engine to the source
  document's published tables (§4/§5/§6). They encode the DOCUMENT's frozen
  assumptions (constant 0.85% fee, no valorization). Never retune them to
  current law — current law only changes DEFAULTS/presets/locale copy
  (see the `verify-rates` skill).
- Charts read colors from CSS classes/custom properties, so theme switches
  need no re-render. Keep it that way.
- All dynamic text goes through `textContent` (never innerHTML).
- Raw floats live in state; rounding happens only at render via Intl.

## Deploy

GitHub Pages, "Deploy from a branch" → `main` / root, repo
`sobolevbel/okicalc` (personal account; `gh auth switch --user sobolevbel`
before pushing). All paths are relative (site lives under `/okicalc/`).
`.github/workflows/test.yml` exists locally but is gitignored — the gh token
lacks `workflow` scope; after `gh auth refresh -h github.com -s workflow`,
drop the ignore lines and commit it.

Google Analytics: `window.GA_MEASUREMENT_ID` in `index.html` (empty = off).

## i18n / SEO notes

- Static HTML text is Polish and must match `pl.js` strings (crawlable
  content; `applyI18n()` re-stamps at boot).
- `?lang=xx` is honored on load (hreflang links point there); the chosen
  language persists in localStorage, never in scenario URLs.
- SEO surface: title/description/OG/JSON-LD in `index.html`, `sitemap.xml`,
  `robots.txt`, `assets/og.png` (1200×630).
