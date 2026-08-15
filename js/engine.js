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
});

// Simulate both accounts in one pass over years 1..n.
// Returns an array of per-year rows; row i describes the state after year i+1.
// The prefix of each account's recursion is identical to the standalone
// reference functions, so row k's values equal oki(v0,r,k+1) / reg(v0,r,k+1).
export function simulate(params) {
  const p = { ...DEFAULTS, ...params };
  const { v0, r, n, f, f2027, L0, idx, idxFrom, c, y, t } = p;

  let vOki = v0;
  let vReg = v0;
  let basis = v0;
  let cumFee = 0;
  let cumDivTax = 0;

  const rows = [];
  for (let k = 0; k < n; k++) {
    // --- OKI: fee on average annual asset value above the (valorized) limit,
    // charged even in loss years. Dividends inside OKI are untaxed and
    // implicitly reinvested (no separate code path).
    const L = L0 * Math.pow(1 + idx, Math.max(0, k - idxFrom + 1));
    const fk = k === 0 ? f2027 : f;
    vOki += c;
    const fee = fk * Math.max(vOki * Math.pow(1 + r, 0.5) - L, 0);
    vOki = vOki * (1 + r) - fee;
    cumFee += fee;

    // --- Regular account: dividends taxed yearly, net reinvested (raises the
    // cost basis); capital gains taxed only on exit.
    vReg += c;
    basis += c;
    const div = vReg * y;
    vReg = vReg * (1 + r - y) + div * (1 - t);
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

// Statutory fee rate from an NBP reference rate (both in percent points):
// 19% of the NBP rate, rounded DOWN to 2 decimals, floor 0.1%.
// Integer-domain floor with a tiny epsilon guards against 56.999999... doubles.
export function feeRateFromNbp(nbpPct) {
  const hundredths = Math.floor(19 * nbpPct + 1e-9);
  return Math.max(0.1, hundredths / 100);
}
