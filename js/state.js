// UI state: defaults, bounds, engine-param mapping, URL (de)serialization.
import { feeRateFromNbp } from './engine.js';

export const BOUNDS = {
  v0: { min: 0, max: 10_000_000, step: 5_000 },
  monthly: { min: 0, max: 20_000, step: 100 },
  rPct: { min: -5, max: 15, step: 0.5 },
  horizon: { min: 1, max: 50, step: 1 },
  feePct: { min: 0.1, max: 1.5, step: 0.01 },
  limit: { min: 0, max: 1_000_000, step: 10_000 },
  inflPct: { min: 0, max: 8, step: 0.1 },
  divPct: { min: 0, max: 5, step: 0.1 },
  belkaPct: { min: 0, max: 40, step: 0.5 },
  crisisEvery: { min: 0, max: 25, step: 1 },
  crisisDropPct: { min: 0, max: 80, step: 5 },
};

export const DEFAULT_STATE = Object.freeze({
  v0: 100_000,
  monthly: 1_000,
  rPct: 7,
  horizon: 20,
  feePct: feeRateFromNbp(3.75), // 0.71
  use2027: true,
  limit: 100_000,
  inflPct: 2.5,
  divPct: 0,
  belkaPct: 19,
  crisisEvery: 0, // stress test off by default
  crisisDropPct: 30,
});

export const NBP_PRESETS = [2.0, 3.0, 3.75, 5.0, 6.0];

export function clamp(value, key) {
  const b = BOUNDS[key];
  if (!Number.isFinite(value)) return DEFAULT_STATE[key];
  return Math.min(b.max, Math.max(b.min, value));
}

// UI state → engine params. Percent fields become fractions here, in one
// place; dividends are clamped to the non-negative part of the return.
export function engineParams(s, n) {
  const f = s.feePct / 100;
  return {
    v0: s.v0,
    r: s.rPct / 100,
    n: n ?? s.horizon,
    f,
    f2027: s.use2027 ? 0.0085 : f,
    L0: s.limit,
    idx: s.inflPct / 100,
    idxFrom: 3,
    c: s.monthly * 12,
    y: Math.min(s.divPct, Math.max(s.rPct, 0)) / 100,
    t: s.belkaPct / 100,
    crisisEvery: Math.round(s.crisisEvery),
    crisisDrop: s.crisisDropPct / 100,
  };
}

// Short query keys so scenario links stay compact. Only non-default values
// are serialized. Language is intentionally NOT part of the scenario.
const URL_KEYS = [
  ['v0', 'v0'],
  ['m', 'monthly'],
  ['r', 'rPct'],
  ['h', 'horizon'],
  ['f', 'feePct'],
  ['lim', 'limit'],
  ['inf', 'inflPct'],
  ['div', 'divPct'],
  ['t', 'belkaPct'],
  ['ce', 'crisisEvery'],
  ['cd', 'crisisDropPct'],
];

export function encodeState(s) {
  const p = new URLSearchParams();
  for (const [short, key] of URL_KEYS) {
    if (s[key] !== DEFAULT_STATE[key]) p.set(short, String(s[key]));
  }
  if (!s.use2027) p.set('y27', '0');
  return p;
}

// Malformed or out-of-range values silently fall back to defaults/bounds.
export function decodeState(search) {
  const p = new URLSearchParams(search);
  const s = { ...DEFAULT_STATE };
  for (const [short, key] of URL_KEYS) {
    if (p.has(short)) s[key] = clamp(parseFloat(p.get(short)), key);
  }
  s.crisisEvery = Math.round(s.crisisEvery); // whole years only
  if (p.get('y27') === '0') s.use2027 = false;
  return s;
}
