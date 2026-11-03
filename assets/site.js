(() => {
  // menu: the bar opens in place into the menu panel
  const bar = document.querySelector('.bar');
  const toggle = document.getElementById('menu-toggle');
  if (bar && toggle) {
    const set = open => { bar.dataset.open = open; toggle.setAttribute('aria-expanded', open); };
    toggle.addEventListener('click', () => set(bar.dataset.open !== 'true'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && bar.dataset.open === 'true') { set(false); toggle.focus(); } });
    document.addEventListener('click', e => { if (bar.dataset.open === 'true' && !bar.contains(e.target)) set(false); });
    bar.querySelectorAll('.bar-menu a').forEach(a => a.addEventListener('click', () => set(false)));
  }

  // the bar slides away while scrolling down and comes back on the way up
  const head = document.getElementById('site-header');
  if (head) {
    let last = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY;
      if (Math.abs(y - last) < 6) return;
      head.dataset.hidden = y > last && y > 120 && bar?.dataset.open !== 'true';
      last = y;
    }, { passive: true });
    head.addEventListener('focusin', () => { head.dataset.hidden = false; });
  }

})();
