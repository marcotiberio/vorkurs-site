// Builds vorkurs.space from content/*.json (edited in Pages CMS) into dist/.
// Styles are Tailwind: the classes live in the markup below, the tokens in styles/site.css.
// Run: npm install, node build.mjs, then npx serve dist
import { readFileSync, writeFileSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = 'dist';
const STATIC = ['assets', 'img', 'fav.png', 'ogimage.png', 'robots.txt'];
const load = (name) => JSON.parse(readFileSync(`content/${name}.json`, 'utf8'));
const site = load('site');
const home = load('home');
const approach = load('approach');

// Shared class sets
const LINK = 'underline decoration-2 underline-offset-4 hover:no-underline';
const CURRENT = 'aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-4 aria-[current=page]:hover:no-underline';
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';
const RULE = 'border-t border-line';
// Two tones, as on addmore.studio: the first sentence in ink, the rest in grey.
const twoTone = (text) => {
  const [, first, rest] = String(text || '').match(/^(.+?[.?!])\s+([\s\S]+)$/) || [, text, ''];
  return `${md(first)}${rest ? ` <span class="text-grey">${md(rest)}</span>` : ''}`;
};
// A section opens with a small numbered label and its intro set large.
const sectionIntro = (s, n) => `<header class="flex flex-col gap-5 pt-8 pb-10 tablet:pt-10 tablet:pb-12">
      <h2 class="text-eyebrow text-faint uppercase">${String(n).padStart(2, '0')}&ensp;${esc(s.title)}</h2>
${s.intro ? `      <p class="max-w-[1100px] text-title-sm text-balance tablet:text-title">${twoTone(s.intro)}</p>\n` : ''}    </header>`;
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

const siteUrl = (path) => site.url.replace(/\/$/, '') + '/' + path;

const head = ({ title, description, path }) => {
  const url = siteUrl(path);
  const image = siteUrl(String(site.share_image || 'ogimage.png').replace(/^\//, ''));
  // Case pages sit in work/; the base keeps every relative link and file path pointing at the root.
  const base = path.includes('/') ? '\n<base href="../">' : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${base}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/fav.png" type="image/png">
<link rel="apple-touch-icon" href="/fav.png">
<meta name="theme-color" content="#000000">
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

// One floating bar: wordmark and links.
// On phones the group is the menu button, and the bar opens in place into the menu (site.js toggles data-open).
// site.js also sets data-hidden while scrolling down, which slides the bar away.
const header = (current) => {
  const n = site.nav;
  // The work page and the case pages are Work.
  const cur = (page) => (page === current ? ' aria-current="page"' : '');
  const CHIP = 'no-underline transition-colors duration-150 hover:bg-panel aria-[current=page]:bg-ink aria-[current=page]:text-paper';
  const barLink = cx('px-3 py-1.5', CHIP, FOCUS);
  const menuLink = cx('block px-4 py-2 text-center text-[22px] tracking-[-0.7px]', CHIP, FOCUS);
  const x = 'hidden group-data-[open=true]:inline';
  return `  <header class="pointer-events-none sticky top-[env(safe-area-inset-top,0px)] z-20 flex justify-center pt-3 transition-transform duration-300 ease-[ease] data-[hidden=true]:-translate-y-[calc(100%+12px)] motion-reduce:transition-none" id="site-header">
    <nav class="bar group pointer-events-auto w-full tablet:w-fit tablet:max-w-full border border-line bg-paper text-nav" aria-label="Main" data-open="false">
      <div class="flex items-center gap-3 p-1.5 tablet:gap-4 tablet:p-2">
        <a class="${cx('flex-none px-2 font-strong text-[22px] tracking-[-0.8px] no-underline tablet:text-[26px]', FOCUS)}" href="index.html">${esc(site.name)}</a>
        <div class="hidden flex-none items-center gap-1 tablet:flex">
          <a class="${barLink}" href="work.html"${cur('work')}>${esc(n.work)}</a>
          <a class="${barLink}" href="approach.html"${cur('approach')}>${esc(n.approach)}</a>
          <a class="${barLink}" href="mailto:${esc(site.email)}">${esc(n.touch)}</a>
        </div>
        <button class="${cx('ml-auto flex cursor-pointer items-center gap-2.5 px-2 py-2 tablet:hidden', FOCUS)}" id="menu-toggle" type="button" aria-expanded="false" aria-controls="menu"><span class="group-data-[open=true]:hidden">Menu</span><span class="${x} text-[22px] leading-none" aria-hidden="true">×</span><span class="${x} sr-only">Close</span></button>
      </div>
      <div class="bar-menu grid grid-rows-[0fr] transition-[grid-template-rows] duration-[280ms] ease-[ease] group-data-[open=true]:grid-rows-[1fr] motion-reduce:transition-none tablet:hidden" id="menu">
        <div class="overflow-hidden">
          <ul class="mx-1.5 mb-1.5 flex flex-col gap-1 p-2">
            <li><a class="${menuLink}" href="work.html"${cur('work')}>${esc(n.work)}</a></li>
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
    <h1 class="text-display-sm text-balance tablet:text-display">${md(h.title)}${h.subtitle ? ` <span class="text-grey">${md(h.subtitle)}</span>` : ''}</h1>
${extra}  </section>`;

// On other pages, #contact and friends point back to the home page.
const footer = (isHome) => {
  const closing = isHome ? md(site.closing) : md(site.closing).replace(/href="#/g, 'href="index.html#');
  // The closing line set large across the page, contact details under it.
  return `  <footer class="mt-20 flex flex-col gap-14 ${RULE} pt-10 tablet:gap-20 tablet:pt-14"${isHome ? ' id="contact"' : ''}>
    <p class="max-w-[1300px] text-title text-balance tablet:text-closing">${closing}</p>
    <div class="flex flex-wrap gap-x-20 gap-y-6 text-body-sm tablet:text-body tablet:leading-6">
      <div><h4 class="mb-1 text-eyebrow text-faint uppercase">Contact</h4><p class="min-w-0">${esc(site.email)}<br>${esc(site.phone)}</p></div>
      <div><h4 class="mb-1 text-eyebrow text-faint uppercase">Studio</h4><p class="min-w-0">${md(site.address)}</p></div>
    </div>
  </footer>`;
};

const page = (meta, current, body, after = '') => `${head(meta)}
<body class="bg-paper font-sans text-ink antialiased before:fixed before:inset-x-0 before:top-0 before:z-30 before:h-[env(safe-area-inset-top,0px)] before:bg-paper">
<div class="flex w-full flex-col pr-[max(20px,env(safe-area-inset-right,0px))] pb-[20px] pl-[max(20px,env(safe-area-inset-left,0px))]">
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
      <input class="w-[120px] accent-ink" id="dots" type="range" min="6" max="28" value="6">
      <output class="min-w-[24px] text-right tabular-nums" id="dots-out" for="dots">6</output>
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

// --- cases ---

// Per layout: the grid, and the aspect ratio of the figure at index i (undefined = the frame decides).
const LAYOUTS = {
  feature: { grid: 'grid-cols-1 tablet:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]', aspect: () => undefined, fill: (i) => i === 0 },
  two: { grid: 'grid-cols-1 tablet:grid-cols-2', aspect: () => undefined },
  three: { grid: 'grid-cols-2 tablet:grid-cols-3', aspect: (i) => (i ? 'aspect-[3/4]' : 'aspect-[3/2] tablet:aspect-[3/4]'), first: 'col-span-full tablet:col-span-1' },
  pano: { grid: 'grid-cols-2', aspect: (i) => (i ? 'aspect-[3/2]' : 'aspect-video tablet:aspect-[21/9]'), first: 'col-span-full' },
  text: { grid: 'grid-cols-2 items-start tablet:grid-cols-3', aspect: () => 'aspect-[4/5]' },
};

// The media and text of a case without a full case.
const caseSummary = (c) => {
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
  return [media.length && `<div class="grid gap-3 ${layout.grid}">\n${indent(inner, 2)}\n</div>`, !inMedia && body].filter(Boolean).join('\n');
};

const GRIDS = { two: 'grid-cols-1 tablet:grid-cols-2', three: 'grid-cols-1 tablet:grid-cols-3', 'three-tall': 'grid-cols-2 tablet:grid-cols-3' };

const block = (b) => {
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
  <h2 class="text-title-sm tablet:text-title tablet:leading-[50px]">${md(b.heading)}</h2>
${indent(parts.join('\n'), 2)}
</section>`;
};

const cases = shown(home.cases);
const casePath = (c) => `work/${c.id}.html`;
const hasHalftone = (media) => (media || []).some((m) => m.type === 'halftone');

// Each case has a page of its own: the full case when there is one, otherwise the summary.
const casePage = (c) => {
  const f = c.full_case?.enabled ? c.full_case : null;
  const details = (c.meta || []).filter(Boolean);
  const facts = f?.facts?.length ? f.facts : [
    c.client && { label: 'Client', value: c.client },
    details.length && { label: 'Details', value: details.join('\n') },
  ].filter(Boolean);
  let link = '';
  if (c.link_url) {
    const external = /^https?:/.test(c.link_url) ? ' target="_blank" rel="noopener"' : '';
    link = `<a class="${cx(LINK, 'text-[20px] tracking-[-0.6px]')}" href="${esc(c.link_url)}"${external}>${esc(c.link_label || c.link_url)}</a>`;
  }
  const body = f ? (f.blocks || []).map(block).join('\n\n') : caseSummary(c);
  // From tablet up: title and outcome on the left, the facts stacked beside them (the work list's columns).
  return `  <article class="flex flex-col gap-10 pt-8 tablet:pt-12">
    <div class="grid grid-cols-1 items-start gap-10 tablet:grid-cols-6 tablet:gap-x-5">
      <header class="flex flex-col gap-4 tablet:col-span-4">
        <h1 class="font-strong text-[38px] leading-10 tracking-[-1.6px] tablet:text-[60px] tablet:leading-[62px] tablet:tracking-[-3px]">${esc(c.title)}</h1>
${(f?.outcome || c.outcome) ? `        <p class="w-full text-lead-sm text-balance tablet:text-lead">${md(f?.outcome || c.outcome)}</p>\n` : ''}      </header>
${facts.length ? `      <dl class="grid grid-cols-2 gap-x-8 gap-y-5 tablet:col-span-2 tablet:grid-cols-1">
${facts.map((x) => `        <div class="min-w-0"><dt class="mb-1 text-label text-grey">${esc(x.label)}</dt><dd class="${BODY}">${md(x.value)}</dd></div>`).join('\n')}
      </dl>
` : ''}    </div>
${indent(body, 4)}
${link ? `    ${link}\n` : ''}  </article>`;
};

// --- home ---

// Work index: one row per case.
// Each row: the text in the left quarter, the case's images in a strip across the rest (like the
// Art direction list on tiberiomar.com). The strip has one height; however many images a case has,
// they share it equally, so every row is full.
// Screenshots crop from the top left; a phone screen rises from the bottom of a sand tile, like its frame on the case page.
const STRIP = 4;
const thumb = (m) => {
  const phone = m.frame === 'phone';
  const shot = m.frame === 'shot';
  const cls = cx('block transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none',
    phone ? 'absolute inset-x-0 top-[10%] mx-auto h-full w-[min(42%,240px)] origin-bottom rounded-t-[10px] border-x-[5px] border-t-[5px] border-device object-cover object-top tablet:rounded-t-[16px] tablet:border-x-[7px] tablet:border-t-[7px]' : 'size-full object-cover',
    shot && 'object-left-top');
  const el = m.type === 'video'
    ? `<video class="${cls}" src="${src(m.src)}" autoplay muted loop playsinline preload="metadata" aria-hidden="true"></video>`
    : `<img class="${cls}" src="${src(m.src)}" alt="" loading="lazy" decoding="async">`;
  return `<div class="${cx('relative h-full min-w-0 overflow-hidden', phone ? 'bg-sand' : 'bg-panel')}">${el}</div>`;
};
// The strip takes the case's own media first, then images from its full case. The halftone tool only
// works on its case page, so it is left out.
const strip = (c) => [...new Map([...(c.media || []), ...(c.full_case?.enabled ? (c.full_case.blocks || []).flatMap((b) => b.media || []) : [])]
  .filter((m) => m.type !== 'halftone' && m.src).map((m) => [m.src, m])).values()].slice(0, STRIP);
// Each row is a pair of hairline cells: the client as a small label at the top of the text cell, the title
// and outcome at its foot, level with the bottom of the strip.
const caseRow = (c) => `<li id="${esc(c.id)}">
  <a class="${cx('group grid grid-cols-1 gap-4 border-b border-line py-5 no-underline tablet:grid-cols-4 tablet:gap-0 tablet:py-0', FOCUS)}" href="${casePath(c)}">
    <div class="flex flex-col justify-between gap-6 tablet:border-r tablet:border-line tablet:py-6 tablet:pr-6">
      <p class="text-eyebrow text-faint uppercase">${esc(c.client)}</p>
      <div>
        <h2 class="text-lead-sm decoration-2 underline-offset-4 group-hover:underline desktop:text-lead">${esc(c.title)}</h2>
        <p class="mt-2 line-clamp-4 max-w-screen-mobile">${md(c.outcome)}</p>
      </div>
    </div>
    <div class="grid h-[44vw] auto-cols-fr grid-flow-col gap-2 tablet:col-span-3 tablet:my-6 tablet:ml-6 tablet:h-[clamp(240px,22vw,520px)] tablet:gap-2.5">${strip(c).map(thumb).join('')}</div>
  </a>
</li>`;

const h = home.hero;
const heroExtra = `    <div class="flex flex-wrap items-baseline gap-x-12 gap-y-4 text-[17px] leading-6 tracking-[-0.6px] tablet:text-[20px]"${h.show_contact ? '' : ' hidden'}>
      <a class="${LINK}" href="#contact" hidden>${esc(site.nav.cta)}</a>
      <span class="text-grey">${esc(site.email)} · ${esc(site.phone)}</span>
    </div>
${h.note ? `    <p class="max-w-screen-mobile text-note text-grey [&_i]:text-ink"${h.show_note ? '' : ' hidden'}>${md(h.note)}</p>\n` : ''}`;

// Logos sit at one optical height, tuned per logo in the CMS; all are forced to white.
const logo = (l) => {
  const filter = l.mono ? '[filter:grayscale(1)_brightness(0.4)_contrast(10)_invert(1)]' : '[filter:grayscale(1)_contrast(10)_invert(1)]';
  return `      <li><img class="block h-[var(--hm)] w-auto ${filter} tablet:h-[var(--h)]" style="--h:${+l.height || 24}px;--hm:${+l.height_mobile || 18}px" src="${src(l.image)}" alt="${esc(l.name)}"></li>`;
};
const logos = home.show_logos === false ? [] : shown(home.logos);

// Home hero: the headline over a stage where project images pile up (assets/trail.js).
// The headline sits on paper so it stays readable over any image.
// Pool: every image of every shown case, its full case included; halftone tools and videos are left out.
const trailPool = [...new Set(cases.flatMap((c) => [...(c.media || []), ...(c.full_case?.enabled ? (c.full_case.blocks || []).flatMap((b) => b.media || []) : [])])
  .filter((m) => m.type === 'image' && m.src).map((m) => src(m.src)))];
const homeHero = `  <section class="relative isolate flex min-h-[72svh] flex-col justify-between gap-6 overflow-hidden pt-8 pb-4 tablet:min-h-[82svh] tablet:pt-12" data-trail>
    <h1 class="relative z-10 max-w-[1500px] text-display-sm text-balance tablet:text-hero"><span class="bg-paper box-decoration-clone">${md(h.title)}${h.subtitle ? ` <span class="text-grey">${md(h.subtitle)}</span>` : ''}</span></h1>
${heroExtra.replace(/^    <div class="/, '    <div class="relative z-10 ')}    <div class="trail-stage pointer-events-none absolute inset-0 -z-10" aria-hidden="true"></div>
    <div class="relative z-10 flex items-end justify-between gap-4">
      <a class="${cx(LINK, 'bg-paper text-lead-sm tablet:text-lead')}" href="work.html">${esc(home.work_title)} →</a>
      <button class="${cx('trail-toggle cursor-pointer border border-ink bg-paper px-3 py-1 text-caption', FOCUS)}" type="button" hidden>Pause</button>
    </div>
  </section>
<script type="application/json" id="trail-data">${JSON.stringify(trailPool).replace(/</g, '\\u003c')}</script>
<script>
  // The work list used to be on this page: old links to #work or #<case id> go on to work.html.
  if (${JSON.stringify(['work', ...cases.map((c) => c.id)])}.includes(location.hash.slice(1))) location.replace('work.html' + location.hash);
</script>`;

const homeBody = `${homeHero}
${logos.length ? `
  <section class="border-y border-line py-7" aria-label="Clients and partners">
    <ul class="flex flex-wrap items-center justify-start gap-x-7 gap-y-[22px] tablet:justify-between tablet:gap-x-10 tablet:gap-y-7">
${logos.map(logo).join('\n')}
    </ul>
  </section>
` : ''}`;

// --- work ---

// The work page opens with its title as a small label, straight above the list.
const workBody = `  <header class="pt-8 pb-5 tablet:pt-12 tablet:pb-6">
    <h1 class="text-eyebrow text-faint uppercase">${esc(home.work_title)}</h1>
  </header>

  <div class="${BODY}">
    <ol class="border-t border-line">
${cases.map((c) => indent(caseRow(c), 6)).join('\n')}
    </ol>
  </div>`;

// --- approach ---

const item = (it) => `<div class="flex min-w-0 flex-col gap-2 border-t border-line pt-3.5"><h3 class="flex items-baseline justify-between gap-4 font-strong text-[20px] leading-6 tracking-[-0.8px] tablet:text-[24px] tablet:leading-7">${esc(it.heading)}${it.label ? ` <span class="font-sans text-[16px] tracking-[-0.2px] whitespace-nowrap text-grey">${esc(it.label)}</span>` : ''}</h3>${it.lead ? `<p class="max-w-screen-mobile italic ${BODY}">${md(it.lead)}</p>` : ''}${ps(it.text, `max-w-screen-mobile ${BODY}`).replace(/\n/g, '')}</div>`;

// Practice, Engagements and Principles in full on the approach page.
const approachSections = () => shown(approach.sections).map((s, i) => `  <section class="${cx(i > 0 && 'mt-14', RULE)}">
    ${sectionIntro(s, i + 1)}
    <div class="grid grid-cols-1 gap-7 tablet:grid-cols-2 tablet:gap-x-10 tablet:gap-y-9">
${shown(s.items).map((it) => `      ${item(it)}`).join('\n')}
    </div>
  </section>`).join('\n\n');

// On the home page, the sections ticked "Show on home page" in short form, as hairline cells (like
// addmore.studio): the label, or the item's number, at the top; the heading and italic intro at the bottom.
// Then a link to the approach page for the rest.
const shortItem = (it, i) => `<div class="${cx('flex min-w-0 flex-col justify-between gap-10 border-r border-b border-line p-5 tablet:p-6', it.lead ? 'min-h-[170px] tablet:min-h-[220px]' : 'min-h-[130px] tablet:min-h-[150px]')}">
        <span class="text-eyebrow text-faint uppercase">${it.label ? esc(it.label) : String(i + 1).padStart(2, '0')}</span>
        <div class="flex flex-col gap-2"><h3 class="text-lead-sm tablet:text-lead">${esc(it.heading)}</h3>${it.lead ? `<p class="text-grey ${BODY}">${md(it.lead)}</p>` : ''}</div>
      </div>`;
const homeApproach = () => {
  const sections = shown(approach.sections).filter((s) => s.on_home !== false);
  if (!sections.length) return '';
  return sections.map((s, n) => {
    const leads = shown(s.items).some((it) => it.lead);
    return `  <section class="mt-14 ${RULE}">
    ${sectionIntro(s, n + 1)}
    <div class="${cx('grid border-t border-l border-line', leads ? 'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4' : 'grid-cols-2 desktop:grid-cols-4')}">
${shown(s.items).map((it, i) => `      ${shortItem(it, i)}`).join('\n')}
    </div>
  </section>`;
  }).join('\n\n') + `

  <p class="mt-12 text-lead-sm tablet:text-lead"><a class="${LINK}" href="approach.html">How we work →</a></p>`;
};

const approachBody = `${hero(approach.hero)}

${approachSections()}`;

// --- write ---

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const file of STATIC) cpSync(file, `${OUT}/${file}`, { recursive: true, filter: (s) => !s.endsWith('.DS_Store') });
const paths = ['', 'work.html', 'approach.html'];
writeFileSync(`${OUT}/index.html`, page(
  { title: pageTitle(home.title), description: home.description || site.description, path: '' }, 'home', `${homeBody}\n\n${homeApproach()}`, '<script src="assets/trail.js"></script>'));
writeFileSync(`${OUT}/work.html`, page(
  { title: pageTitle(home.work_title), description: home.description || site.description, path: 'work.html' }, 'work', workBody));
writeFileSync(`${OUT}/approach.html`, page(
  { title: pageTitle(approach.title), description: approach.description || site.description, path: 'approach.html' }, 'approach', approachBody));
mkdirSync(`${OUT}/work`);
cases.forEach((c, i) => {
  const halftone = !c.full_case?.enabled && hasHalftone(c.media) ? '<script src="assets/halftone.js"></script>' : '';
  writeFileSync(`${OUT}/${casePath(c)}`, page(
    { title: pageTitle([c.title, c.client].filter(Boolean).join(' · ')), description: c.outcome || site.description, path: casePath(c) }, 'work', casePage(c), halftone));
  paths.push(casePath(c));
});
// The sitemap lists every page, so new cases are in it without editing anything.
writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${esc(siteUrl(p))}</loc></url>`).join('\n')}
</urlset>
`);
// Tailwind scans this file for classes, so the CSS is built after the pages exist.
execFileSync('node_modules/.bin/tailwindcss', ['-i', 'styles/site.css', '-o', `${OUT}/assets/site.css`, '--minify'], { stdio: 'inherit' });
console.log(`Built ${OUT}/ (home, work and ${cases.length} case pages, approach: ${shown(approach.sections).length} sections).`);
