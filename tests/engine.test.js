// Golden-value tests: every number below was precomputed with an
// independent reference implementation of the same model and pins the
// engine's exact arithmetic (break-even years are integer-precise).
// Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, breakeven, feeRateFromNbp } from '../js/engine.js';

// Golden baseline: lump sum, accumulating instrument, constant 0.85% fee,
// fixed 100k limit, no contributions.
const DOC = { f: 0.0085, f2027: 0.0085, L0: 100_000, idx: 0, idxFrom: 3, c: 0, y: 0, t: 0.19 };

const okiFinal = (v0, r, n, extra = {}) => simulate({ ...DOC, v0, r, n, ...extra }).at(-1).oki;
const regFinal = (v0, r, n, extra = {}) => simulate({ ...DOC, v0, r, n, ...extra }).at(-1).reg;

// --- Full 16×14 breakeven table (50+ capped at horizon 50) ---
const SUMS = [25_000, 50_000, 75_000, 100_000, 125_000, 150_000, 175_000, 200_000,
  250_000, 300_000, 400_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000];
const RATES = [-0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.12, 0.15];
const TABLE = [
  [0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 47, 43],
  [0, 0, 50, 50, 50, 50, 50, 50, 49, 46, 44, 43, 40, 38],
  [0, 0, 50, 50, 50, 50, 46, 44, 42, 40, 39, 38, 37, 35],
  [0, 0, 47, 44, 42, 40, 39, 38, 37, 36, 35, 35, 34, 33],
  [0, 0, 5, 26, 31, 33, 33, 33, 33, 33, 33, 33, 32, 31],
  [0, 0, 0, 13, 23, 28, 30, 30, 31, 31, 31, 31, 31, 30],
  [0, 0, 0, 2, 17, 24, 27, 28, 29, 29, 30, 30, 30, 30],
  [0, 0, 0, 0, 12, 20, 24, 26, 27, 28, 29, 29, 29, 29],
  [0, 0, 0, 0, 5, 16, 21, 24, 25, 26, 27, 28, 28, 28],
  [0, 0, 0, 0, 0, 12, 18, 22, 24, 25, 26, 27, 27, 28],
  [0, 0, 0, 0, 0, 8, 15, 20, 22, 24, 25, 26, 26, 27],
  [0, 0, 0, 0, 0, 5, 13, 18, 21, 23, 24, 25, 26, 27],
  [0, 0, 0, 0, 0, 1, 11, 16, 19, 22, 23, 24, 25, 26],
  [0, 0, 0, 0, 0, 0, 9, 15, 19, 21, 22, 24, 25, 26],
  [0, 0, 0, 0, 0, 0, 8, 14, 18, 20, 22, 23, 25, 26],
  [0, 0, 0, 0, 0, 0, 7, 14, 17, 20, 22, 23, 24, 26],
];

test('breakeven table matches exactly (all 224 cells)', () => {
  SUMS.forEach((v0, i) => {
    const row = RATES.map((r) => breakeven({ ...DOC, v0, r }, 50));
    assert.deepEqual(row, TABLE[i], `row v0=${v0}`);
  });
});

// --- Advantage curves, 7% return. zł exact to ±1; % (of the regular
// account's capital) to ±0.01.
const CURVES = {
  500_000: {
    1: [3104, 0.59], 5: [14702, 2.22], 10: [25248, 2.83], 15: [26479, 2.18],
    17: [22618, 1.65], 20: [9955, 0.60], 25: [-37781, -1.65], 30: [-137791, -4.34],
  },
  2_000_000: {
    1: [9865, 0.47], 5: [44400, 1.67], 10: [67189, 1.88], 15: [46013, 0.95],
    17: [17756, 0.32], 20: [-55208, -0.83], 25: [-293432, -3.20], 30: [-757099, -5.96],
  },
};

test('advantage curves (zł and % of regular account)', () => {
  for (const [v0, points] of Object.entries(CURVES)) {
    const rows = simulate({ ...DOC, v0: Number(v0), r: 0.07, n: 30 });
    for (const [year, [zl, pct]] of Object.entries(points)) {
      const row = rows[year - 1];
      assert.ok(Math.abs(row.adv - zl) <= 1, `v0=${v0} y=${year}: adv ${row.adv} vs ${zl}`);
      assert.ok(Math.abs(row.advPct - pct) <= 0.01, `v0=${v0} y=${year}: pct ${row.advPct} vs ${pct}`);
    }
  }
});

