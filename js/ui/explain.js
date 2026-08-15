// Plain-language methodology with the user's own numbers substituted in,
// the year-by-year breakdown table, and the print-only parameter block.
import { t, fmtMoney, fmtSignedMoney, fmtPct, years, currentLang } from '../i18n.js';

export function renderExplain(state, { rows, breakevenYear }) {
  const vars = {
    r: fmtPct(state.rPct, 1),
    t: fmtPct(state.belkaPct, 1),
    fee: fmtPct(state.feePct, 2),
    limit: fmtMoney(state.limit),
    c: fmtMoney(state.monthly * 12),
  };
  document.getElementById('exIntro').textContent = t('explain.intro', vars);
  document.getElementById('exReg').textContent = t('explain.regBody', vars);
  document.getElementById('exOki').textContent = t('explain.okiBody', vars);
  const race = document.getElementById('exRace');
  if (breakevenYear === 0) race.textContent = t('explain.raceNever');
  else if (breakevenYear >= 50) race.textContent = t('explain.raceAlways');
  else race.textContent = t('explain.race', { year: breakevenYear });
  document.getElementById('exStep1').textContent = t('explain.step1', vars);
  document.getElementById('exStep2').textContent = t('explain.step2', vars);
  document.getElementById('exStep3').textContent = t('explain.step3', vars);
  document.getElementById('exStep4').textContent = t('explain.step4', vars);

  const tbody = document.getElementById('ybreakBody');
  tbody.textContent = '';
  for (const row of rows) {
    const tr = document.createElement('tr');
    if (row.year === state.horizon || row.year === breakevenYear) tr.className = 'milestone';
    const cells = [
      String(row.year),
      fmtMoney(row.fee),
      fmtMoney(row.oki),
      fmtMoney(row.belkaIfSold),
      fmtMoney(row.reg),
      fmtSignedMoney(row.adv),
    ];
    cells.forEach((text, i) => {
      const td = document.createElement('td');
      td.textContent = text;
      if (i === 5) td.className = row.adv >= 0 ? 'pos' : 'neg';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}

// Filled right before window.print(): a compact parameter sheet so the PDF
// is self-describing.
export function renderPrintParams(state) {
  const dl = document.getElementById('printParams');
  dl.textContent = '';
  const add = (label, value) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    dl.append(dt, dd);
  };
  add(t('controls.initial'), fmtMoney(state.v0));
  add(t('controls.monthly'), fmtMoney(state.monthly));
  add(t('controls.return'), fmtPct(state.rPct, 1));
  add(t('controls.horizon'), years(state.horizon));
  add(t('controls.fee'), fmtPct(state.feePct, 2));
  add(t('controls.use2027'), state.use2027 ? '✓' : '—');
  add(t('controls.limit'), fmtMoney(state.limit));
  add(t('controls.inflation'), fmtPct(state.inflPct, 1));
  add(t('controls.dividend'), fmtPct(state.divPct, 1));
  add(t('controls.belka'), fmtPct(state.belkaPct, 1));
  add(t('print.generated'), new Date().toLocaleDateString(currentLang()));
}
