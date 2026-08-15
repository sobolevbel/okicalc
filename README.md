# Kalkulator OKI — OKI vs regular brokerage account

Interactive, client-side calculator comparing Poland's **Osobiste Konto
Inwestycyjne** (OKI, in force from 2027-01-01: no 19% Belka capital-gains tax,
instead an annual fee on average asset value above a 100 000 zł exemption)
with a **regular brokerage account** taxed under the Belka rules.

**Live:** https://sobolevbel.github.io/okicalc/

- Year-by-year simulation of both accounts (contributions, dividends, limit
  valorization, transitional 2027 rate, NBP-linked fee-rate presets).
- Verdict banner, capital/advantage/taxes charts (hand-rolled SVG),
  interactive break-even heatmap, plain-language methodology with a
  year-by-year breakdown, PDF report via the print dialog.
- Languages: PL / EN / RU / BE / UK, with correct Slavic plural rules and
  locale number formatting. Light/dark themes. Scenario sharing via URL.
- No build step, no frameworks, no backend: static ES modules.

## Development

```bash
npm run serve   # python3 http.server on :8321 (ES modules need http://)
npm test        # node --test — golden values from oki-vs-belka-model.md
```

`js/engine.js` mirrors the reference Python model in
[`oki-vs-belka-model.md`](./oki-vs-belka-model.md) §7 operation-for-operation;
`tests/engine.test.js` pins it to every published value from that document
(the full §4 break-even table, §5 advantage curves, §6 sensitivity tables).

## Google Analytics

Set your GA4 Measurement ID in `index.html`:

```js
window.GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
```

With an empty ID nothing is loaded and no data is collected. With an ID set,
a localized accept/decline cookie banner appears and GA loads only after the
visitor accepts (GDPR/ePrivacy); the choice is remembered in localStorage.

## Deployment

GitHub Pages, "Deploy from a branch" → `main` / root. No build required
(`.nojekyll` included). All asset paths are relative, so the site works under
`/okicalc/`.

## Disclaimer

Calculations follow the act of 3 July 2026 as understood on the build date.
Not tax or investment advice.
