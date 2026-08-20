// Wires the scenario controls (paired range+number inputs, presets, buttons)
// to the state. Rendering of results lives elsewhere.
import { DEFAULT_STATE, NBP_PRESETS, clamp } from '../state.js';
import { feeRateFromNbp } from '../engine.js';
import { t, tp, fmtMoney, fmtPct, years, fmtNumber } from '../i18n.js';
import { fmtPayoutSetting } from './payout.js';

const KEYS = ['v0', 'monthly', 'rPct', 'horizon', 'feePct', 'limit', 'inflPct', 'divPct', 'belkaPct',
  'crisisEvery', 'crisisDropPct', 'payoutMonthly'];

const FORMAT = {
  v0: (v) => fmtMoney(v),
  monthly: (v) => fmtMoney(v),
  limit: (v) => fmtMoney(v),
  rPct: (v) => fmtPct(v, 1),
  feePct: (v) => fmtPct(v, 2),
  inflPct: (v) => fmtPct(v, 1),
  divPct: (v) => fmtPct(v, 1),
  belkaPct: (v) => fmtPct(v, 1),
  horizon: (v) => years(v),
  crisisEvery: (v) => (v === 0 ? t('controls.crisisOff') : tp('plural.everyYears', v)),
  crisisDropPct: (v) => fmtPct(-v || 0, 0), // negative — it is a drawdown ("-0%" avoided)
  payoutMonthly: fmtPayoutSetting,
};

export function initControls(update, track = () => {}) {
  for (const key of KEYS) {
    const range = document.getElementById(`in-${key}`);
    const num = document.getElementById(`num-${key}`);
    range.addEventListener('input', () => update({ [key]: clamp(parseFloat(range.value), key) }));
    num.addEventListener('change', () => update({ [key]: clamp(parseFloat(num.value), key) }));
  }
  document.getElementById('chk2027').addEventListener('change', (ev) => {
    update({ use2027: ev.target.checked });
  });
  document.getElementById('chkLimitUsed').addEventListener('change', (ev) => {
    update({ limitUsed: ev.target.checked });
  });
  document.getElementById('chkToday').addEventListener('change', (ev) => {
    update({ todayMoney: ev.target.checked });
  });

  const presets = document.getElementById('nbpPresets');
  for (const nbp of NBP_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.fee = String(feeRateFromNbp(nbp));
    btn.addEventListener('click', () => update({ feePct: feeRateFromNbp(nbp) }));
    presets.appendChild(btn);
  }
  relabelPresets();

  // "Add realism" toggle: one click enables a typical crash cycle, another
  // turns the stress test off (the sliders stay for fine-tuning).
  document.getElementById('btnRealism').addEventListener('click', () => {
    const active = (parseFloat(document.getElementById('in-crisisEvery').value) || 0) > 0;
    track('ui/realism');
    update(active ? { crisisEvery: 0 } : { crisisEvery: 8, crisisDropPct: 30 });
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    track('ui/reset');
    update({ ...DEFAULT_STATE });
  });
}

// Preset labels are locale-dependent ("NBP 3,75% → 0,71%") — refresh on language switch.
export function relabelPresets() {
  for (const btn of document.querySelectorAll('#nbpPresets button')) {
    const fee = parseFloat(btn.dataset.fee);
    const nbp = NBP_PRESETS.find((p) => feeRateFromNbp(p) === fee);
    btn.textContent = `${t('controls.nbpPreset', { rate: fmtNumber(nbp, 2) })} → ${fmtPct(fee, 2)}`;
  }
}

export function syncControls(state) {
  const active = document.activeElement;
  for (const key of KEYS) {
    const range = document.getElementById(`in-${key}`);
    const num = document.getElementById(`num-${key}`);
    const out = document.getElementById(`out-${key}`);
    const formatted = FORMAT[key](state[key]);
    if (range !== active) range.value = String(state[key]);
    if (num !== active) num.value = String(state[key]);
    range.setAttribute('aria-valuetext', formatted);
    out.value = formatted;
  }
  document.getElementById('chk2027').checked = state.use2027;
  document.getElementById('chkLimitUsed').checked = state.limitUsed;
  // The limit value is ignored while "already used" is on — grey it out.
  document.getElementById('in-limit').disabled = state.limitUsed;
  document.getElementById('num-limit').disabled = state.limitUsed;
  document.getElementById('chkToday').checked = state.todayMoney;
  document.getElementById('btnRealism').setAttribute('aria-pressed', String(state.crisisEvery > 0));
  for (const btn of document.querySelectorAll('#nbpPresets button')) {
    btn.setAttribute('aria-pressed', String(parseFloat(btn.dataset.fee) === state.feePct));
  }
}
