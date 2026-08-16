// Verdict hero + stat tiles. All text set via textContent.
import { t, tp, years, fmtMoney, fmtSignedMoney, fmtSignedPct } from '../i18n.js';

export function renderSummary(state, { rows, hybrid, overflowYear, breakevenYear, peak }) {
  const at = rows[state.horizon - 1];
  const diff = at.adv;

  // The "today's money" badge rides along wherever amounts change, so
  // deflated numbers never look like a bug.
  const badge = state.todayMoney ? `, ${t('controls.todayBadge')}` : '';
  document.getElementById('verdictAfter').textContent = tp('plural.yearsAfter', state.horizon) + badge;

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

  // Third strategy: shown only when it diverges from pure OKI (the portfolio
  // outgrows the limit) AND the gap is at least 1 zł either way.
  const hy = hybrid[state.horizon - 1].net;
  const bestPure = Math.max(at.oki, at.reg);
  const showHybrid = overflowYear !== null && Math.abs(hy - bestPure) >= 1;
  const vh = document.getElementById('verdictHybrid');
  vh.hidden = !showHybrid;
  vh.textContent = !showHybrid ? '' : (hy > bestPure
    ? t('verdict.hybridBest', { amount: fmtMoney(hy), diff: fmtMoney(hy - bestPure) })
    : t('verdict.hybridBehind', { amount: fmtMoney(hy), diff: fmtMoney(bestPure - hy) }));
  document.getElementById('stHybridWrap').hidden = !showHybrid;
  document.getElementById('stHybrid').textContent = fmtMoney(hy);

  document.getElementById('statsHeading').textContent = t('stats.heading', { years: years(state.horizon) }) + badge;
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
