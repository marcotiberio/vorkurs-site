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


  // case studies open as a modal sheet; #citizenm in the address opens it directly
  const openCase = id => {
    const d = document.getElementById(id);
    if (!d || d.open) return;
    d.showModal();
    document.body.classList.add('sheet-open');
    d.querySelector('.sheet-scroll').scrollTop = 0;
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  };
  document.querySelectorAll('[data-open-case]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); openCase(a.dataset.openCase);
  }));
  document.querySelectorAll('dialog.sheet').forEach(d => {
    d.addEventListener('close', () => {
      document.body.classList.remove('sheet-open');
      if (location.hash === '#' + d.id) history.replaceState(null, '', location.pathname + location.search);
    });
    d.addEventListener('click', e => { if (e.target === d) d.close(); });          // backdrop
    d.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => d.close()));
  });
  const fromHash = () => { const id = location.hash.slice(1); if (id && document.querySelector('dialog.sheet#' + CSS.escape(id))) openCase(id); };
  fromHash();
  window.addEventListener('hashchange', fromHash);
})();
