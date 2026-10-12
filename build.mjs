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

// SEO: empty fields fall back to the site name / meta description.
const seo = site.seo || {};
const url = site.url || '/';
const title = seo.title || site.title;
const description = seo.description || site.description || '';
const shareTitle = seo.share_title || title;
const shareDescription = seo.share_description || description;
const abs = (p) => { try { return new URL(p, url).href; } catch { return p; } };
const image = abs(seo.image || '/ogimage.png');
const twitter = seo.twitter ? '@' + String(seo.twitter).replace(/^@/, '') : '';
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.title,
  url,
  description,
  logo: abs('/fav.png'),
  ...(site.email && { email: site.email }),
  ...(f.phone && { telephone: f.phone }),
  ...(f.address && { address: { '@type': 'PostalAddress', streetAddress: String(f.address).replace(/,?\s*\n\s*/g, ', ') } }),
};

const html = `<!DOCTYPE html>
<html lang="${esc(seo.language || 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
${seo.noindex ? '  <meta name="robots" content="noindex, nofollow">\n' : ''}  <link rel="canonical" href="${esc(url)}">
  <link rel="icon" href="/fav.png" type="image/png">
  <link rel="apple-touch-icon" href="/fav.png">
  <meta name="theme-color" content="#ffffff">

  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(shareTitle)}">
  <meta property="og:description" content="${esc(shareDescription)}">
  <meta property="og:image" content="${esc(image)}">
${seo.image_alt ? `  <meta property="og:image:alt" content="${esc(seo.image_alt)}">\n` : ''}  <meta property="og:site_name" content="${esc(site.title)}">

  <meta name="twitter:card" content="summary_large_image">
${twitter ? `  <meta name="twitter:site" content="${esc(twitter)}">\n` : ''}  <meta name="twitter:title" content="${esc(shareTitle)}">
  <meta name="twitter:description" content="${esc(shareDescription)}">
  <meta name="twitter:image" content="${esc(image)}">
${seo.image_alt ? `  <meta name="twitter:image:alt" content="${esc(seo.image_alt)}">\n` : ''}
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
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
writeFileSync(`${OUT}/robots.txt`, seo.noindex
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);
writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${esc(url)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>
</urlset>
`);
console.log(`Built ${OUT}/index.html (${(site.sections || []).length} sections).`);
