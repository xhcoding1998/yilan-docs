// The Chrome Web Store page, once the extension is listed there. Empty until then: the page
// offers the package to download and says the store listing is coming.
const STORE_URL = '';

for (const link of document.querySelectorAll('[data-store]')) {
  if (STORE_URL) {
    if (link.tagName === 'A' && !link.getAttribute('href')) link.href = STORE_URL;
    link.hidden = false;
  }
}
if (STORE_URL) for (const el of document.querySelectorAll('[data-store-pending]')) el.hidden = true;

// The opening sentence is translated the way the extension does it: a hand-drawn ring, dotted
// while it works and solid once done, then the translation in the highlight style.
const PALETTE = ['#4da2ff', '#55db9c', '#ffd731', '#fb4903', '#5c4ade'];
const SVG = 'http://www.w3.org/2000/svg';
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

const stage = document.getElementById('stage');
const sentence = document.getElementById('sentence');
const ring = document.getElementById('ring');
const ask = document.getElementById('ask');
const result = document.getElementById('result');

/** Points round a rounded box, nudged off the line a little so it looks drawn by hand. */
function outline(box, tailAt, room) {
  // As far out as the page margin allows: on a phone it is narrow.
  const pad = { x: Math.max(6, Math.min(16, room - 4)), y: 10 };
  const r = 20;
  const left = box.left - pad.x;
  const right = box.right + pad.x;
  const top = box.top - pad.y;
  const bottom = box.bottom + pad.y;
  const points = [];
  const step = 26;
  const edge = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) points.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  const corner = (cx, cy, from) => {
    for (let i = 0; i < 3; i++) {
      const a = from + (i * Math.PI) / 6;
      points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  edge(left + r, top, right - r, top);
  corner(right - r, top + r, -Math.PI / 2);
  edge(right, top + r, right, bottom - r);
  corner(right - r, bottom - r, 0);
  // Along the bottom, right to left, with the tail pointing down at the button.
  const n = Math.max(2, Math.round((right - left - 2 * r) / step));
  for (let i = 0; i < n; i++) {
    const x = right - r - ((right - left - 2 * r) * i) / n;
    if (tailAt && x < tailAt + 10 && x > tailAt - 16 && !points.tail) {
      points.push([tailAt + 9, bottom], [tailAt + 2, bottom + 15], [tailAt - 7, bottom + 1]);
      points.tail = true;
      continue;
    }
    points.push([x, bottom]);
  }
  corner(left + r, bottom - r, Math.PI / 2);
  edge(left, bottom - r, left, top + r);
  corner(left + r, top + r, Math.PI);
  // Small, uneven wobble: two waves that do not line up.
  return points.map(([x, y], i) => {
    const w = Math.sin(i * 1.9) * 1.3 + Math.sin(i * 0.55 + 1) * 1.6;
    return [x + w * 0.6, y + w];
  });
}

/** A closed Catmull-Rom curve through the points. */
function smooth(points) {
  const p = (i) => points[(i + points.length) % points.length];
  let d = `M${p(0)[0].toFixed(1)} ${p(0)[1].toFixed(1)}`;
  for (let i = 0; i < points.length; i++) {
    const [a, b, c, e] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
    const c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

let path;
let pending = false;
function drawRing() {
  const base = stage.getBoundingClientRect();
  const rects = [...sentence.getClientRects()];
  const box = {
    left: Math.min(...rects.map((r) => r.left)) - base.left,
    right: Math.max(...rects.map((r) => r.right)) - base.left,
    top: Math.min(...rects.map((r) => r.top)) - base.top,
    bottom: Math.max(...rects.map((r) => r.bottom)) - base.top,
  };
  const tailAt = Math.max(box.left + 40, box.right - 60);
  ring.setAttribute('width', String(base.width));
  ring.setAttribute('height', String(base.height));
  ring.replaceChildren();
  const defs = document.createElementNS(SVG, 'defs');
  const gradient = document.createElementNS(SVG, 'linearGradient');
  gradient.id = 'ring-edge';
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
  gradient.setAttribute('x1', String(box.left));
  gradient.setAttribute('y1', String(box.top));
  gradient.setAttribute('x2', String(box.right));
  gradient.setAttribute('y2', String(box.bottom));
  PALETTE.forEach((color, i) => {
    const stop = document.createElementNS(SVG, 'stop');
    stop.setAttribute('offset', String(i / (PALETTE.length - 1)));
    stop.setAttribute('stop-color', color);
    gradient.append(stop);
  });
  defs.append(gradient);
  path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', smooth(outline(box, tailAt, base.left)));
  path.setAttribute('stroke', 'url(#ring-edge)');
  path.classList.toggle('dots', pending);
  ring.append(defs, path);
  ask.style.left = `${tailAt - 34}px`;
  ask.style.top = `${box.bottom + 10 + 16}px`;
}

let timers = [];
function play() {
  timers.forEach(clearTimeout);
  timers = [];
  drawRing();
  if (still) {
    result.classList.remove('waiting');
    return;
  }
  result.classList.add('waiting');
  pending = true;
  path.classList.add('dots');
  path.style.opacity = '0';
  ask.removeAttribute('data-shown');
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  later(350, () => {
    path.style.opacity = '';
    ask.setAttribute('data-shown', '');
  });
  // The button is pressed; the ring stays dotted while the translation comes.
  later(1300, () => ask.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 180 }));
  later(1500, () => ask.removeAttribute('data-shown'));
  later(2300, () => {
    pending = false;
    path.classList.remove('dots');
    result.classList.remove('waiting');
  });
}

play();
let width = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === width) return;
  width = innerWidth;
  drawRing();
  if (!result.classList.contains('waiting')) ask.removeAttribute('data-shown');
});
document.fonts?.ready.then(() => drawRing());
sentence.addEventListener('click', play);

