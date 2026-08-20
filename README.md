# Kalkulator OKI — OKI vs regular brokerage account

Interactive, client-side calculator comparing Poland's **Osobiste Konto
Inwestycyjne** (OKI, in force from 2027-01-01: no 19% Belka capital-gains tax,
instead an annual fee on average asset value above a 100 000 zł exemption)
with a **regular brokerage account** taxed under the Belka rules.

**Live:** https://okicalc.pl/

- Year-by-year simulation of both accounts (contributions, dividends, limit
  valorization, transitional 2027 rate, NBP-linked fee-rate presets), plus an
  optional deterministic crash stress test (a −d% year every N years).
- Payout phase: set a net monthly withdrawal and see how many years each
  account funds it (OKI keeps paying the fee; each regular-account sale pays
  Belka on its profit share). Optional "in today's money" display toggle.
- Hybrid third strategy: OKI capped at the exemption limit with the yearly
  overflow skimmed (tax-free) to a regular account — shown automatically on
  the growth chart, in the verdict and in the year table once the portfolio
  outgrows the limit.
- Verdict banner, capital/advantage/taxes charts (hand-rolled SVG),
  interactive break-even heatmap, plain-language methodology with a
  year-by-year breakdown, PDF report via the print dialog.
- Law-status box, localized news list (data-driven from `js/news.js`) and an
  SEO-marked FAQ (FAQPage JSON-LD).
- Languages: PL / EN / RU / BE / UK, with correct Slavic plural rules and
  locale number formatting. Light/dark themes. Scenario sharing via URL.
- No build step, no frameworks, no backend: static ES modules.

## Development

```bash
npm run serve   # python3 http.server on :8321 (ES modules need http://)
npm test        # node --test — golden-value suite
```

The financial model is specified in detail in [`MODEL.md`](./MODEL.md)
(rules, recursions, closed form, assumptions and their bias, validation).
`js/engine.js` implements it; `tests/engine.test.js` pins the engine to a
precomputed golden dataset: a full 16×14 break-even table, advantage
curves, sensitivity tables and an analytical closed-form cross-check.

GitHub Actions runs the test suite on every push and pull request.

## Analytics

GoatCounter (cookieless, anonymous — nothing is stored on the visitor's
device, so no consent banner is needed). The script tag and site code live
in `index.html`; feature-usage events are sent by `track()` in
`js/main.js` and record only *which* control was touched, never its value.
Remove the script tag (or swap in your own site code) when forking.

## Deployment

GitHub Pages, "Deploy from a branch" → `main` / root. No build required
(`.nojekyll` included). All asset paths are relative, so the site works under
`/okicalc/`.

## Disclaimer

Calculations follow the act of 3 July 2026 as understood on the build date.
Not tax or investment advice.
