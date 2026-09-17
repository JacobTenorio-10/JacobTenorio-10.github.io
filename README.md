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

(Requires Node.js; this only runs `npx clean-css-cli` and `npx terser`, no
project dependencies to install.) Then commit both the source file and its
`.min` counterpart together.

`index.html` itself isn't minified/built — edit it and it's live as-is.

## Assets

See `assets/images/README.md` and `assets/videos/README.md` for how to add
project photos/videos, including the tools that keep them web-sized
(`assets/images/optimize-images.py`) and the manifest scripts that let the
carousels pick up new files with no HTML/JS edits.
