// Pure calculation engine. No DOM, importable from Node tests.
//
// The arithmetic order is load-bearing: the golden tests pin exact values
// (integer-precise break-even years), so keep every operation in its
// existing order. All values stay as raw floats; rounding happens only at
// render time.

export const DEFAULTS = Object.freeze({
  v0: 100_000, // initial lump sum, zł
  r: 0.07, // annual nominal return
  n: 20, // horizon, years
  f: 0.0071, // OKI fee rate from 2028 (NBP 3.75% preset)
  f2027: 0.0085, // transitional 2027 rate, applied in year 1 only
  L0: 100_000, // exemption limit, zł
  idx: 0.025, // inflation used for limit valorization
  idxFrom: 3, // limit frozen for years k=0..idxFrom-1 (2027-2029)
  c: 12_000, // annual contribution, zł
  y: 0.0, // dividend yield (cash part of r); 0 = accumulating
  t: 0.19, // Belka tax rate
  crisisEvery: 0, // stress overlay: every m-th year is a crash (0 = off)
  crisisDrop: 0.0, // return in a crash year is -crisisDrop instead of r
});

// Simulate both accounts in one pass over years 1..n.
// Returns an array of per-year rows; row i describes the state after year i+1.
// The prefix of each account's recursion is identical to the standalone
// reference functions, so row k's values equal oki(v0,r,k+1) / reg(v0,r,k+1).
export function simulate(params) {
  const p = { ...DEFAULTS, ...params };
  const { v0, r, n, f, f2027, L0, idx, idxFrom, c, y, t, crisisEvery, crisisDrop } = p;

  let vOki = v0;
  let vReg = v0;
  let basis = v0;
  let cumFee = 0;
  let cumDivTax = 0;

  const rows = [];
  for (let k = 0; k < n; k++) {
    // Stress overlay: every crisisEvery-th year the market returns -crisisDrop
    // instead of r. Deterministic (fixed year numbers, no randomness) so
    // scenarios stay reproducible and URL-shareable. With crisisEvery = 0,
    // rk === r and every result is bit-identical to the base model.
    const rk = crisisEvery > 0 && (k + 1) % crisisEvery === 0 ? -crisisDrop : r;

    // --- OKI: fee on average annual asset value above the (valorized) limit,
    // charged even in loss years. Dividends inside OKI are untaxed and
    // implicitly reinvested (no separate code path).
    const L = L0 * Math.pow(1 + idx, Math.max(0, k - idxFrom + 1));
    const fk = k === 0 ? f2027 : f;
    vOki += c;
    const fee = fk * Math.max(vOki * Math.pow(1 + rk, 0.5) - L, 0);
    vOki = vOki * (1 + rk) - fee;
    cumFee += fee;

    // --- Regular account: dividends taxed yearly, net reinvested (raises the
    // cost basis); capital gains taxed only on exit. The dividend is still
    // paid (and taxed) in a crash year — payouts are steadier than prices.
    vReg += c;
    basis += c;
    const div = vReg * y;
    vReg = vReg * (1 + rk - y) + div * (1 - t);
    basis += div * (1 - t);
    cumDivTax += div * t;

    const exitTax = Math.max(vReg - basis, 0) * t;
    const reg = vReg - exitTax; // wealth if sold at the end of this year
    const adv = vOki - reg;

    rows.push({
      year: k + 1,
      oki: vOki,
      reg,
      regGross: vReg,
      basis,
      fee,
      cumFee,
      exitTax,
      cumDivTax,
      belkaIfSold: cumDivTax + exitTax,
      adv,
      advPct: reg !== 0 ? (adv / reg) * 100 : 0,
    });
  }
  return rows;
}

// Last year in which OKI is still ahead; 0 = loses from year 1.
// Mirrors the reference: strict '>' and stop at the first losing year
// (the advantage curve can be non-monotonic near zero returns).
export function breakeven(params, horizon = 50) {
  const rows = simulate({ ...params, n: horizon });
  let last = 0;
  for (const row of rows) {
    if (row.oki > row.reg) last = row.year;
    else break;
  }
  return last;
}

// Year and value of the maximum advantage within the horizon (null if the
// curve never goes positive).
export function maxAdvantage(rows) {
  let best = null;
  for (const row of rows) {
    if (best === null || row.adv > best.adv) best = row;
  }
  return best && best.adv > 0 ? best : null;
}

// Payout phase: after the n accumulation years, withdraw wNet zł net at the
// start of each year (before growth — mirroring how contributions are added).
// OKI withdrawals are tax-free; on the regular account each sale realizes the
// proportional share of the unrealized gain and pays Belka on it right away,
// so the gross sale G solves G − t·G·gainShare = wNet. Realized losses are
// not carried forward (same simplification as the accumulation phase).
// The global year index keeps running, so limit valorization and the crash
// pattern continue seamlessly across the accumulation/payout boundary.
// Returns how many FULL years each account funds the withdrawal, capped at
// PAYOUT_MAX_YEARS (a returned cap value means "lasts this long or more").
export const PAYOUT_MAX_YEARS = 100;

export function payoutYears(params, wNet, maxYears = PAYOUT_MAX_YEARS) {
  const p = { ...DEFAULTS, ...params };
  const { r, n, f, L0, idx, idxFrom, y, t, crisisEvery, crisisDrop } = p;
  const last = simulate(p).at(-1);
  let vOki = last.oki;
  let vReg = last.regGross;
  let basis = last.basis;

  let okiYears = null;
  let regYears = null;
  for (let k = 0; k < maxYears && (okiYears === null || regYears === null); k++) {
    const j = n + k;
    const rk = crisisEvery > 0 && (j + 1) % crisisEvery === 0 ? -crisisDrop : r;
    const L = L0 * Math.pow(1 + idx, Math.max(0, j - idxFrom + 1));

    if (okiYears === null) {
      if (vOki < wNet) okiYears = k;
      else {
        vOki -= wNet;
        const fee = f * Math.max(vOki * Math.pow(1 + rk, 0.5) - L, 0);
        vOki = vOki * (1 + rk) - fee;
      }
    }
    if (regYears === null) {
      const gainShare = vReg > 0 ? Math.max(1 - basis / vReg, 0) : 0;
      const gross = wNet / (1 - t * gainShare);
      if (vReg < gross) regYears = k;
      else {
        basis -= gross * (basis / vReg);
        vReg -= gross;
        const div = vReg * y;
        vReg = vReg * (1 + rk - y) + div * (1 - t);
        basis += div * (1 - t);
      }
    }
  }
  return { oki: okiYears ?? maxYears, reg: regYears ?? maxYears };
}

// Statutory fee rate from an NBP reference rate (both in percent points):
// 19% of the NBP rate, rounded DOWN to 2 decimals, floor 0.1%.
// Integer-domain floor with a tiny epsilon guards against 56.999999... doubles.
export function feeRateFromNbp(nbpPct) {
  const hundredths = Math.floor(19 * nbpPct + 1e-9);
  return Math.max(0.1, hundredths / 100);
}
