# Portfolio Website

Static site — no framework, no server-side build. Hosted on GitHub Pages at
https://jacobtenorio-10.github.io/.

## Editing the site

Edit `index.html`, `index.css`, and `script.js` directly — those are the
source files. The page itself loads **minified** copies (`index.min.css`,
`script.min.js`) for faster load times, so after editing CSS or JS, rebuild
before deploying:

```
npm run build
```

(Requires Node.js; the CSS/JS steps only run `npx clean-css-cli` and `npx
terser`, no project dependencies to install for those two.) Then commit the
source file and its `.min` counterpart together.

`index.html` itself isn't minified/built — edit it and it's live as-is.

## Portfolio PDF

`npm run build` (via `npm run build:pdf`) also regenerates
`assets/Jacob_Tenorio_Portfolio.pdf` — a downloadable PDF version of the
portfolio, linked from the nav bar as "Portfolio (PDF)". It's meant to be
printed or attached to applications as a standalone document, so it is
**not** a printout of the website: `build-portfolio-pdf.js` scrapes the
bio, education, project text/images, skills, and contact info out of the
live `index.html`, then renders that content into `portfolio-pdf.css` — a
separate layout designed for paginated print, with a cover page and one
page per project. It deliberately leaves out things that only make sense
interactively: the resume preview (there's no full-resume download to
back it up), video clips, and the embedded/scrollable AIAA DBF design
report viewers. Each carousel still contributes its first photo.

If you add or reorder projects, edit the bio, or change contact info in
`index.html`, the PDF picks it up automatically next time it's built — no
need to touch `build-portfolio-pdf.js`. Only the PDF's own look (page
layout, cover page, typography) lives in `portfolio-pdf.css`.

**There's no CI here — this is a local build step.** Run `npm run build`
(or just `npm run build:pdf`) yourself any time you change `index.html`
content or project photos, then commit the regenerated PDF alongside your
other changes. It won't update itself.

Two extra things this step needs beyond Node:
- **A local Chrome or Edge install** (`build-portfolio-pdf.js` uses
  `puppeteer-core` against whichever it finds, instead of downloading a
  ~300MB bundled Chromium). Set `BROWSER_PATH` if yours isn't in one of
  the default install locations the script checks.
- **Python with `pymupdf` and `Pillow`** (`pip install -r requirements.txt`)
  — `compress-portfolio-pdf.py` runs right after the PDF is generated to
  downsample the embedded carousel images. Chromium embeds every `<img>`
  at its full source resolution regardless of how small it's actually
  displayed on the page, which without this step means a ~25MB PDF instead
  of ~2MB.

## Assets

See `assets/images/README.md` and `assets/videos/README.md` for how to add
project photos/videos, including the tools that keep them web-sized
(`assets/images/optimize-images.py`) and the manifest scripts that let the
carousels pick up new files with no HTML/JS edits.
