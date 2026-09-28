// Builds assets/Jacob_Tenorio_Portfolio.pdf: a standalone, print-designed
// document (NOT a printout of the website). It scrapes structured content
// (bio, education, project text/images, skills, contact) out of the live
// index.html DOM, then renders that content into a separate template
// (portfolio-pdf.css) built specifically for paginated print -- its own
// layout, typography, and page breaks, with a cover page, one page per
// project, and no resume preview or embedded design-report viewers (those
// only make sense as interactive/scrollable elements on the live site).
//
// Uses puppeteer-core against a locally installed Chromium-based browser
// (Edge or Chrome) instead of downloading a bundled ~300MB Chromium.
//
// Usage:
//   npm run build:pdf
//
// Run this (or `npm run build`, which includes it) any time you change
// index.html content (bio, projects, skills, contact) and want the
// downloadable portfolio PDF to match.

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = __dirname;
const HTML_PATH = path.join(ROOT, 'index.html');
const TEMPLATE_CSS_PATH = path.join(ROOT, 'portfolio-pdf.css');
const OUTPUT_PATH = path.join(ROOT, 'assets', 'Jacob_Tenorio_Portfolio.pdf');
const SITE_URL = 'https://jacobtenorio-10.github.io/';
// Puppeteer's page.setContent() serves the page from an unprivileged
// about:blank-like origin that Chromium refuses to load local file://
// images from ("Not allowed to load local resource"). Writing the
// generated document to a real file and navigating to it via file:// --
// same as index.html itself -- avoids that restriction.
const TEMP_HTML_PATH = path.join(ROOT, '.portfolio-pdf-build.tmp.html');

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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Runs inside the page (browser context) against the live site's DOM.
function scrapePortfolioData() {
  const text = (el) => (el ? el.textContent.trim() : '');

  const hero = {
    name: text(document.querySelector('#hero-name')),
    subtitle: text(document.querySelector('.hero-subtitle')),
    school: text(document.querySelector('.hero-school')),
  };

  const about = {
    bioParagraphs: Array.from(document.querySelectorAll('.about-bio p')).map(text),
    education: (() => {
      const degreeEl = document.querySelector('.edu-degree');
      let degree = '';
      if (degreeEl) {
        const clone = degreeEl.cloneNode(true);
        const gpaEl = clone.querySelector('.edu-gpa');
        if (gpaEl) gpaEl.remove();
        degree = clone.textContent.trim();
      }
      return {
        school: text(document.querySelector('.edu-school')),
        date: text(document.querySelector('.edu-date')),
        degree,
        gpa: text(document.querySelector('.edu-gpa')),
        courseworkHTML: document.querySelector('.edu-coursework')
          ? document.querySelector('.edu-coursework').innerHTML.trim()
          : '',
      };
    })(),
  };

  const projects = Array.from(document.querySelectorAll('#projects .project-card')).map((article) => {
    const accent = getComputedStyle(article).getPropertyValue('--project-accent').trim() || '#00b4d8';
    const images = Array.from(article.querySelectorAll('.project-images > .image-carousel'))
      .map((carousel) => {
        const img = carousel.querySelector('.carousel-track img');
        if (!img) return null;
        return { src: img.currentSrc || img.src, label: carousel.dataset.label || '' };
      })
      .filter(Boolean);
    const columns = Array.from(article.querySelectorAll('.project-details > .project-column')).map((col) => ({
      heading: text(col.querySelector('h4')),
      items: Array.from(col.querySelectorAll('li')).map((li) => li.innerHTML.trim()),
    }));
    const creditEl = article.querySelector('.reports-caption');
    return {
      title: text(article.querySelector('.project-title')),
      accent,
      tags: Array.from(article.querySelectorAll('.project-tags .project-tag')).map(text),
      images,
      columns,
      credit: creditEl ? creditEl.textContent.trim() : null,
    };
  });

  const skills = Array.from(document.querySelectorAll('#skills .skill-category')).map((cat) => ({
    title: text(cat.querySelector('.skill-category-title')),
    chips: Array.from(cat.querySelectorAll('.skill-chip')).map(text),
  }));

  const contactCard = (id) => {
    const el = document.querySelector(id);
    return el ? { value: text(el.querySelector('.contact-value')), href: el.href } : null;
  };
  const contact = {
    email: contactCard('#contact-email'),
    linkedin: contactCard('#contact-linkedin'),
    phone: contactCard('#contact-phone'),
  };

  return { hero, about, projects, skills, contact };
}

function renderCoverPage(data) {
  const { hero, contact } = data;
  return `
    <div class="pdf-page cover-page">
      <div class="cover-inner">
        <div>
          <div class="cover-kicker">Engineering Portfolio</div>
          <h1 class="cover-name">${escapeHtml(hero.name)}</h1>
          <p class="cover-subtitle">${escapeHtml(hero.subtitle)}</p>
          <p class="cover-school">${escapeHtml(hero.school)}</p>
          <a class="cover-site-link" href="${SITE_URL}">View the full interactive portfolio &rarr; jacobtenorio-10.github.io</a>
        </div>
        <div class="cover-contact">
          ${contact.email ? `<a href="${contact.email.href}"><span class="cover-contact-label">Email</span><span class="cover-contact-value">${escapeHtml(contact.email.value)}</span></a>` : ''}
          ${contact.linkedin ? `<a href="${contact.linkedin.href}"><span class="cover-contact-label">LinkedIn</span><span class="cover-contact-value">${escapeHtml(contact.linkedin.value)}</span></a>` : ''}
          ${contact.phone ? `<a href="${contact.phone.href}"><span class="cover-contact-label">Phone</span><span class="cover-contact-value">${escapeHtml(contact.phone.value)}</span></a>` : ''}
        </div>
      </div>
    </div>`;
}

