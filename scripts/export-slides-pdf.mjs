/**
 * Exports docs/slides/linkedin-launch.html → docs/slides/linkedin-launch.pdf
 * Each slide becomes one PDF page (960 × 540 px, 16:9).
 * Nav controls are hidden; each slide shows its page number.
 */

import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(__dirname, '../docs/slides/linkedin-launch.html');
const pdfPath = path.resolve(__dirname, '../docs/slides/linkedin-launch.pdf');

// ── 1. Read source HTML ──────────────────────────────────────────────────────
let html = readFileSync(htmlPath, 'utf8');

// ── 2. Count slides ──────────────────────────────────────────────────────────
const total = (html.match(/<div class="slide/g) ?? []).length;

// ── 3. Inject PDF-mode overrides before </head> ──────────────────────────────
const pdfCss = `
<style id="pdf-override">
  /* Reset body to plain block flow */
  body {
    height: auto !important;
    overflow: visible !important;
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* Deck: natural block, auto height */
  .deck {
    position: static !important;
    width: 960px !important;
    height: auto !important;
    margin: 0 auto !important;
  }

  /* All slides: visible, stacked, each exactly one page tall (960×540) */
  .slide {
    position: relative !important;
    inset: auto !important;
    opacity: 1 !important;
    pointer-events: all !important;
    transform: none !important;
    transition: none !important;
    width: 960px !important;
    height: 540px !important;
    display: flex !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  /* Hide interactive chrome */
  nav, .hint { display: none !important; }
</style>
`;

html = html.replace('</head>', pdfCss + '</head>');

// ── 4. Write a temp file (avoids file:// CSP issues with setContent) ──────────
const tmpPath = htmlPath.replace('.html', '.tmp.html');
writeFileSync(tmpPath, html, 'utf8');

// ── 5. Puppeteer: open, print, close ─────────────────────────────────────────
console.log(`Launching browser…`);
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_PATH });
const page = await browser.newPage();

await page.goto(`file://${tmpPath}`, { waitUntil: 'networkidle0' });

// Give web fonts a moment to render
await new Promise(r => setTimeout(r, 800));

await page.pdf({
  path: pdfPath,
  width: '960px',
  height: '540px',
  printBackground: true,
  margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  displayHeaderFooter: false,
  pageRanges: '1-7',
});

await browser.close();

// ── 6. Clean up temp file ────────────────────────────────────────────────────
unlinkSync(tmpPath);

console.log(`✓  PDF written → ${pdfPath} (${total} pages)`);
