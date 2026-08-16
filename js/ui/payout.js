// Inline payout-phase result: a verdict sentence plus two proportional bars
// ("how many years each account funds the withdrawal"). The bars are
// decorative (aria-hidden) — the sentence carries the accessible text.
import { t, tp, fmtMoney } from '../i18n.js';

const CAP = 100; // payoutYears() cap: >= CAP renders as "100+"

const lastsText = (n) => (n >= CAP ? t('payout.forever') : tp('plural.years', n));

export function renderPayout(state, payout) {
  const box = document.getElementById('payoutResult');
  box.hidden = state.payoutMonthly === 0 || !payout;
  if (box.hidden) return;
  document.getElementById('payoutVerdict').textContent = t('payout.lasts', {
    amount: fmtMoney(state.payoutMonthly),
    oki: lastsText(payout.oki),
    reg: lastsText(payout.reg),
  });
  const max = Math.min(Math.max(payout.oki, payout.reg, 1), CAP);
  for (const [key, val] of [['oki', payout.oki], ['reg', payout.reg]]) {
    document.getElementById(`payoutBar-${key}`).style.width = `${(Math.min(val, CAP) / max) * 100}%`;
    document.getElementById(`payoutYears-${key}`).textContent = lastsText(val);
  }
}
