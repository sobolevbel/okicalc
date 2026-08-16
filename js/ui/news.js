// Renders the "stan na" date and the news list from js/news.js — that data
// file is the only thing to edit when adding a news item. Re-run on language
// switch: dates and texts are locale-dependent.
import { NEWS, STATUS_DATE } from '../news.js';
import { currentLang } from '../i18n.js';

function fmtDate(iso) {
  return new Intl.DateTimeFormat(currentLang(), { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${iso}T00:00:00`));
}

export function renderNews() {
  document.getElementById('statusAsOf').textContent = fmtDate(STATUS_DATE);

  const list = document.getElementById('newsList');
  list.textContent = '';
  const lang = currentLang();
  for (const item of [...NEWS].sort((a, b) => b.date.localeCompare(a.date))) {
    const li = document.createElement('li');
    const time = document.createElement('time');
    time.dateTime = item.date;
    time.textContent = fmtDate(item.date);
    li.appendChild(time);
    const text = item.text[lang] ?? item.text.pl;
    if (item.url) {
      const a = document.createElement('a');
      a.href = item.url;
      a.rel = 'noopener';
      a.textContent = text;
      li.appendChild(a);
    } else {
      li.append(text);
    }
    list.appendChild(li);
  }
}