function renderAboutPage(data) {
  const { about } = data;
  const edu = about.education;
  return `
    <div class="pdf-page">
      <h2 class="section-heading">About Me</h2>
      <div class="about-bio">
        ${about.bioParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')}
      </div>
      <div class="edu-block">
        <div class="edu-row">
          <span class="edu-school">${escapeHtml(edu.school)}</span>
          <span class="edu-date">${escapeHtml(edu.date)}</span>
        </div>
        <p class="edu-degree">${escapeHtml(edu.degree)}<span class="edu-gpa">${escapeHtml(edu.gpa)}</span></p>
        <p class="edu-coursework">${edu.courseworkHTML}</p>
      </div>
      <div class="page-footer"><span>Jacob Tenorio &mdash; Engineering Portfolio</span><span>About</span></div>
    </div>`;
}

function renderProjectPage(project) {
  const imagesHTML = project.images
    .map(
      (img) => `
        <div class="project-image">
          <div class="project-image-frame"><img src="${img.src}" alt="${escapeHtml(img.label)}"></div>
          <div class="project-image-caption">${escapeHtml(img.label)}</div>
        </div>`
    )
    .join('\n');

  const columnsHTML = project.columns
    .map(
      (col) => `
        <div class="project-column">
          <h4>${escapeHtml(col.heading)}</h4>
          <ul>${col.items.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>`
    )
    .join('\n');

  return `
    <div class="pdf-page project-page" style="--project-accent: ${project.accent};">
      <div class="project-page-header">
        <div class="project-kicker">Project</div>
        <h3 class="project-title">${escapeHtml(project.title)}</h3>
        <div class="project-title-rule"></div>
        <div class="project-tags">${project.tags.map((tag) => `<span class="project-tag">${escapeHtml(tag)}</span>`).join('')}</div>
        ${project.credit ? `<p class="project-credit">AIAA Design/Build/Fly Design Report &mdash; ${escapeHtml(project.credit)}</p>` : ''}
      </div>
      <div class="project-images-row">${imagesHTML}</div>
      <div class="project-columns">${columnsHTML}</div>
      <div class="page-footer"><span>Jacob Tenorio &mdash; Engineering Portfolio</span><span>${escapeHtml(project.title)}</span></div>
    </div>`;
}

function renderSkillsContactPage(data) {
  const { skills, contact } = data;
  const skillsHTML = skills
    .map(
      (cat) => `
        <div>
          <h4 class="skill-cat-title">${escapeHtml(cat.title)}</h4>
          <div class="skill-chip-list">${cat.chips.map((chip) => `<span class="skill-chip">${escapeHtml(chip)}</span>`).join('')}</div>
        </div>`
    )
    .join('\n');

  return `
    <div class="pdf-page">
      <h2 class="section-heading">Skills</h2>
      <div class="skills-columns">${skillsHTML}</div>
      <div class="contact-block">
        ${contact.email ? `<div><span class="contact-item-label">Email</span><a class="contact-item-value" href="${contact.email.href}">${escapeHtml(contact.email.value)}</a></div>` : ''}
        ${contact.linkedin ? `<div><span class="contact-item-label">LinkedIn</span><a class="contact-item-value" href="${contact.linkedin.href}">${escapeHtml(contact.linkedin.value)}</a></div>` : ''}
        ${contact.phone ? `<div><span class="contact-item-label">Phone</span><a class="contact-item-value" href="${contact.phone.href}">${escapeHtml(contact.phone.value)}</a></div>` : ''}
      </div>
      <div class="page-footer"><span>Jacob Tenorio &mdash; Engineering Portfolio</span><span>Skills &amp; Contact</span></div>
    </div>`;
}

function buildDocument(data, css) {
  const pages = [
    renderCoverPage(data),
    renderAboutPage(data),
    ...data.projects.map(renderProjectPage),
    renderSkillsContactPage(data),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Jacob Tenorio Portfolio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
${pages}
</body>
</html>`;
}

async function main() {
  const executablePath = process.env.BROWSER_PATH || findBrowser();
  const browser = await puppeteer.launch({ executablePath, headless: true });

  try {
    const sitePage = await browser.newPage();
    await sitePage.setViewport({ width: 1280, height: 900 });

    const fileUrl = 'file:///' + HTML_PATH.replace(/\\/g, '/');
    await sitePage.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Let the page's own IIFE finish building carousels/etc. -- it runs
    // synchronously on load, but give it a beat for images to decode.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const data = await sitePage.evaluate(scrapePortfolioData);
    await sitePage.close();

    const css = fs.readFileSync(TEMPLATE_CSS_PATH, 'utf8');
    const html = buildDocument(data, css);
    fs.writeFileSync(TEMP_HTML_PATH, html, 'utf8');

    try {
      const pdfPage = await browser.newPage();
      const tempFileUrl = 'file:///' + TEMP_HTML_PATH.replace(/\\/g, '/');
      await pdfPage.goto(tempFileUrl, { waitUntil: 'networkidle0' });
      await pdfPage.emulateMediaType('print');

      await pdfPage.pdf({
        path: OUTPUT_PATH,
        format: 'Letter',
        printBackground: true,
        margin: { top: '0in', bottom: '0in', left: '0in', right: '0in' },
      });

      console.log(`Saved ${OUTPUT_PATH}`);
    } finally {
      fs.rmSync(TEMP_HTML_PATH, { force: true });
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
