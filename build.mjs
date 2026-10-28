// Builds vorkurs.space from content/*.json (edited in Pages CMS) into dist/.
// Styles are Tailwind: the classes live in the markup below, the tokens in styles/site.css.
// Run: npm install, node build.mjs, then npx serve dist
import { readFileSync, writeFileSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = 'dist';
const STATIC = ['assets', 'img', 'fav.png', 'ogimage.png', 'robots.txt', 'sitemap.xml'];
const load = (name) => JSON.parse(readFileSync(`content/${name}.json`, 'utf8'));
const site = load('site');
const home = load('home');
const approach = load('approach');

// Shared class sets
const LINK = 'underline decoration-2 underline-offset-4 hover:no-underline';
const CURRENT = 'aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-4 aria-[current=page]:hover:no-underline';
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';
const RULE = 'border-t-2 border-ink';
// Section headings are a full-width strip: the title repeated in uppercase between two rules.
// Screen readers get it once; the repeats are decoration.
const strip = (title, id = '') => `<div class="mt-0 mb-7 flex gap-x-8 overflow-hidden border-y-2 border-ink py-2 whitespace-nowrap uppercase text-body-sm tracking-normal tablet:text-body tablet:tracking-normal"${id ? ` id="${id}"` : ''}>
    <h2 class="flex-none">${esc(title)}</h2>${`<span class="flex-none" aria-hidden="true">${esc(title)}</span>`.repeat(15)}
  </div>`;
const BODY = 'text-body-sm tablet:text-body';
const FIGURE = 'flex min-w-0 flex-col gap-2';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// [label](url) becomes a link, *text* italic, a line break <br>.
const md = (s) => esc(s)
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, `<a class="${LINK}" href="$2">$1</a>`)
  .replace(/\*([^*]+)\*/g, '<i>$1</i>')
  .replace(/\n/g, '<br>');
