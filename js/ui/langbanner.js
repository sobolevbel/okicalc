// Language suggestion banner: a visitor whose browser is set to another
// language gets a one-click switch — the page never switches on its own.
//
// Silent autodetection used to run at boot and it cost us the search snippet:
// Googlebot (en-US) rendered an English DOM at the canonical URL that <title>,
// the meta description and <html lang="pl"> all promise in Polish, so Google
// indexed the rendered English <h1> as the page title. Offering the language
// instead of applying it keeps the canonical URL honestly Polish — and leaves
// the choice with the reader, which silent switching never did.
//
// Strings live here rather than in js/locales/*.js because the banner must
// speak the language it offers, not the one currently rendered, and t() only
// ever reads the current locale. Co-located like js/news.js: adding a language
// means editing this file alone, so locale key parity never churns.
import { currentLang } from '../i18n.js';

const BANNER = {
  pl: {
    text: 'Ta strona jest dostępna także w języku polskim.',
    action: 'Przełącz na polski',
    close: 'Zamknij',
  },
  en: {
    text: 'This page is also available in English.',
    action: 'Switch to English',
    close: 'Close',
  },
  ru: {
    text: 'Эта страница также доступна на русском языке.',
    action: 'Переключить на русский',
    close: 'Закрыть',
  },
  be: {
    text: 'Гэтая старонка таксама даступная па-беларуску.',
    action: 'Пераключыць на беларускую',
    close: 'Закрыць',
  },
  uk: {
    text: 'Ця сторінка також доступна українською.',
    action: 'Перейти на українську',
    close: 'Закрити',
  },
};

const DISMISS_KEY = 'okicalc:langbanner';
const LANG_KEY = 'okicalc:lang';

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

// The language to offer: the first browser preference we actually support that
// is not what the reader is already looking at. Null means "nothing to offer".
function suggestion() {
  const lang = currentLang();
  for (const cand of navigator.languages || [navigator.language || '']) {
    const base = String(cand).toLowerCase().split('-')[0];
    if (BANNER[base]) return base === lang ? null : base;
  }
  return null;
}

// switchTo(code) is supplied by main.js so the banner reuses the same path as
// the selector (persist the choice, relabel, re-render).
export function initLangBanner(switchTo) {
  // An explicit ?lang= or a previously stored choice both mean the reader has
  // already said what they want; dismissal means they said "stop asking".
  if (new URLSearchParams(location.search).has('lang')) return;
  if (readStorage(LANG_KEY)) return;
  if (readStorage(DISMISS_KEY) === 'off') return;

  const code = suggestion();
  if (!code) return;
  const copy = BANNER[code];

  const bar = document.createElement('div');
  bar.className = 'lang-banner no-print';
  bar.lang = code; // this fragment is deliberately not in the page language
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', copy.action);

  const text = document.createElement('p');
  text.textContent = copy.text;

  const accept = document.createElement('button');
  accept.type = 'button';
  accept.textContent = copy.action;
  accept.addEventListener('click', () => {
    bar.remove();
    switchTo(code);
  });

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'lang-dismiss';
  dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', copy.close);
  dismiss.addEventListener('click', () => {
    try { localStorage.setItem(DISMISS_KEY, 'off'); } catch { /* ignore */ }
    bar.remove();
  });

  bar.append(text, accept, dismiss);
  document.body.insertBefore(bar, document.body.firstChild);

  // Picking a language from the selector answers the question too.
  document.getElementById('selLang')
    .addEventListener('change', () => bar.remove(), { once: true });
}
