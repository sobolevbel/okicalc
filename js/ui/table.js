// Break-even heatmap: rows = lump sums, columns = annual returns, cell =
// last year OKI is still ahead. Sequential single-hue ramp (magnitude), the
// number itself is always printed, so color never carries meaning alone.
import { simulate } from '../engine.js';
import { engineParams } from '../state.js';
import { t, fmtMoney, fmtPct, fmtCompact, years } from '../i18n.js';

export const SUMS = [25_000, 50_000, 75_000, 100_000, 125_000, 150_000, 175_000, 200_000,
  250_000, 300_000, 400_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000];
export const RATES = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15];

// Palette sequential blue ramp, steps 100→700.
const RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7',
  '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];
const WHITE_TEXT_FROM = 8; // cells at least this dark get white ink

// One 50-year simulation per cell; the whole 16×14 grid stays well under 10 ms.
// A cell is a dead heat (tie) when neither the fee nor any tax ever arises —
// below the limit at non-positive returns both accounts are bit-identical.
export function computeMatrix(state) {
  const base = engineParams(state, 50);
  return SUMS.map((v0) => RATES.map((r) => {
    const rows = simulate({ ...base, v0, r: r / 100, c: 0, y: 0, n: 50 });
    let be = 0;
    for (const row of rows) {
      if (row.oki > row.reg) be = row.year;
      else break;
    }
    return { be, tie: rows.every((row) => row.adv === 0) };
  }));
}

export function renderHeatTable(wrap, { matrix, state, onSelect }) {
  wrap.textContent = '';
  const table = document.createElement('table');
  table.className = 'heat';
  table.setAttribute('aria-label', t('table.aria'));

  const thead = table.createTHead();
  const hrow = thead.insertRow();
  const corner = document.createElement('th');
  corner.scope = 'col';
  corner.textContent = t('table.corner');
  hrow.appendChild(corner);
  for (const r of RATES) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = fmtPct(r, 0);
    hrow.appendChild(th);
  }

  const tbody = table.createTBody();
  SUMS.forEach((sum, i) => {
    const row = tbody.insertRow();
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = fmtCompact(sum);
    row.appendChild(th);
    RATES.forEach((rate, j) => {
      const { be: v, tie } = matrix[i][j];
      const td = row.insertCell();
      const btn = document.createElement('button');
      btn.type = 'button';
      let text;
      if (tie) {
        btn.style.backgroundColor = '#dedcd5'; // neutral, outside the blue ramp
        btn.style.color = '#0b0b0b';
        btn.textContent = '=';
        text = t('table.cell.tie');
      } else {
        const idx = Math.round((v / 50) * (RAMP.length - 1));
        btn.style.backgroundColor = RAMP[idx];
        btn.style.color = idx >= WHITE_TEXT_FROM ? '#ffffff' : '#0b0b0b';
        btn.textContent = v >= 50 ? '50+' : String(v);
        text = v === 0 ? t('table.cell.never')
          : v >= 50 ? t('table.cell.beyond')
            : t('table.cell.ahead', { years: years(v) });
      }
      btn.setAttribute('aria-label', t('table.cellAria', { sum: fmtMoney(sum), rate: fmtPct(rate, 0), text }));
      const selected = state.v0 === sum && state.rPct === rate && state.monthly === 0;
      btn.setAttribute('aria-pressed', String(selected));
      btn.addEventListener('click', () => onSelect({ v0: sum, rPct: rate }));
      td.appendChild(btn);
    });
  });
  wrap.appendChild(table);
}
