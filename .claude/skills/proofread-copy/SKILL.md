---
name: proofread-copy
description: Proofread and fix okicalc's user-facing copy in all five locales (PL/EN/RU/BE/UK) — terminology consistency, placeholder-vs-case grammar, Slavic-specific traps, register, and the three-copy Polish sync. Use after adding or editing any locale strings, static HTML text, news items or JSON-LD, and whenever the user asks to check texts for errors.
---

# Proofread okicalc copy

Every batch of new strings in this project has shipped with at least one
error of the same few kinds. This skill is the distilled checklist — run it
BEFORE committing new copy, not only when asked to proofread.

## 0. Scope of a pass

Collect every string added or changed in: `js/locales/{pl,en,ru,be,uk}.js`,
static Polish text in `index.html` (including JSON-LD), `js/news.js` items.
Read each one aloud per language — most catches below came from that, not
from diffing.

## 1. Glossary — established terms, never synonyms

New strings MUST reuse the exact terms the rest of the UI already uses.
Grep before writing (`grep "сбор OKI" js/locales/ru.js` etc.).

| Concept | PL | EN | RU | BE | UK |
|---|---|---|---|---|---|
| the OKI levy | opłata OKI | OKI fee | сбор OKI | збор OKI | збір OKI |
| Belka tax | podatek Belki | Belka tax | налог Белки | падатак Бэлькі | податок Бельки |
| NBP rate | stopa referencyjna NBP | NBP reference rate | референсная ставка NBP | рэферэнсная стаўка NBP | референсна ставка NBP |
| regular account | zwykłe konto (maklerskie) | regular (brokerage) account | обычный (брокерский) счёт | звычайны (брокерскі) рахунак | звичайний (брокерський) рахунок |
| statutory (fee) | ustawowa (opłata) | statutory (fee) | установленный законом | устаноўлены законам | встановлений законом |
| off (toggle) | wył. | off | выкл. | выкл. | вимк. |

Caught here before: «плата OKI» instead of «сбор OKI» (RU/BE/UK);
«законодательный сбор» instead of «установленный законом» (законодательный
= law-making, a wrong derivation — same trap in BE/UK).

## 2. Placeholders × case government (the #1 recurring bug)

`{years}`, `tp('plural.years', n)` and similar insert a NOMINATIVE form
("21 год", "20 lat"). Slavic prepositions govern oblique cases, so
**never put a plural placeholder right after a preposition**:

- WRONG: «после {years}» → "после 21 год"; "po {years}" → "po 20 lat"
  (needs "po 20 latach").
- RIGHT: rephrase so the placeholder is parenthetical or nominative:
  «по истечении горизонта ({years})», "po upływie horyzontu ({years})".

Also check plural-category edges per CLDR: RU/BE/UK 'one' also matches
21, 31, … («раз в 21 год» — so "каждый год" phrasing would break); PL
'few' is 2–4 and x2–x4 except 12–14. Test mentally with n = 1, 2, 5, 21.

## 3. Language-specific traps (each has bitten us)

**PL**
- Virile vs non-virile numerals: «siedmiu maklerów» but «siedem domów
  maklerskich» (caught: "siedmiu z dziesięciu domów deklaruje").
- Numeral subject → singular verb: "siedem domów deklaruje".
- Semantic re-read: "Lata są stałe" read as "years are constant" — say
  what you mean ("Lata krachów są ustalone z góry").

**RU**
- «хватит» takes genitive: «обычного счёта хватит на …».
- Genitive of negation: «не создают сбора».
- Prefer «после окончания горизонта» over «после конца горизонта».

**BE**
- ў after vowels (incl. across word boundary), у after consonants and at
  sentence start: «толькі ўстаноўлены», «сцэнарый узнаўляе», «і ў такія».
- 2008 orthography for borrowings: «нета» (not нетто).
- Future perfective forms: «перастанеце» (not «перастаяце»).

**UK**
- Euphony: і/й (й between vowels: «списується й у такі роки»), з/із/зі
  («сім із десяти»).
- Idioms, not word-for-word from PL/RU: «Рада монетарної політики»
  (caught: «Рада з монетарної політики»).
- «вистачить» takes genitive, same as RU.

**All Slavic**
- No metonymy calqued from English: not «продажа платит налог» /
  "sprzedaż płaci podatek" — use a person or impersonal: «przy każdej
  sprzedaży płacisz…», «при каждой продаже платится…».

## 4. Register

- Plain language, no finance jargon: "obie kwoty są przeliczane tak samo",
  not "deflowane". The site's voice is a calm explainer (PL uses ty-forms,
  RU/BE/UK use вы-forms — keep each language's established person).
- Numbers at render: watch Intl edge cases — `fmtPct(-v)` at v=0 prints
  "−0%" (fix with `-v || 0`).

## 5. Three-copy sync + parity (verify, don't trust)

Polish content lives in up to THREE verbatim-identical copies: `pl.js`
keys, static HTML in `index.html`, and the FAQPage JSON-LD. Any PL fix
must land in all of them. Then run:

```bash
npm test
node --input-type=module -e "
import pl from './js/locales/pl.js'; import en from './js/locales/en.js';
import ru from './js/locales/ru.js'; import be from './js/locales/be.js'; import uk from './js/locales/uk.js';
import { readFileSync } from 'node:fs';
const canon = Object.keys(en).sort();
for (const [n,l] of [['pl',pl],['ru',ru],['be',be],['uk',uk]]) {
  const k = Object.keys(l).sort();
  console.log(n, canon.length===k.length && canon.every((x,i)=>x===k[i]) ? 'parity ok' : 'PARITY FAIL');
}
const html = readFileSync('index.html','utf8');
const staticKeys = Object.keys(pl).filter(k => new RegExp('data-i18n=\"'+k+'\"').test(html))
  .filter(k => { const el = html.match(new RegExp('data-i18n=\"'+k+'\"[^>]*>([^<]*)<')); return el && el[1].trim(); });
let bad = 0;
for (const k of staticKeys) if (!html.includes(pl[k])) { console.log('STATIC MISMATCH', k); bad++; }
const faq = [...html.matchAll(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(b=>b['@type']==='FAQPage');
const jsonOk = faq.mainEntity.every((q,i)=>q.name===pl['faq.q'+(i+1)] && q.acceptedAnswer.text===pl['faq.a'+(i+1)]);
console.log(bad ? 'STATIC FAIL' : 'static PL ok', '| JSON-LD = pl.js:', jsonOk);
"
```

`en.js` is the canonical key set — every locale must define exactly the
same keys. News texts are the exception: they live only in `js/news.js`
(five translations co-located per item), never in locale files.

## 6. Report format

List per language: fixed (with the wrong → right pair and why), checked
and confirmed correct (so the user sees what was covered), and the
verification results (tests, parity, sync). Fix errors only — do not
restyle text that is already correct.
