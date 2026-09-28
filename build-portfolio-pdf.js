// Renders index.html to assets/Jacob_Tenorio_Portfolio.pdf using the
// @media print rules in index.css (see that file for what gets hidden/
// simplified -- e.g. only the first image of each carousel, no videos,
// no embedded report PDFs).
//
// Uses puppeteer-core against a locally installed Chromium-based browser
// (Edge or Chrome) instead of downloading a bundled ~300MB Chromium.
//
// Usage:
//   npm run build:pdf
//
// Run this (or `npm run build`, which includes it) any time you change
// index.html/index.css and want the downloadable portfolio PDF to match.

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = __dirname;
const HTML_PATH = path.join(ROOT, 'index.html');
const OUTPUT_PATH = path.join(ROOT, 'assets', 'Jacob_Tenorio_Portfolio.pdf');

const CANDIDATE_BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findBrowser() {
  for (const candidate of CANDIDATE_BROWSERS) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    'No local Chrome or Edge install found. Install one, or set BROWSER_PATH ' +
    'to a Chromium-based browser executable.'
  );
}

async function main() {
  const executablePath = process.env.BROWSER_PATH || findBrowser();
  const browser = await puppeteer.launch({ executablePath, headless: true });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const fileUrl = 'file:///' + HTML_PATH.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Let the page's own IIFE finish building carousels/etc. -- it runs
    // synchronously on load, but give it a beat for images to decode.
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.emulateMediaType('print');

    await page.pdf({
      path: OUTPUT_PATH,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
    });

    console.log(`Saved ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
