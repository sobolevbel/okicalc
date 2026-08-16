// Inline payout-phase result: a verdict sentence plus two proportional bars
// ("how many years each account funds the withdrawal"). The bars are
// decorative (aria-hidden) — the sentence carries the accessible text.
import { PAYOUT_MAX_YEARS } from '../engine.js';
import { t, years, fmtMoney } from '../i18n.js';

// "23 lata" / "100+ lat" — capped values mean "at least this long".
// Shared with the methodology paragraph in explain.js.
export const payoutLasts = (n) => (n >= PAYOUT_MAX_YEARS ? t('payout.forever') : years(n));

// "5 000 zł/mc" or the localized "off" — shared by the slider bubble and
// the printed parameter sheet.
export const fmtPayoutSetting = (v) => (v === 0
  ? t('payout.off') : t('payout.perMonth', { amount: fmtMoney(v) }));

export function renderPayout(state, payout) {
  const box = document.getElementById('payoutResult');
  box.hidden = state.payoutMonthly === 0 || !payout;
  if (box.hidden) return;
  document.getElementById('payoutVerdict').textContent = t('payout.lasts', {
    amount: fmtMoney(state.payoutMonthly),
    oki: payoutLasts(payout.oki),
    reg: payoutLasts(payout.reg),
  });
  const max = Math.min(Math.max(payout.oki, payout.reg, 1), PAYOUT_MAX_YEARS);
  for (const [key, val] of [['oki', payout.oki], ['reg', payout.reg]]) {
    document.getElementById(`payoutBar-${key}`).style.width = `${(Math.min(val, PAYOUT_MAX_YEARS) / max) * 100}%`;
    document.getElementById(`payoutYears-${key}`).textContent = payoutLasts(val);
  }
}
