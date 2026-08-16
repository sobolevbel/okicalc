// Wiring: state → recompute → render. One state object, URL-shareable.
import { simulate, maxAdvantage, payoutYears } from './engine.js';
import { engineParams, encodeState, decodeState } from './state.js';
import {
  LANGS, detectLang, setLang, currentLang, t, applyI18n,
  fmtMoney, fmtSignedMoney, fmtSignedPct, fmtCompact,
} from './i18n.js';
import { initControls, syncControls, relabelPresets } from './ui/controls.js';
import { renderChart } from './ui/chart.js';
import { computeMatrix, renderHeatTable } from './ui/table.js';
import { renderSummary } from './ui/summary.js';
import { renderPayout } from './ui/payout.js';
import { renderNews } from './ui/news.js';
import { renderExplain, renderPrintParams } from './ui/explain.js';

let state = decodeState(location.search);
let derived = null;
let matrix = null;
let matrixKey = '';

function recompute() {
  const rows = simulate(engineParams(state, 50));
  let breakevenYear = 0;
  for (const row of rows) {
    if (row.oki > row.reg) breakevenYear = row.year;
    else break;
  }
  const payout = state.payoutMonthly > 0
    ? payoutYears(engineParams(state), state.payoutMonthly * 12)
    : null;
  derived = { rows, breakevenYear, peak: maxAdvantage(rows), payout };

  // The heatmap only depends on the advanced settings — cache accordingly.
  const key = [state.feePct, state.use2027, state.limit, state.inflPct, state.belkaPct].join('|');
  if (key !== matrixKey) {
    matrix = computeMatrix(state);
    matrixKey = key;
  }
}

/* ---------------- "today's money" display transform ---------------- */
// Display-only deflation by the inflation slider: row k is divided by
// (1+i)^k. Sign/ordering-preserving, so break-even years never move; the
// peak-advantage marker is recomputed on the deflated curve. Running sums
// (cumFee, belkaIfSold) are deflated by the year they are shown in — an
// approximation, called out in the toggle's hint.
const MONEY_FIELDS = ['oki', 'reg', 'regGross', 'basis', 'fee', 'cumFee',
  'exitTax', 'cumDivTax', 'belkaIfSold', 'adv'];

function displayDerived() {
  if (!state.todayMoney || state.inflPct === 0) return derived;
  const q = 1 + state.inflPct / 100;
  const rows = derived.rows.map((row) => {
    const out = { ...row };
    const d = Math.pow(q, -row.year);
    for (const key of MONEY_FIELDS) out[key] *= d;
    return out;
  });
  return { ...derived, rows, peak: maxAdvantage(rows) };
}

/* ---------------- charts ---------------- */
function renderCharts(disp) {
  const { rows, breakevenYear, peak } = disp;
  const markerLabels = {
    horizon: t('chart.marker.horizon'),
    breakeven: t('chart.marker.breakeven'),
  };

  const okiVals = [state.v0, ...rows.map((r) => r.oki)];
  const regVals = [state.v0, ...rows.map((r) => r.reg)];
  renderChart(document.getElementById('figGrowth'), {
    series: [
      { lineCls: 'line-oki', dotCls: 'end-dot oki', values: okiVals },
      { lineCls: 'line-reg', dotCls: 'end-dot reg', values: regVals },
    ],
    includeZeroFloor: true,
    markers: { horizon: state.horizon, breakeven: breakevenYear, labels: markerLabels },
    yFmt: fmtCompact,
    ariaLabel: `${t('chart.growth.title')}. ${t('chart.a11yNote')}`,
    tooltip: (y) => ({
      title: t('chart.tooltip.year', { n: y }),
      rows: [
        { keyCls: 'oki', name: t('chart.series.oki'), value: fmtMoney(okiVals[y]) },
        { keyCls: 'reg', name: t('chart.series.reg'), value: fmtMoney(regVals[y]) },
      ],
    }),
  });

  const advVals = [0, ...rows.map((r) => r.adv)];
  const advPct = [0, ...rows.map((r) => r.advPct)];
  renderChart(document.getElementById('figAdv'), {
    series: [{ lineCls: 'line-adv', dotCls: 'end-dot oki', values: advVals }],
    advantage: { values: advVals },
    markers: {
      horizon: state.horizon,
      breakeven: breakevenYear,
      peak: peak ? { year: peak.year, value: peak.adv } : null,
      labels: {
        ...markerLabels,
        peak: peak ? `${t('chart.marker.max')}: ${fmtSignedMoney(peak.adv)}` : '',
      },
    },
    yFmt: fmtCompact,
    ariaLabel: `${t('chart.adv.title')}. ${t('chart.a11yNote')}`,
    tooltip: (y) => ({
      title: t('chart.tooltip.year', { n: y }),
      rows: [
        { keyCls: 'oki', name: t('stats.diff'), value: fmtSignedMoney(advVals[y]) },
        { keyCls: '', name: '%', value: fmtSignedPct(advPct[y], 2) },
      ],
    }),
  });

  const feeVals = [0, ...rows.map((r) => r.cumFee)];
  const belkaVals = [0, ...rows.map((r) => r.belkaIfSold)];
  renderChart(document.getElementById('figTaxes'), {
    series: [
      { lineCls: 'line-oki', dotCls: 'end-dot oki', values: feeVals },
      { lineCls: 'line-reg', dotCls: 'end-dot reg', values: belkaVals },
    ],
    includeZeroFloor: true,
    markers: { horizon: state.horizon, labels: markerLabels },
    yFmt: fmtCompact,
    ariaLabel: `${t('chart.taxes.title')}. ${t('chart.a11yNote')}`,
    tooltip: (y) => ({
      title: t('chart.tooltip.year', { n: y }),
      rows: [
        { keyCls: 'oki', name: t('chart.series.fee'), value: fmtMoney(feeVals[y]) },
        { keyCls: 'reg', name: t('chart.series.belka'), value: fmtMoney(belkaVals[y]) },
      ],
    }),
  });
}

