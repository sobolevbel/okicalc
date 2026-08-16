// News & law-status data. ONE file to edit when something happens:
//
//   TO ADD A NEWS ITEM: copy an entry below, set the ISO date, fill the five
//   texts (pl is the fallback), optionally add a source url — done. No locale
//   files, HTML or renderer changes needed; items are sorted by date at
//   render time (newest first) and dates are localized automatically.
//
//   Also bump STATUS_DATE ("stan na") whenever the facts were last verified
//   (the verify-rates skill does this as part of its checklist).
export const STATUS_DATE = '2026-08-16';

export const NEWS = [
  {
    date: '2026-08-13',
    text: {
      pl: 'Prezydent podpisał ustawę o OKI — konta ruszą 1 stycznia 2027 r.',
      en: 'The President signed the OKI act — accounts launch on 1 January 2027.',
      ru: 'Президент подписал закон об OKI — счета заработают 1 января 2027 года.',
      be: 'Прэзідэнт падпісаў закон аб OKI — рахункі запрацуюць 1 студзеня 2027 года.',
      uk: 'Президент підписав закон про OKI — рахунки запрацюють 1 січня 2027 року.',
    },
    url: 'https://biznes.pap.pl/wiadomosci/rynki/prezydent-podpisal-ustawe-o-osobistych-kontach-inwestycyjnych',
  },
  {
    date: '2026-07-22',
    text: {
      pl: 'Senat przyjął ustawę o OKI bez poprawek.',
      en: 'The Senate passed the OKI act without amendments.',
      ru: 'Сенат принял закон об OKI без поправок.',
      be: 'Сенат прыняў закон аб OKI без паправак.',
      uk: 'Сенат ухвалив закон про OKI без поправок.',
    },
    url: 'https://www.prawo.pl/podatki/sejm-uchwalil-ustawe-o-osobistych-kontach-inwestycyjnych-oki,1544096.html',
  },
  {
    date: '2026-07-03',
    text: {
      pl: 'Sejm uchwalił ustawę o osobistych kontach inwestycyjnych.',
      en: 'The Sejm passed the personal investment accounts act.',
      ru: 'Сейм принял закон о личных инвестиционных счетах.',
      be: 'Сейм ухваліў закон аб асабістых інвестыцыйных рахунках.',
      uk: 'Сейм ухвалив закон про особисті інвестиційні рахунки.',
    },
    url: 'https://www.bankier.pl/smart/sejm-uchwalil-ustawe-o-osobistych-kontach-inwestycyjnych',
  },
  {
    date: '2026-03-05',
    text: {
      pl: 'RPP obniżyła stopę referencyjną NBP do 3,75% — przy tej stopie opłata OKI od 2028 r. wyniosłaby 0,71% rocznie.',
      en: 'The MPC cut the NBP reference rate to 3.75% — at that rate the OKI fee from 2028 would be 0.71% a year.',
      ru: 'Совет по денежно-кредитной политике снизил референсную ставку NBP до 3,75% — при такой ставке сбор OKI с 2028 года составил бы 0,71% в год.',
      be: 'Савет па грашова-крэдытнай палітыцы знізіў рэферэнсную стаўку NBP да 3,75% — пры такой стаўцы збор OKI з 2028 года складаў бы 0,71% у год.',
      uk: 'Рада з монетарної політики знизила референсну ставку NBP до 3,75% — за такої ставки збір OKI з 2028 року становив би 0,71% на рік.',
    },
    url: 'https://www.bankier.pl/gospodarka/wskazniki-makroekonomiczne/referencyjna-pol',
  },
];
