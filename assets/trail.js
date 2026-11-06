// Home hero: project images pile up behind the headline. Moving the mouse drops them along its
// path; when the mouse rests, and on touch screens, one lands somewhere every 900 ms.
// The pile keeps the newest 36. The Pause button stops the automatic landing.
// Reduced motion: nothing lands on its own and nothing animates; a still pile of six to start.
// Stops while the hero is off screen or the tab is hidden.
(() => {
  const hero = document.querySelector('[data-trail]');
  const data = document.getElementById('trail-data');
  if (!hero || !data) return;
  const stage = hero.querySelector('.trail-stage');
  const toggle = hero.querySelector('.trail-toggle');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX = 36;     // images kept on the stage
  const GAP = 90;     // px of mouse travel between two drops
  const REST = 1800;  // ms without mouse movement before images land on their own
  const EVERY = 900;  // ms between automatic landings
  const START = 6;    // images placed as soon as they load

  // Shuffled once, then used in turn, so the same image doesn't come back twice in a row.
  const srcs = JSON.parse(data.textContent).sort(() => Math.random() - 0.5);
  const pool = [];
  let turn = 0;

  // One image centred on (x, y): about a sixth of the stage wide on wide screens, two fifths on narrow ones.
  const drop = (x, y) => {
    if (!pool.length) return;
    const img = pool[turn++ % pool.length];
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    let iw = w * (w < 700 ? 0.4 : 0.16) * (0.8 + Math.random() * 0.4);
    let ih = (iw * img.naturalHeight) / img.naturalWidth;
    if (ih > h * 0.6) { iw *= (h * 0.6) / ih; ih = h * 0.6; }
    const el = img.cloneNode();
    el.alt = '';
    el.className = 'trail-img';
    el.style.cssText = `left:${x - iw / 2}px;top:${y - ih / 2}px;width:${iw}px;height:${ih}px`;
    stage.append(el);
    while (stage.children.length > MAX) stage.firstElementChild.remove();
  };
  const dropAnywhere = () => drop(Math.random() * stage.clientWidth, Math.random() * stage.clientHeight);

  srcs.forEach((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      pool.push(img);
      if (pool.length <= START) dropAnywhere();
    };
    img.src = src;
  });

  // Mouse trail
  let lastMove = 0;
  let lx = null;
  let ly = null;
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    lastMove = performance.now();
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (lx === null || Math.hypot(x - lx, y - ly) >= GAP) {
      drop(x, y);
      lx = x;
      ly = y;
    }
  });
  hero.addEventListener('pointerleave', () => { lx = null; });

  if (calm) return;

  // Automatic landing, only while the hero is in view
  let running = true;
  let inView = true;
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }).observe(hero);
  setInterval(() => {
    if (running && inView && !document.hidden && performance.now() - lastMove > REST) dropAnywhere();
  }, EVERY);

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    running = !running;
    toggle.textContent = running ? 'Pause' : 'Play';
  });
})();