// ---- an enlarged demo ----
const viewer = document.getElementById('viewer');
const big = viewer.querySelector('img');
for (const button of document.querySelectorAll('[data-zoom]')) {
  button.addEventListener('click', () => {
    const img = button.querySelector('img');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    viewer.showModal();
  });
}
viewer.addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => big.removeAttribute('src'));

// ---- where the reader is ----
const marked = (selector) => {
  const links = new Map([...document.querySelectorAll(selector)].map((a) => [a.getAttribute('href').slice(1), a]));
  const targets = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  return () => {
    let current = null;
    for (const t of targets) if (t.getBoundingClientRect().top < innerHeight * 0.4) current = t.id;
    for (const [id, a] of links) a.setAttribute('aria-current', String(id === current));
  };
};
const marks = [marked('.top nav a'), marked('.index a')];
const mark = () => marks.forEach((m) => m());
addEventListener('scroll', mark, { passive: true });
mark();

// ---- phrases going by, each with its translation ----
const PHRASES = [
  ['Hello, world', 'en', '你好，世界'],
  ['Merci beaucoup', 'fr', '非常感谢'],
  ['ありがとうございます', 'ja', '谢谢'],
  ['Wie geht es dir?', 'de', '你好吗？'],
  ['Where is the station?', 'en', '车站在哪里？'],
  ['감사합니다', 'ko', '谢谢'],
  ['¿Dónde está la estación?', 'es', '车站在哪里？'],
  ['Ship it on Friday', 'en', '周五发布'],
  ['Bon appétit', 'fr', '祝你好胃口'],
  ['よろしくお願いします', 'ja', '请多关照'],
  ['Measure the whole journey', 'en', '衡量整个旅程'],
  ['Viel Glück!', 'de', '祝你好运！'],
];
const ribbon = document.getElementById('ribbon');
const pair = ([from, lang, to]) => {
  const item = document.createElement('span');
  item.className = 'pair';
  const a = document.createElement('span');
  a.className = 'from';
  a.lang = lang;
  a.textContent = from;
  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '→';
  const b = document.createElement('span');
  b.className = 'to';
  b.textContent = to;
  item.append(a, arrow, b);
  return item;
};
// Twice over, so sliding by half its width comes back to where it started.
for (const round of still ? [0] : [0, 1]) for (const p of PHRASES) ribbon.append(pair(p));

// ---- things arrive as they are scrolled to ----
if (!still && 'IntersectionObserver' in window) {
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      seen.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  const groups = ['.chapter h2', '.chapter .intro', '.feature', '.way', '.rows > div', '.group', '.qa > div'];
  for (const selector of groups) {
    document.querySelectorAll(selector).forEach((el, i) => {
      // Already on screen: no need to make it arrive.
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('reveal');
      // Rows of a list come one after another.
      if (/rows|group|qa|way/.test(selector)) el.style.transitionDelay = `${(i % 6) * 60}ms`;
      seen.observe(el);
    });
  }
}
