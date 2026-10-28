# vorkurs.space

All text and media are edited in **Pages CMS** (app.pagescms.org). The pages are generated, so there is no `index.html` to edit by hand.

- `content/site.json`: studio name, contact details, navigation, closing line, link preview image
- `content/home.json`: hero, client logos, case studies (including full cases that open over the page)
- `content/approach.json`: hero and sections (Practice, Engagements, Principles)
- `.pages.yml`: the editor setup. Every key in the JSON files must be declared here, or Pages CMS drops it on save.
- `styles/site.css`: Tailwind entry with the design tokens (colours, fonts, type scale). The utility classes are in the markup in `build.mjs`.
- `assets/`: `site.js`, `halftone.js`, fonts and client logos (logo uploads land in `assets/logos/`)
- `img/`: case study images and videos (uploads land here)
- `fav.png`, `ogimage.png`, `robots.txt`, `sitemap.xml`: served from the site root
- `build.mjs`: renders the pages from `content/`, copies the files above into `dist/` and compiles the CSS with Tailwind

## Editing

Three entries: **Site settings**, **Home**, **Approach**. Lists can be dragged to reorder; untick *Show on site* to hide something without deleting it.

In text fields: an empty line starts a new paragraph, `[text](https://…)` makes a link, `*text*` makes italics.

Case studies pick a media layout (large + stacked, two, three, wide + two, two + text) and each media item a frame (plain, screenshot, wide, tall, in a phone). A media item of type *Halftone tool* turns its image into the live halftone generator. Tick *Has a full case* to add a full case that opens over the page; its blocks are sections with optional heading, text and media.

## Publish

Push to `main` (Pages CMS commits there). Vercel and Netlify install the dependencies (Tailwind), then both run `node build.mjs` and publish `dist/`.

A new page needs a content file, an entry in `.pages.yml`, a render step in `build.mjs` and a line in `sitemap.xml`.

## Preview locally

`npm install` once, then `node build.mjs` and `npx serve dist`.
