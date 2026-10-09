// Builds vorkurs.space from content/site.json (edited in Pages CMS) into dist/.
// Run: node build.mjs   — then open dist/index.html
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, copyFileSync, statSync } from 'node:fs';

const OUT = process.env.OUT || 'dist';
const site = JSON.parse(readFileSync('content/site.json', 'utf8'));
const css = readFileSync('static/style.css', 'utf8');

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// [label](url) becomes a link; a line break becomes <br>.
const md = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>').replace(/\n/g, '<br>');
const paras = (s) => String(s || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const I = (n) => ' '.repeat(n);

const item = (style, it) => {
  if (style === 'way') {
    return `${I(8)}<div class="way-block">
${I(10)}<h3>${esc(it.heading)}${it.label ? ` – <span class="phase">${esc(it.label)}</span>` : ''}</h3>
${it.intro ? `${I(10)}<span class="subtitle">${esc(it.intro)}</span>\n` : ''}${paras(it.text).map((p) => `${I(10)}<span>${md(p)}</span>\n`).join('')}${I(8)}</div>`;
  }
  if (style === 'case') {
    const link = it.link_url
      ? `${I(10)}<a href="${esc(it.link_url)}" class="ext-link" target="_blank" rel="noopener"${it.link_visible === false ? ' style="display: none;"' : ''}>${esc(it.link_label || 'View')}</a>\n`
      : '';
    return `${I(8)}<div class="case-study">
${I(10)}<h3>${esc(it.heading)}</h3>
${it.subheading ? `${I(10)}<h4>${esc(it.subheading)}</h4>\n` : ''}${paras(it.text).map((p) => `${I(10)}<p>${md(p)}</p>\n`).join('')}${link}${I(8)}</div>`;
  }
  const cls = style === 'principle' ? 'principle' : 'service-block';
  return `${I(8)}<div class="${cls}">
${I(10)}<h3>${esc(it.heading)}</h3>
${paras(it.text).map((p) => `${I(10)}<p>${md(p)}</p>\n`).join('')}${I(8)}</div>`;
};

const section = (s) => `    <div class="w-full flex flex-col md:flex-row md:justify-between gap-0 md:gap-20">
      <h2 class="md:w-1/3 section-title">${esc(s.title)}</h2>

      <div class="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-x-8">
${(s.items || []).map((it) => item(s.style, it)).join('\n\n')}
      </div>
    </div>

    <div class="divider"></div>`;

const f = site.footer || {};
const tel = String(f.phone || '').replace(/[^\d+]/g, '');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(site.title)}</title>
  <meta name="description" content="${esc(site.description)}">
  <link rel="canonical" href="${esc(site.url)}">
  <link rel="icon" href="/fav.png" type="image/png">
  <link rel="apple-touch-icon" href="/fav.png">
  <meta name="theme-color" content="#ffffff">

  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(site.url)}">
  <meta property="og:title" content="${esc(site.title)}">
  <meta property="og:description" content="${esc(site.description)}">
  <meta property="og:image" content="${esc(site.url)}ogimage.png">
  <meta property="og:site_name" content="${esc(site.title)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(site.title)}">
  <meta name="twitter:description" content="${esc(site.description)}">
  <meta name="twitter:image" content="${esc(site.url)}ogimage.png">
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
${css.replace(/^(?=.)/gm, '    ')}  </style>
</head>
<body>

  <header class="fixed bg-white w-full mx-auto">
    <div class="w-[calc(100%-40px)] mx-auto flex items-center justify-between py-[5px] px-0 border-b-2 border-black">
      <a href="${esc(site.url)}" class="logo">${esc(site.title)}</a>
      <nav class="nav">
        <a href="mailto:${esc(site.email)}">${esc(site.nav_label || 'get in touch')}</a>
      </nav>
    </div>
  </header>

  <div class="page">

    <div class="hero">
      <h2>${md(site.hero)}</h2>
    </div>

    <div class="divider"></div>

${(site.sections || []).map(section).join('\n\n')}

    <footer class="w-full flex flex-col md:flex-row md:justify-between md:items-end gap-4 md:gap-20">
      <div class="footer-cta">
        <p>${md(f.cta)}</p>
      </div>

      <div class="footer">
        <div class="footer-col">
          <h4>Contact</h4>
${f.phone ? `          <a href="tel:${tel}">${esc(f.phone)}</a>\n` : ''}          <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>
        </div>
        <div class="footer-col">
          <h4>Studio</h4>
          <p>${md(f.address)}</p>
        </div>
      </div>
    </footer>

  </div>

</body>
</html>
`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const file of readdirSync('static')) {
  if (file === 'style.css' || file === '.DS_Store' || statSync(`static/${file}`).isDirectory()) continue;
  copyFileSync(`static/${file}`, `${OUT}/${file}`);
}
writeFileSync(`${OUT}/index.html`, html);
console.log(`Built ${OUT}/index.html (${(site.sections || []).length} sections).`);