// --- Closed form vs recursion ---
test('closed form matches recursion to 1e-12', () => {
  for (const [v0, r, n] of [[500_000, 0.07, 20], [2_000_000, 0.10, 35], [300_000, 0.03, 15]]) {
    const a = (1 + r) - 0.0085 * Math.pow(1 + r, 0.5);
    const b = 0.0085 * 100_000;
    const closed = Math.pow(a, n) * v0 + b * (Math.pow(a, n) - 1) / (a - 1);
    const rec = okiFinal(v0, r, n);
    assert.ok(Math.abs(closed - rec) / closed < 1e-12, `${v0}@${r}x${n}: ${closed} vs ${rec}`);
  }
});

// --- Fee-rate sensitivity for 1M zł: f2027 = f (no transitional first
// year), horizon beyond 50 years.
test('fee sensitivity, 1M zł, horizon 60', () => {
  const expected = {
    0.0038: [50, 54, 57, 58],
    0.0057: [22, 29, 35, 38],
    0.0071: [9, 18, 26, 30],
    0.0085: [0, 9, 19, 24],
    0.0114: [0, 0, 8, 15],
  };
  for (const [f, want] of Object.entries(expected)) {
    const got = [0.04, 0.05, 0.07, 0.10].map((r) =>
      breakeven({ ...DOC, v0: 1_000_000, r, f: Number(f), f2027: Number(f) }, 60));
    assert.deepEqual(got, want, `f=${f}`);
  }
});

// --- Limit valorization, 500k, 2.5% inflation from year 4 ---
test('limit valorization', () => {
  const cases = [[0.05, 13, 14], [0.07, 21, 22], [0.10, 25, 25]];
  for (const [r, noVal, withVal] of cases) {
    assert.equal(breakeven({ ...DOC, v0: 500_000, r }, 50), noVal);
    assert.equal(breakeven({ ...DOC, v0: 500_000, r, idx: 0.025 }, 50), withVal);
  }
});

// --- Accumulation from zero, 50k/year contributions ---
test('regular contributions from zero', () => {
  const cases = [[0.05, 19], [0.07, 28], [0.10, 32]];
  for (const [r, want] of cases) {
    assert.equal(breakeven({ ...DOC, v0: 0, r, c: 50_000 }, 50), want);
  }
});

// --- One-year cell of the naive static comparison ---
test('one-year difference, 125k @ 1%', () => {
  const rows = simulate({ ...DOC, v0: 125_000, r: 0.01, n: 1 });
  // the naive one-year comparison charges the fee on V0 above the limit,
  // without intra-year growth; verify that simplified formula first
  const cell = 0.0085 * Math.max(125_000 - 100_000, 0) - 0.19 * 125_000 * 0.01;
  assert.equal(Math.round(cell), -25);
  // The dynamic model legitimately disagrees with the naive comparison here:
  // Belka is only owed on exit, so OKI is actually ahead in year 1 (and stays
  // ahead through year 5 — this cell's breakeven in the golden table).
  assert.ok(rows[0].adv > 0 && rows[0].adv < 60, `year-1 adv ${rows[0].adv}`);
  assert.equal(breakeven({ ...DOC, v0: 125_000, r: 0.01 }, 50), 5);
});

// --- dividends: distributing instrument shifts the balance toward OKI ---
test('dividends favor OKI (yearly Belka on payouts)', () => {
  const acc = breakeven({ ...DOC, v0: 500_000, r: 0.07 }, 50);
  const dist = breakeven({ ...DOC, v0: 500_000, r: 0.07, y: 0.03 }, 50);
  assert.ok(dist > acc, `dist ${dist} should be > acc ${acc}`);
  // reg with dividends must end lower than accumulating reg (tax drag)
  assert.ok(regFinal(500_000, 0.07, 20, { y: 0.03 }) < regFinal(500_000, 0.07, 20));
});

// --- edge cases ---
test('negative return: OKI fee still charged, regular pays no tax', () => {
  const rows = simulate({ ...DOC, v0: 500_000, r: -0.01, n: 10 });
  assert.ok(rows.every((row) => row.fee > 0));
  assert.ok(rows.every((row) => row.exitTax === 0));
  assert.equal(breakeven({ ...DOC, v0: 500_000, r: -0.01 }, 50), 0);
});

test('below limit with zero return: no fee, no tax, dead heat', () => {
  const rows = simulate({ ...DOC, v0: 50_000, r: 0, n: 10 });
  assert.ok(rows.every((row) => row.fee === 0 && row.adv === 0));
});

// --- statutory fee-rate helper: floor to 2 decimals, min 0.1% ---
test('feeRateFromNbp presets', () => {
  assert.equal(feeRateFromNbp(2.00), 0.38);
  assert.equal(feeRateFromNbp(3.00), 0.57);
  assert.equal(feeRateFromNbp(3.75), 0.71);
  assert.equal(feeRateFromNbp(5.00), 0.95);
  assert.equal(feeRateFromNbp(6.00), 1.14);
  assert.equal(feeRateFromNbp(0.25), 0.1); // clamped to the statutory floor
});
