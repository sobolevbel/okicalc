// Verdict hero + stat tiles. All text set via textContent.
import { t, tp, years, fmtMoney, fmtSignedMoney, fmtSignedPct } from '../i18n.js';

export function renderSummary(state, { rows, breakevenYear, peak }) {
  const at = rows[state.horizon - 1];
  const diff = at.adv;

  document.getElementById('verdictAfter').textContent = tp('plural.yearsAfter', state.horizon);

  const main = document.getElementById('verdictMain');
  main.textContent = '';
  const dot = document.createElement('span');
  dot.className = 'win-dot';
  dot.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  if (Math.abs(diff) < 1) {
    text.textContent = t('verdict.tie');
    main.appendChild(text);
  } else {
    dot.classList.add(diff > 0 ? 'oki' : 'reg');
    text.textContent = diff > 0
      ? t('verdict.okiWins', { amount: fmtMoney(Math.abs(diff)) })
      : t('verdict.regWins', { amount: fmtMoney(Math.abs(diff)) });
    main.append(dot, text);
  }

  document.getElementById('verdictDetail').textContent = t('verdict.detail', {
    oki: fmtMoney(at.oki),
    reg: fmtMoney(at.reg),
    pct: fmtSignedPct(at.advPct, 2),
  });

  const be = document.getElementById('verdictBe');
  if (breakevenYear === 0) be.textContent = t('verdict.beNever');
  else if (breakevenYear >= 50) be.textContent = t('verdict.beAlways');
  else be.textContent = t('verdict.beUntil', { years: years(breakevenYear) });

  document.getElementById('statsHeading').textContent = t('stats.heading', { years: years(state.horizon) });
  document.getElementById('stOki').textContent = fmtMoney(at.oki);
  document.getElementById('stReg').textContent = fmtMoney(at.reg);
  document.getElementById('stDiff').textContent = fmtSignedMoney(diff);
  document.getElementById('stFees').textContent = fmtMoney(at.cumFee);
  document.getElementById('stBelka').textContent = fmtMoney(at.belkaIfSold);
  document.getElementById('stBreakeven').textContent = breakevenYear === 0
    ? t('stats.breakevenNever')
    : breakevenYear >= 50 ? t('stats.breakevenBeyond') : t('stats.year', { n: breakevenYear });
  document.getElementById('stMaxAdv').textContent = peak
    ? t('stats.maxAdvDetail', { amount: fmtSignedMoney(peak.adv), year: peak.year })
    : '—';
}