const paras = (s) => String(s || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const ps = (s, cls = '') => paras(s).map((p) => `<p${cls ? ` class="${cls}"` : ''}>${md(p)}</p>`).join('\n');
const shown = (list) => (list || []).filter((x) => x.visible !== false);
// CMS paths may start with a slash; pages sit at the root, so make them relative.
const src = (p) => esc(String(p || '').replace(/^\//, ''));
const indent = (s, n) => s.replace(/^(?=.)/gm, ' '.repeat(n));
const cx = (...c) => c.filter(Boolean).join(' ');

// --- shared page parts ---

const head = ({ title, description, path }) => {
  const url = site.url.replace(/\/$/, '') + '/' + path;
  const image = site.url.replace(/\/$/, '') + '/' + String(site.share_image || 'ogimage.png').replace(/^\//, '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/fav.png" type="image/png">
<link rel="apple-touch-icon" href="/fav.png">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
<link rel="stylesheet" href="assets/site.css">
</head>`;
};

// One floating panel that holds the bar and, on phones, opens into the menu (site.js toggles data-open).
const header = (current) => {
  const n = site.nav;
  const cur = (page) => (page === current ? ' aria-current="page"' : '');
  const barLink = cx('hidden no-underline tablet:inline', CURRENT, FOCUS);
  const menuLink = cx('block px-3.5 py-1.5 text-[22px] tracking-[-0.7px] no-underline', CURRENT, FOCUS);
  const x = 'hidden group-data-[open=true]:inline';
  return `  <header class="pointer-events-none sticky top-[env(safe-area-inset-top,0px)] z-20 flex justify-center pt-3">
    <nav class="bar group pointer-events-auto w-[min(560px,100%)] border-2 border-ink bg-paper text-nav" aria-label="Main" data-open="false">
      <div class="flex h-12 items-center justify-between pr-3 pl-3.5 tablet:h-[52px] tablet:pr-4 tablet:pl-[18px]">
        <a class="${cx('font-strong text-[22px] tracking-[-0.8px] no-underline tablet:text-[26px]', FOCUS)}" href="index.html">${esc(site.name)}</a>
        <div class="flex items-center gap-5">
          <a class="${barLink}" href="index.html#work"${cur('home')}>${esc(n.work)}</a>
          <a class="${barLink}" href="approach.html"${cur('approach')}>${esc(n.approach)}</a>
          <span class="hidden h-[18px] w-px bg-ink tablet:block" aria-hidden="true"></span>
          <a class="${barLink}" href="mailto:${esc(site.email)}">${esc(n.touch)}</a>
          <button class="${cx('inline-flex cursor-pointer items-center gap-2.5 px-0.5 py-1.5 tablet:hidden', FOCUS)}" id="menu-toggle" type="button" aria-expanded="false" aria-controls="menu"><span class="group-data-[open=true]:hidden">Menu</span><span class="${x} text-[22px] leading-none" aria-hidden="true">×</span><span class="${x} sr-only">Close</span></button>
        </div>
      </div>
      <div class="bar-menu grid grid-rows-[0fr] transition-[grid-template-rows] duration-[280ms] ease-[ease] group-data-[open=true]:grid-rows-[1fr] motion-reduce:transition-none tablet:hidden" id="menu">
        <div class="overflow-hidden">
          <ul class="flex flex-col gap-1 pt-2 pb-2">
            <li><a class="${menuLink}" href="index.html#work"${cur('home')}>${esc(n.work)}</a></li>
            <li><a class="${menuLink}" href="approach.html"${cur('approach')}>${esc(n.approach)}${n.approach_note ? `<small class="hidden -mt-0.5 text-[14px] tracking-[-0.1px] text-grey">${esc(n.approach_note)}</small>` : ''}</a></li>
            <li><a class="${menuLink}" href="index.html#contact">${esc(n.contact)}</a></li>
          </ul>
          <a class="${cx('mx-1.5 mb-1.5 block bg-ink p-3.5 text-center text-paper no-underline transition-colors duration-200 hover:bg-ink-soft', FOCUS)}" href="index.html#contact" hidden>${esc(n.cta)}</a>
        </div>
      </div>
    </nav>
  </header>`;
};

const hero = (h, extra = '') => `  <section class="flex flex-col gap-6 pt-8 pb-8 tablet:gap-9 tablet:pt-12 tablet:pb-12">
    <h1 class="text-display-sm text-balance tablet:text-display">${md(h.title)}${h.subtitle ? ` ${md(h.subtitle)}` : ''}</h1>
${extra}  </section>`;

// On other pages, #contact and friends point back to the home page.
const footer = (isHome) => {
  const closing = isHome ? md(site.closing) : md(site.closing).replace(/href="#/g, 'href="index.html#');
  // Closing line on the left, contact details beside it; stacked on phones.
  return `  <footer class="mt-14 grid grid-cols-1 gap-x-20 gap-y-10 ${RULE} pt-9 tablet:grid-cols-[minmax(0,1fr)_auto]"${isHome ? ' id="contact"' : ''}>
    <p class="max-w-screen-mobile tablet:max-w-screen-tablet text-title-sm text-balance tablet:text-title">${closing}</p>
    <div class="flex flex-wrap gap-x-20 gap-y-6 text-body-sm tablet:text-body tablet:leading-6">
      <div><h4 class="text-grey">Contact</h4><p class="min-w-0">${esc(site.email)}<br>${esc(site.phone)}</p></div>
      <div><h4 class="text-grey">Studio</h4><p class="min-w-0">${md(site.address)}</p></div>
    </div>
  </footer>`;
};

const page = (meta, current, body, after = '') => `${head(meta)}
<body class="bg-paper font-sans text-ink antialiased before:fixed before:inset-x-0 before:top-0 before:z-30 before:h-[env(safe-area-inset-top,0px)] before:bg-paper [&.sheet-open]:overflow-hidden">
<div class="mx-auto flex w-full max-w-[1720px] flex-col pr-[max(20px,env(safe-area-inset-right,0px))] pb-[20px] pl-[max(20px,env(safe-area-inset-left,0px))]">
${header(current)}

${body}

${footer(current === 'home')}
</div>
${after}
<script src="assets/site.js"></script>
</body>
</html>
`;

const pageTitle = (t) => (t ? `${t} · ${site.name}` : site.name);

// --- media ---

const FRAME_ASPECT = { shot: 'aspect-[16/10]', wide: 'aspect-video', phoneish: 'aspect-[683/800]' };

const visual = (m, cls) => m.type === 'video'
  ? `<video class="${cls}" src="${src(m.src)}" autoplay muted loop playsinline aria-label="${esc(m.alt)}"></video>`
  : `<img class="${cls}" src="${src(m.src)}" alt="${esc(m.alt)}">`;

// aspect: set by the layout around the figure; it wins over the frame's own ratio.
// fill: from tablet up, drop the ratio and stretch to the row height (set by the column beside it).
const figure = (m, { aspect, fill, figureClass = FIGURE } = {}) => {
  const caption = m.caption ? `\n  <figcaption class="text-caption text-grey">${md(m.caption)}</figcaption>` : '';
  const ratio = aspect || FRAME_ASPECT[m.frame] || 'aspect-[3/2]';
  if (m.type === 'halftone') {
    // tool, fallback and tool-ui are hooks for assets/halftone.js
    return `<figure class="${figureClass}">
  <div class="tool relative aspect-[4/3] max-w-full bg-tool tablet:aspect-auto tablet:min-h-[320px] tablet:flex-1">
    <div class="fallback absolute inset-0 overflow-hidden bg-panel" hidden><img class="size-full object-cover" src="${src(m.src)}" alt="${esc(m.alt)}"></div>
    <canvas class="absolute inset-0 block size-full" id="halftone" data-src="${src(m.src)}" aria-label="${esc(m.alt)}"></canvas>
    <div class="tool-ui absolute bottom-3 left-3 flex items-center gap-3 bg-paper px-3 py-2 text-caption leading-[normal] text-ink">
      <label class="text-grey" for="dots">Dot size</label>
      <input class="w-[120px] accent-ink" id="dots" type="range" min="6" max="28" value="12">
      <output class="min-w-[24px] text-right tabular-nums" id="dots-out" for="dots">12</output>
    </div>
  </div>${caption}
</figure>`;
  }
  if (m.frame === 'phone') {
    // a generic phone drawn around the screen grab
    return `<figure class="${figureClass}">
  <div class="grid max-w-full ${aspect || 'aspect-[3/2]'} place-items-center overflow-hidden bg-sand py-6">
    <div class="flex aspect-[9/19.5] h-full max-w-full flex-col overflow-hidden rounded-[38px] border-[9px] border-device bg-cream shadow-[0_0_0_1.5px_#3a3a3a,0_18px_40px_-18px_rgba(0,0,0,.45)]">
      <div class="grid h-[30px] flex-none grid-cols-[1fr_auto_1fr] items-center px-4 font-system text-[11px] font-semibold tracking-normal text-device" aria-hidden="true"><span>9:41</span><i class="h-[18px] w-[62px] rounded-[10px] bg-device"></i><span class="justify-self-end text-[6px] tracking-[1px]">●●●</span></div>
      ${visual(m, 'min-h-0 w-full flex-1 object-cover object-top')}
    </div>
  </div>${caption}
</figure>`;
  }
  const shot = m.frame === 'shot';
  return `<figure class="${figureClass}">
  <div class="${cx('max-w-full overflow-hidden bg-panel', ratio, fill && 'relative tablet:aspect-auto tablet:flex-1', shot && 'shadow-[inset_0_0_0_1px_rgba(0,0,0,.12)]')}">${visual(m, cx('size-full object-cover', fill && 'tablet:absolute tablet:inset-0', shot && 'object-top'))}</div>${caption}
</figure>`;
};

// --- home ---

// Per layout: the grid, and the aspect ratio of the figure at index i (undefined = the frame decides).
const LAYOUTS = {
  feature: { grid: 'grid-cols-1 tablet:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]', aspect: () => undefined, fill: (i) => i === 0 },
  two: { grid: 'grid-cols-1 tablet:grid-cols-2', aspect: () => undefined },
  three: { grid: 'grid-cols-2 tablet:grid-cols-3', aspect: (i) => (i ? 'aspect-[3/4]' : 'aspect-[3/2] tablet:aspect-[3/4]'), first: 'col-span-full tablet:col-span-1' },
  pano: { grid: 'grid-cols-2', aspect: (i) => (i ? 'aspect-[3/2]' : 'aspect-video tablet:aspect-[21/9]'), first: 'col-span-full' },
  text: { grid: 'grid-cols-2 items-start tablet:grid-cols-3', aspect: () => 'aspect-[4/5]' },
};

const caseCard = (c, index) => {
  const media = c.media || [];
  const layout = LAYOUTS[c.layout] || LAYOUTS.feature;
  const inMedia = c.layout === 'text';
  const body = `<div class="${cx('grid gap-x-3 gap-y-3', BODY, inMedia ? 'col-span-full grid-cols-1 content-start tablet:col-span-1 tablet:pl-4' : 'grid-cols-1 tablet:grid-cols-2')}">
${indent(ps(c.text, 'max-w-screen-tablet'), 2)}
</div>`;
  const fig = (m, i) => figure(m, { aspect: layout.aspect(i), fill: layout.fill?.(i), figureClass: cx(FIGURE, i === 0 && layout.first) });
  let inner;
  if (!LAYOUTS[c.layout] || c.layout === 'feature') {
    const [first, ...rest] = media;
    inner = [first && fig(first, 0), rest.length && `<div class="grid min-w-0 grid-cols-2 content-start gap-3 tablet:grid-cols-1">\n${indent(rest.map((m) => fig(m, 1)).join('\n'), 2)}\n</div>`].filter(Boolean).join('\n');
  } else {
    inner = media.map(fig).join('\n');
    if (inMedia) inner += '\n' + body;
  }
  let link = '';
  const linkClass = cx(LINK, 'text-[20px] tracking-[-0.6px]');
  if (c.full_case?.enabled) {
    link = `<a class="${linkClass}" href="#${esc(c.id)}" data-open-case="${esc(c.id)}">${esc(c.link_label || 'Read the full case')}</a>`;
  } else if (c.link_url) {
    const external = /^https?:/.test(c.link_url) ? ' target="_blank" rel="noopener"' : '';
    link = `<a class="${linkClass}" href="${esc(c.link_url)}"${external}>${esc(c.link_label || c.link_url)}</a>`;
  }
  return `<article class="${cx('flex flex-col gap-7', index > 0 && `mt-11 ${RULE} pt-9`)}">
  <div class="grid grid-cols-1 items-end gap-x-10 gap-y-2 tablet:grid-cols-[minmax(0,1fr)_auto]">
    <h3 class="font-strong text-[34px] leading-[38px] tracking-[-2px] tablet:text-[45px] tablet:leading-[48px]">${esc(c.title)}</h3>
    <ul class="text-[15px] leading-[22px] tracking-[-0.4px] text-grey tablet:text-right tablet:text-[17px]">
${(c.meta || []).filter(Boolean).map((m) => `      <li>${md(m)}</li>`).join('\n')}
    </ul>
  </div>
  <p class="max-w-screen-tablet text-lead-sm text-balance tablet:text-lead">${md(c.outcome)}</p>
${media.length ? `  <div class="grid gap-3 ${layout.grid}">\n${indent(inner, 4)}\n  </div>\n` : ''}${inMedia ? '' : indent(body, 2) + '\n'}${link ? `  ${link}\n` : ''}</article>`;
};

const GRIDS = { two: 'grid-cols-1 tablet:grid-cols-2', three: 'grid-cols-1 tablet:grid-cols-3', 'three-tall': 'grid-cols-2 tablet:grid-cols-3' };

const sheetBlock = (b) => {
  const parts = [];
  const two = b.columns === 'two';
  if (b.text) parts.push(`<div class="${cx('grid gap-x-10 gap-y-5 text-body-sm tablet:text-body tablet:leading-[26px]', two && 'tablet:grid-cols-2')}">
${indent(ps(b.text, two ? 'max-w-screen-mobile' : 'w-full'), 2)}
</div>`);
  const media = b.media || [];
  if (media.length) {
    const grid = GRIDS[b.media_layout];
    parts.push(grid
      ? `<div class="grid gap-3 ${grid}">\n${indent(media.map((m) => figure(m)).join('\n'), 2)}\n</div>`
      : media.map((m) => figure(m)).join('\n'));
  }
  if (!b.heading) return parts.join('\n');
  return `<section class="flex flex-col gap-5 ${RULE} pt-6">
  <h3 class="text-title-sm tablet:text-title tablet:leading-[50px]">${md(b.heading)}</h3>
${indent(parts.join('\n'), 2)}
</section>`;
};

// The full case opens as a modal sheet (site.js); sheet and sheet-scroll are its hooks.
const sheet = (c) => {
  const f = c.full_case;
  const button = 'cursor-pointer py-1 text-nav hover:underline hover:decoration-2 hover:underline-offset-4';
  return `<dialog class="sheet m-auto h-full max-h-none w-full max-w-none border-0 bg-paper p-0 text-ink open:animate-sheet-in backdrop:bg-[rgba(0,0,0,.4)] motion-reduce:open:animate-none tablet:h-[calc(100%-24px)] tablet:w-[min(1180px,calc(100%-24px))] tablet:border-2 tablet:border-ink" id="${esc(c.id)}" aria-labelledby="${esc(c.id)}-title">
  <div class="sheet-scroll h-full overflow-y-auto overscroll-contain">
    <div class="sticky top-0 z-[2] flex items-center justify-between border-b-2 border-ink bg-paper px-[max(20px,3vw)] py-3 text-nav">
      <span class="text-grey">Case study</span>
      <button type="button" class="${button}" data-close>Close <span class="ml-1.5 text-[22px]" aria-hidden="true">×</span></button>
    </div>

    <article class="mx-auto flex max-w-[calc(1680px+2*max(20px,3vw))] flex-col gap-10 px-[max(20px,3vw)] pt-10 pb-16">
      <header class="flex flex-col gap-4">
        <h2 class="font-strong text-[38px] leading-10 tracking-[-1.6px] tablet:text-[60px] tablet:leading-[62px] tablet:tracking-[-3px]" id="${esc(c.id)}-title">${esc(c.title)}</h2>
${f.outcome ? `        <p class="w-full text-lead-sm text-balance tablet:text-lead">${md(f.outcome)}</p>\n` : ''}      </header>
${(f.facts || []).length ? `
      <dl class="grid grid-cols-2 gap-x-8 gap-y-5 tablet:grid-cols-4">
${f.facts.map((x) => `        <div class="min-w-0 border-t-2 border-ink pt-3"><dt class="mb-1 text-label text-grey">${esc(x.label)}</dt><dd class="${BODY}">${md(x.value)}</dd></div>`).join('\n')}
      </dl>
` : ''}
${(f.blocks || []).map((b) => indent(sheetBlock(b), 6)).join('\n\n')}

      <footer class="flex flex-col items-baseline justify-between gap-4 ${RULE} pt-5 text-[17px] tracking-[-0.6px] tablet:flex-row tablet:text-[20px]">
        <button type="button" class="${button}" data-close>Back to all work</button>
        <a class="${LINK}" href="#contact" data-close>Start a project like this</a>
      </footer>
    </article>
  </div>
</dialog>
`;
};

const cases = shown(home.cases);
const h = home.hero;
const heroExtra = `    <div class="flex flex-wrap items-baseline gap-x-12 gap-y-4 text-[17px] leading-6 tracking-[-0.6px] tablet:text-[20px]"${h.show_contact ? '' : ' hidden'}>
      <a class="${LINK}" href="#contact" hidden>${esc(site.nav.cta)}</a>
      <span class="text-grey">${esc(site.email)} · ${esc(site.phone)}</span>
    </div>
${h.note ? `    <p class="max-w-screen-mobile text-note text-grey [&_i]:text-ink"${h.show_note ? '' : ' hidden'}>${md(h.note)}</p>\n` : ''}`;

// Logos sit at one optical height, tuned per logo in the CMS; all are forced to black.
const logo = (l) => {
  const filter = l.mono ? '[filter:grayscale(1)_brightness(0.4)_contrast(10)]' : '[filter:grayscale(1)_contrast(10)]';
  return `      <li><img class="block h-[var(--hm)] w-auto ${filter} tablet:h-[var(--h)]" style="--h:${+l.height || 24}px;--hm:${+l.height_mobile || 18}px" src="${src(l.image)}" alt="${esc(l.name)}"></li>`;
};
const logos = home.show_logos === false ? [] : shown(home.logos);

const homeBody = `${hero(h, heroExtra)}
${logos.length ? `
  <section class="border-y-2 border-ink py-7" aria-label="Clients and partners">
    <ul class="flex flex-wrap items-center justify-start gap-x-7 gap-y-[22px] tablet:justify-between tablet:gap-x-10 tablet:gap-y-7">
${logos.map(logo).join('\n')}
    </ul>
  </section>
` : ''}
  ${strip(home.work_title, 'work')}

  <div class="flex flex-col">
${cases.map((c, i) => indent(caseCard(c, i), 2)).join('\n\n')}
  </div>`;

const homeAfter = cases.filter((c) => c.full_case?.enabled).map(sheet).join('\n')
  + (cases.some((c) => (c.media || []).some((m) => m.type === 'halftone')) ? '<script src="assets/halftone.js"></script>' : '');

// --- approach ---

const item = (it) => `<div class="flex min-w-0 flex-col gap-2 border-t-2 border-ink pt-3.5"><h3 class="flex items-baseline justify-between gap-4 font-strong text-[20px] leading-6 tracking-[-0.8px] tablet:text-[24px] tablet:leading-7">${esc(it.heading)}${it.label ? ` <span class="font-sans text-[16px] tracking-[-0.2px] whitespace-nowrap text-grey">${esc(it.label)}</span>` : ''}</h3>${it.lead ? `<p class="max-w-screen-mobile italic ${BODY}">${md(it.lead)}</p>` : ''}${ps(it.text, `max-w-screen-mobile ${BODY}`).replace(/\n/g, '')}</div>`;

const approachBody = `${hero(approach.hero)}

${shown(approach.sections).map((s, i) => `  <section${i > 0 ? ' class="mt-14"' : ''}>
    ${strip(s.title)}
${s.intro ? `    <p class="mb-8 max-w-screen-tablet ${BODY}">${md(s.intro)}</p>\n` : ''}    <div class="grid grid-cols-1 gap-7 tablet:grid-cols-2 tablet:gap-x-10 tablet:gap-y-9">
${shown(s.items).map((it) => `      ${item(it)}`).join('\n')}
    </div>
  </section>`).join('\n\n')}`;

// --- write ---

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const file of STATIC) cpSync(file, `${OUT}/${file}`, { recursive: true, filter: (s) => !s.endsWith('.DS_Store') });
writeFileSync(`${OUT}/index.html`, page(
  { title: pageTitle(home.title), description: home.description || site.description, path: '' }, 'home', homeBody, homeAfter));
writeFileSync(`${OUT}/approach.html`, page(
  { title: pageTitle(approach.title), description: approach.description || site.description, path: 'approach.html' }, 'approach', approachBody));
// Tailwind scans this file for classes, so the CSS is built after the pages exist.
execFileSync('node_modules/.bin/tailwindcss', ['-i', 'styles/site.css', '-o', `${OUT}/assets/site.css`, '--minify'], { stdio: 'inherit' });
console.log(`Built ${OUT}/ (home: ${cases.length} cases, approach: ${shown(approach.sections).length} sections).`);
