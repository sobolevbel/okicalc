// Hand-rolled SVG line/area charts. Colors come from CSS classes bound to
// theme tokens, so a theme switch needs no re-render. Every chart gets a
// crosshair + tooltip (pointer) and ←/→ year stepping (keyboard); the same
// data is always reachable in the year-by-year table, so tooltips never gate.
const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

function niceTicks(lo, hi, count = 5) {
  if (hi - lo < 1e-9) hi = lo + 1;
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) {
    ticks.push(Math.abs(v) < step * 1e-6 ? 0 : v);
  }
  return ticks;
}

function pathFrom(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('');
}

// cfg: {
//   series: [{ lineCls, dotCls, keyCls, name, values }],  // values[i] = year i
//   advantage: { values } | null,   // split-fill area around zero, uses series[0] line
//   markers: { breakeven, peak: {year, value}, horizon, labels: {...} },
//   yFmt, includeZeroFloor, ariaLabel, tooltip(idx) -> { title, rows: [{keyCls, name, value}] }
// }
export function renderChart(fig, cfg) {
  fig.querySelector('svg')?.remove();
  if (cfg.ariaLabel) fig.setAttribute('aria-label', cfg.ariaLabel);
  const tooltip = fig.querySelector('.chart-tooltip');
  tooltip.hidden = true;

  const W = Math.max(280, fig.clientWidth || 640);
  const H = Math.round(Math.max(220, Math.min(330, W * 0.42)));
  const M = { t: 16, r: 14, b: 26, l: 8 };

  const xMax = cfg.series[0].values.length - 1;
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of cfg.series) {
    for (const v of s.values) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (cfg.includeZeroFloor) lo = Math.min(0, lo);
  if (cfg.advantage) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  const pad = (hi - lo) * 0.07 || 1;
  hi += pad;
  if (!cfg.includeZeroFloor || lo < 0) lo -= pad;
  const yTicks = niceTicks(lo, hi, 5);

  // Left margin sized to the widest tick label (~6.6px per char at 11.5px).
  const labels = yTicks.map((v) => cfg.yFmt(v));
  M.l = 8 + Math.max(...labels.map((s) => s.length)) * 6.6 + 6;

  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const sx = (year) => M.l + (year / xMax) * iw;
  const sy = (v) => M.t + ((hi - v) / (hi - lo)) * ih;

  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    width: W,
    height: H,
    'aria-label': cfg.ariaLabel || '',
    role: 'img',
    focusable: 'false',
  });
  fig.insertBefore(svg, tooltip);

  // Gridlines + y labels
  for (let i = 0; i < yTicks.length; i++) {
    const v = yTicks[i];
    const y = sy(v);
    el('line', { x1: M.l, x2: W - M.r, y1: y, y2: y, class: v === 0 && cfg.advantage ? 'zeroline' : 'gridline' }, svg);
    el('text', { x: M.l - 6, y: y + 3.5, 'text-anchor': 'end', class: 'axis-text' }, svg).textContent = labels[i];
  }
  // X axis
  el('line', { x1: M.l, x2: W - M.r, y1: M.t + ih, y2: M.t + ih, class: 'axisline' }, svg);
  const xStep = W < 480 ? 10 : 5;
  for (let yr = 0; yr <= xMax; yr += xStep) {
    el('text', { x: sx(yr), y: H - 8, 'text-anchor': 'middle', class: 'axis-text' }, svg).textContent = String(yr);
  }

  // Advantage split-fill (positive wash above zero, negative below)
  if (cfg.advantage) {
    const vals = cfg.advantage.values;
    const zero = sy(0);
    const area = pathFrom(vals.map((v, i) => [sx(i), sy(v)]))
      + `L${sx(xMax).toFixed(2)},${zero.toFixed(2)}L${sx(0).toFixed(2)},${zero.toFixed(2)}Z`;
    const clipTop = el('clipPath', { id: `${fig.id}-clip-pos` }, svg);
    el('rect', { x: 0, y: 0, width: W, height: zero }, clipTop);
    const clipBot = el('clipPath', { id: `${fig.id}-clip-neg` }, svg);
    el('rect', { x: 0, y: zero, width: W, height: H - zero }, clipBot);
    el('path', { d: area, class: 'area-pos', 'clip-path': `url(#${fig.id}-clip-pos)` }, svg);
    el('path', { d: area, class: 'area-neg', 'clip-path': `url(#${fig.id}-clip-neg)` }, svg);
  }

  // Marker: horizon (solid accent) and breakeven (dashed threshold)
  const mk = cfg.markers || {};
  const markText = (x, text, cls = 'marker-text') => {
    const anchor = x > W - 90 ? 'end' : 'start';
    const tx = anchor === 'end' ? x - 5 : x + 5;
    el('text', { x: tx, y: M.t + 11, 'text-anchor': anchor, class: cls }, svg).textContent = text;
  };
  if (Number.isFinite(mk.horizon)) {
    const x = sx(mk.horizon);
    el('line', { x1: x, x2: x, y1: M.t, y2: M.t + ih, class: 'vline-horizon', opacity: 0.55 }, svg);
    if (mk.labels?.horizon) markText(x, mk.labels.horizon);
  }
  if (Number.isFinite(mk.breakeven) && mk.breakeven > 0 && mk.breakeven < xMax) {
    const x = sx(mk.breakeven);
    el('line', { x1: x, x2: x, y1: M.t, y2: M.t + ih, class: 'vline-threshold' }, svg);
    if (mk.labels?.breakeven) {
      el('text', { x: x + 5, y: M.t + ih - 6, class: 'marker-text' }, svg).textContent = `${mk.labels.breakeven}: ${mk.breakeven}`;
    }
  }

  // Series lines + end dots
  for (const s of cfg.series) {
    el('path', { d: pathFrom(s.values.map((v, i) => [sx(i), sy(v)])), class: s.lineCls }, svg);
    el('circle', { cx: sx(xMax), cy: sy(s.values[xMax]), r: 4.5, class: s.dotCls }, svg);
  }

  // Peak dot
  if (mk.peak) {
    el('circle', { cx: sx(mk.peak.year), cy: sy(mk.peak.value), r: 5, class: 'peak-dot pos' }, svg);
    if (mk.labels?.peak) {
      const x = sx(mk.peak.year);
      const anchor = x > W - 110 ? 'end' : 'start';
      el('text', {
        x: anchor === 'end' ? x - 8 : x + 8,
        y: Math.max(sy(mk.peak.value) - 8, M.t + 10),
        'text-anchor': anchor,
        class: 'marker-text',
      }, svg).textContent = mk.labels.peak;
    }
  }

  // ---- Hover / keyboard layer ----
  const cross = el('line', { y1: M.t, y2: M.t + ih, class: 'crosshair', visibility: 'hidden' }, svg);
  const hoverDots = cfg.series.map((s) => el('circle', { r: 4.5, class: `hover-dot ${s.dotCls}`, visibility: 'hidden' }, svg));

  const hide = () => {
    tooltip.hidden = true;
    cross.setAttribute('visibility', 'hidden');
    hoverDots.forEach((d) => d.setAttribute('visibility', 'hidden'));
    fig.dataset.year = '';
  };

  const show = (year) => {
    year = Math.max(0, Math.min(xMax, year));
    fig.dataset.year = String(year);
    const x = sx(year);
    cross.setAttribute('x1', x);
    cross.setAttribute('x2', x);
    cross.setAttribute('visibility', 'visible');
    cfg.series.forEach((s, i) => {
      hoverDots[i].setAttribute('cx', x);
      hoverDots[i].setAttribute('cy', sy(s.values[year]));
      hoverDots[i].setAttribute('visibility', 'visible');
    });
    // Tooltip content (textContent only — no HTML injection)
    const data = cfg.tooltip(year);
    tooltip.textContent = '';
    const title = document.createElement('p');
    title.className = 'tt-title';
    title.textContent = data.title;
    tooltip.appendChild(title);
    for (const row of data.rows) {
      const div = document.createElement('div');
      div.className = 'tt-row';
      const key = document.createElement('span');
      key.className = `tt-key legend-key ${row.keyCls || ''}`;
      const name = document.createElement('span');
      name.className = 'tt-name';
      name.textContent = row.name;
      const val = document.createElement('span');
      val.className = 'tt-val';
      val.textContent = row.value;
      div.append(key, name, val);
      tooltip.appendChild(div);
    }
    tooltip.hidden = false;
    const figW = fig.clientWidth;
    const ttW = tooltip.offsetWidth;
    const px = (x / W) * figW;
    tooltip.style.left = `${px + ttW + 18 > figW ? px - ttW - 12 : px + 12}px`;
    tooltip.style.top = '18px';
  };

  const overlay = el('rect', {
    x: M.l, y: M.t, width: iw, height: ih, fill: 'transparent',
  }, svg);
  overlay.style.touchAction = 'pan-y';
  overlay.addEventListener('pointermove', (ev) => {
    const rect = svg.getBoundingClientRect();
    const frac = (ev.clientX - rect.left) / rect.width;
    show(Math.round(((frac * W) - M.l) / iw * xMax));
  });
  overlay.addEventListener('pointerdown', (ev) => {
    const rect = svg.getBoundingClientRect();
    const frac = (ev.clientX - rect.left) / rect.width;
    show(Math.round(((frac * W) - M.l) / iw * xMax));
  });
  svg.addEventListener('pointerleave', hide);

  fig.onkeydown = (ev) => {
    const cur = fig.dataset.year === '' || fig.dataset.year === undefined
      ? (Number.isFinite(mk.horizon) ? mk.horizon : Math.round(xMax / 2))
      : Number(fig.dataset.year);
    if (ev.key === 'ArrowRight') { show(cur + 1); ev.preventDefault(); }
    else if (ev.key === 'ArrowLeft') { show(cur - 1); ev.preventDefault(); }
    else if (ev.key === 'Home') { show(0); ev.preventDefault(); }
    else if (ev.key === 'End') { show(xMax); ev.preventDefault(); }
    else if (ev.key === 'Escape') hide();
  };
  fig.onblur = hide;
}