// Rebuilding 224 cells on every slider tick is wasted DOM churn — the table
// only depends on the advanced settings and the selected-cell highlight.
let heatSig = '';
function renderHeat(force = false) {
  const sig = `${matrixKey}|${state.v0}|${state.rPct}|${state.monthly === 0}`;
  if (!force && sig === heatSig) return;
  heatSig = sig;
  renderHeatTable(document.getElementById('heatWrap'), {
    matrix,
    state,
    onSelect: ({ v0, rPct }) => update({ v0, rPct, monthly: 0, divPct: 0 }),
  });
}

function renderAll() {
  const disp = displayDerived();
  syncControls(state);
  renderSummary(state, disp);
  renderPayout(state, derived.payout);
  renderCharts(disp);
  renderHeat();
  renderExplain(state, disp);
}

/* ---------------- state updates + URL sync ---------------- */
let urlTimer = 0;
function scheduleUrlSync() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const q = encodeState(state).toString();
    history.replaceState(null, '', q ? `?${q}` : location.pathname);
  }, 300);
}

function update(patch) {
  state = { ...state, ...patch };
  recompute();
  renderAll();
  scheduleUrlSync();
}

/* ---------------- language ---------------- */
function initLanguage() {
  const urlLang = new URLSearchParams(location.search).get('lang');
  setLang(LANGS.some((l) => l.code === urlLang) ? urlLang : detectLang(), { persist: Boolean(urlLang) });

  const sel = document.getElementById('selLang');
  for (const { code, label } of LANGS) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = label;
    sel.appendChild(opt);
  }
  sel.value = currentLang();
  sel.addEventListener('change', () => {
    setLang(sel.value);
    onLanguageChange();
  });
}

function onLanguageChange() {
  applyI18n();
  document.title = `${t('app.title')} — OKI`;
  relabelPresets();
  renderNews(); // dates and item texts are locale-dependent
  renderHeat(true); // cell aria-labels and headers are locale-dependent
  renderAll();
}

/* ---------------- theme ---------------- */
function initTheme() {
  const apply = (mode) => {
    if (mode === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
    for (const btn of document.querySelectorAll('#themeSeg button')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.themeVal === mode));
    }
  };
  let mode = 'auto';
  try { mode = localStorage.getItem('okicalc:theme') || 'auto'; } catch { /* ignore */ }
  apply(mode);
  document.getElementById('themeSeg').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-theme-val]');
    if (!btn) return;
    apply(btn.dataset.themeVal);
    try { localStorage.setItem('okicalc:theme', btn.dataset.themeVal); } catch { /* ignore */ }
  });
}

/* ---------------- cookie consent + Google Analytics ---------------- */
// GA loads ONLY after explicit consent; with no measurement ID neither the
// banner nor GA ever appears. Choice is remembered on the device.
function loadGa(id) {
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, { anonymize_ip: true });
}

function initConsent() {
  const id = window.GA_MEASUREMENT_ID;
  if (!id) return;
  let stored = null;
  try { stored = localStorage.getItem('okicalc:consent'); } catch { /* ignore */ }
  if (stored === 'granted') { loadGa(id); return; }
  if (stored === 'denied') return;

  const bar = document.createElement('div');
  bar.className = 'consent-banner no-print';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Cookies');
  const text = document.createElement('p');
  text.dataset.i18n = 'consent.text';
  const actions = document.createElement('div');
  actions.className = 'consent-actions';
  const choose = (value) => {
    try { localStorage.setItem('okicalc:consent', value); } catch { /* ignore */ }
    bar.remove();
    if (value === 'granted') loadGa(id);
  };
  const accept = document.createElement('button');
  accept.type = 'button';
  accept.className = 'primary';
  accept.dataset.i18n = 'consent.accept';
  accept.addEventListener('click', () => choose('granted'));
  const decline = document.createElement('button');
  decline.type = 'button';
  decline.dataset.i18n = 'consent.decline';
  decline.addEventListener('click', () => choose('denied'));
  actions.append(accept, decline);
  bar.append(text, actions);
  document.body.appendChild(bar);
  applyI18n(bar); // banner survives language switches via data-i18n
}

/* ---------------- actions ---------------- */
function initActions() {
  const toast = document.getElementById('shareToast');
  let toastTimer = 0;
  document.getElementById('btnShare').addEventListener('click', async () => {
    const q = encodeState(state).toString();
    const url = `${location.origin}${location.pathname}${q ? `?${q}` : ''}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.textContent = t('controls.shareCopied');
    } catch {
      toast.textContent = url; // clipboard unavailable — show the link itself
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.textContent = ''; }, 3000);
    window.gtag?.('event', 'share_scenario');
  });

  document.getElementById('btnPdf').addEventListener('click', () => {
    document.getElementById('detYbreak').open = true;
    renderPrintParams(state);
    window.gtag?.('event', 'pdf_report');
    window.print();
  });
  window.addEventListener('beforeprint', () => renderPrintParams(state));
}

/* ---------------- boot ---------------- */
initLanguage();
initTheme();
initControls(update);
initActions();
initConsent();
applyI18n();
document.title = `${t('app.title')} — OKI`;
relabelPresets();
renderNews();
recompute();
renderAll();

// Re-render charts when the layout width changes (debounced to one frame).
let resizePending = false;
new ResizeObserver(() => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    renderCharts(displayDerived());
  });
}).observe(document.querySelector('main'));
