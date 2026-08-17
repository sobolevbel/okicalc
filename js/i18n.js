// Tiny i18n: flat-key dictionaries, {var} interpolation, CLDR plurals via
// Intl.PluralRules, locale-aware numbers via Intl.NumberFormat.
import pl from './locales/pl.js';
import en from './locales/en.js';
import ru from './locales/ru.js';
import be from './locales/be.js';
import uk from './locales/uk.js';

const LOCALES = { pl, en, ru, be, uk };

export const LANGS = [
  { code: 'pl', label: 'Polski' },
  { code: 'en', label: 'English' },
  { code: 'be', label: 'Беларуская' },
  { code: 'uk', label: 'Українська' },
  { code: 'ru', label: 'Русский' },
];

const STORAGE_KEY = 'okicalc:lang';
const DEFAULT_LANG = 'pl';
let lang = DEFAULT_LANG;
let pluralRules = new Intl.PluralRules(DEFAULT_LANG);
const formatters = new Map();

export function currentLang() {
  return lang;
}

// Language for a URL without ?lang: a returning visitor's own choice, else
// Polish. Deliberately does NOT sniff navigator.languages — the canonical URL
// must render the same Polish content its <title>, meta description and
// <html lang="pl"> promise, or crawlers index it as an English page. Other
// languages are reachable via ?lang=xx (hreflang) and the selector.
export function storedLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES[saved]) return saved;
  } catch { /* storage may be unavailable */ }
  return DEFAULT_LANG;
}

export function setLang(code, { persist = true } = {}) {
  if (!LOCALES[code]) code = DEFAULT_LANG;
  lang = code;
  pluralRules = new Intl.PluralRules(code);
  formatters.clear();
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }
  document.documentElement.lang = code;
}

function interpolate(s, vars) {
  return vars
    ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m))
    : s;
}

export function t(key, vars) {
  let s = LOCALES[lang][key] ?? LOCALES.en[key];
  if (s === undefined) {
    console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (typeof s === 'object') s = s.other ?? Object.values(s)[0];
  return interpolate(s, vars);
}

// Plural-aware translation. The dictionary entry is an object keyed by CLDR
// plural categories (one/few/many/other). {n} is substituted with the count.
export function tp(key, n, vars) {
  const forms = LOCALES[lang][key] ?? LOCALES.en[key];
  if (!forms || typeof forms !== 'object') return t(key, { n: fmtNumber(n), ...vars });
  const s = forms[pluralRules.select(n)] ?? forms.other;
  return interpolate(s, { n: fmtNumber(n), ...vars });
}

function nf(opts) {
  const k = JSON.stringify(opts);
  let f = formatters.get(k);
  if (!f) {
    f = new Intl.NumberFormat(lang, opts);
    formatters.set(k, f);
  }
  return f;
}

export function fmtNumber(v, maxFrac = 0) {
  return nf({ maximumFractionDigits: maxFrac }).format(v);
}

// Amounts in złoty: locale digits + a non-breaking "zł" suffix (deliberately
// not currency:'PLN' — some locales render that as "PLN"/"зл." inconsistently).
export function fmtMoney(v, maxFrac = 0) {
  return `${fmtNumber(v, maxFrac)} zł`;
}

export function fmtSignedMoney(v, maxFrac = 0) {
  return `${nf({ maximumFractionDigits: maxFrac, signDisplay: 'exceptZero' }).format(v)} zł`;
}

// Axis ticks: "1,2 mln" / "500K" — compact, locale-aware.
export function fmtCompact(v) {
  return nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export function fmtPct(v, maxFrac = 2) {
  return nf({ style: 'percent', maximumFractionDigits: maxFrac }).format(v / 100);
}

export function fmtSignedPct(v, maxFrac = 2) {
  return nf({ style: 'percent', maximumFractionDigits: maxFrac, signDisplay: 'exceptZero' }).format(v / 100);
}

// "20 lat" / "20 years" / "20 лет" — the workhorse for horizons.
export function years(n) {
  return tp('plural.years', n);
}

// Re-translate all static text under root (used on language switch).
export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  }
}
