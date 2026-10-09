# vorkurs.space (Pages CMS)

Same site, same design — the text now lives in `content/site.json` and is edited at **app.pagescms.org**.

- `content/site.json` — all text (intro, sections, footer)
- `static/` — fonts, favicon, share image, and the CSS (`style.css`, unchanged from the original)
- `build.mjs` — turns the content into `dist/index.html`
- `.pages.yml` — the editor setup (hidden file; `pages-config.yml` is a visible copy)

## Publish

1. Put this folder on GitHub (GitHub Desktop → File → Add local repository → Publish). Check `.pages.yml` is at the top level of the repo.
2. Hosting — either:
   - **Vercel (where the site is now):** import the repo; settings come from `vercel.json`. Then move the vorkurs.space domain to this project.
   - **Netlify:** import the repo; settings come from `netlify.toml`.
3. Editor: app.pagescms.org → sign in with GitHub → give it access to the repo.

## Editing

One entry: **vorkurs.space**. Sections are a list (drag to reorder); each has items. Pick a style per section:
- *Plain* / *Principle* — grey heading + text
- *Way of working* — "Heading – label", italic intro, text
- *Case study* — heading, role, text, optional link (untick "Show link" to hide it)

Empty line in a text = new paragraph. Links: `[text](https://…)`.

## Preview locally

`node build.mjs`, then open `dist/index.html` (or `npx serve dist`).
