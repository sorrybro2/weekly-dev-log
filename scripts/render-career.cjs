// TMI Markdown -> standalone HTML + A4 PDF. No remote assets.
// npm install --prefix scripts --no-save marked@12.0.2 playwright
// npx playwright install chromium
// node scripts/render-career.cjs
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { marked } = require(process.env.MARKED_MODULE || 'marked');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const source = path.join(root, '경력기술서_TMI.md');
const htmlPath = path.join(root, '진솔_경력기술서_TMI.html');
const pdfPath = path.join(root, '진솔_경력기술서_TMI.pdf');
const css = fs.readFileSync(path.join(__dirname, 'career-print.css'), 'utf8');
const md = fs.readFileSync(source, 'utf8');
if (/^```mermaid/m.test(md)) throw new Error('Convert Mermaid blocks to local SVG before export.');
let body = marked.parse(md, { gfm: true, breaks: false });
body = body.replace(/<p><strong>(\d+\)[\s\S]*?)<\/strong><\/p>/g, '<h4>$1</h4>');
body = body.replace(/<p><img src="([^"]+)" alt="([^"]*)"><\/p>/g, (_, src, alt) => {
  const file = path.resolve(root, decodeURIComponent(src));
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Image outside workspace');
  const bytes = fs.readFileSync(file);
  return '<figure><img src="data:image/svg+xml;base64,' + bytes.toString('base64') + '" alt="' + alt + '"></figure>';
});
// Evidence stays legible but visually secondary; normal body text keeps its size.
body = body.replace(/<li><strong>근거<\/strong>([\s\S]*?)<\/li>/g, '<li class="evidence"><strong>근거</strong>$1</li>');
// Keep paragraph and section markers with the first following text block in print.
body = body.replace(/<p><strong>([^<]+)<\/strong><\/p>/g, '<p class="label"><strong>$1</strong></p>');
const html = '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>진솔 — 상세 경력기술서 (TMI)</title><style>' + css + '</style></head><body><main>' +
  body + '</main></body></html>';
fs.writeFileSync(htmlPath, html);

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // All render assets are local. Fail if a future edit introduces a remote dependency.
    await page.route(/^https?:\/\//, route => route.abort());
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, img => img.decode()));
    });
    const imageChecks = await page.locator('figure img').evaluateAll(images => images.map(img => ({
      alt: img.alt, width: img.clientWidth, height: img.clientHeight, loaded: img.naturalWidth > 0
    })));
    if (imageChecks.length !== 5 || imageChecks.some(x => !x.loaded)) throw new Error('Incomplete architecture images');
    if (errors.length) throw new Error(errors.join('\n'));
    const svgSources = fs.readdirSync(path.join(root, 'assets/career-tmi'))
      .filter(file => file.endsWith('.svg'))
      .map(file => ({ file, svg: fs.readFileSync(path.join(root, 'assets/career-tmi', file), 'utf8') }));
    const diagramOverflow = await page.evaluate(sources => {
      const failures = [];
      for (const source of sources) {
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-10000px;top:0;width:720px;';
        host.innerHTML = source.svg;
        document.body.append(host);
        for (const group of host.querySelectorAll('g')) {
          const rect = group.querySelector('rect');
          if (!rect) continue;
          const r = rect.getBBox();
          for (const text of group.querySelectorAll('text')) {
            const b = text.getBBox();
            if (b.x < r.x + 2 || b.x + b.width > r.x + r.width - 2 ||
                b.y < r.y || b.y + b.height > r.y + r.height) {
              failures.push({ file: source.file, label: text.textContent });
            }
          }
        }
        host.remove();
      }
      return failures;
    }, svgSources);
    if (diagramOverflow.length) throw new Error('Diagram label overflow: ' + JSON.stringify(diagramOverflow));
    console.log('SVG labels: all fit inside their nodes.');
    await page.pdf({
      path: pdfPath, format: 'A4', preferCSSPageSize: true, printBackground: true,
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: '<div style="font-family:Arial,sans-serif;font-size:8px;color:#64748b;width:100%;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
    });
    console.log(JSON.stringify({ html: htmlPath, pdf: pdfPath, diagrams: imageChecks }, null, 2));
    // Optional QA uses an existing PDF.js install; it does not affect the exported files.
    if (process.env.PDFJS_MODULE) {
      const pdfjsPath = require.resolve(process.env.PDFJS_MODULE);
      const workerPath = path.join(path.dirname(pdfjsPath), 'pdf.worker.js');
      const qa = await browser.newPage({ viewport: { width: 1240, height: 1000 } });
      await qa.goto(pathToFileURL(htmlPath).href);
      await qa.addScriptTag({ path: pdfjsPath });
      const encoded = fs.readFileSync(pdfPath).toString('base64');
      const report = await qa.evaluate(async ({ encoded, workerUrl }) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        document.body.innerHTML = '<div id="sheet"></div>';
        const sheet = document.getElementById('sheet');
        sheet.style.cssText = 'display:grid;grid-template-columns:repeat(3,380px);gap:20px;padding:20px;background:#e2e8f0;width:1180px;';
        const pages = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const p = await doc.getPage(i);
          const { items } = await p.getTextContent();
          const text = items.filter(x => x.str.trim() && x.transform[5] > 32);
          pages.push({
            page: i, characters: text.reduce((n, x) => n + x.str.length, 0),
            top: text.slice(0, 5).map(x => x.str).join(' '),
            bottom: text.slice(-5).map(x => x.str).join(' '),
            minY: Math.min(...text.map(x => x.transform[5])),
            maxY: Math.max(...text.map(x => x.transform[5]))
          });
          const canvas = document.createElement('canvas');
          canvas.id = 'page-' + i;
          const viewport = p.getViewport({ scale: 1.4 });
          canvas.width = viewport.width; canvas.height = viewport.height;
          canvas.style.cssText = 'width:380px;height:auto;background:white;display:block;box-shadow:0 2px 8px #94a3b8;';
          sheet.append(canvas);
          await p.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        }
        return pages;
      }, { encoded, workerUrl: pathToFileURL(workerPath).href });
      const qaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-tmi-qa-'));
      await qa.locator('#sheet').screenshot({ path: path.join(qaDir, 'all-pages.png') });
      for (const i of [1, 2, 3, report.find(x => x.top.includes('IV.'))?.page].filter(Boolean)) {
        const png = await qa.locator('#page-' + i).evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
        fs.writeFileSync(path.join(qaDir, 'page-' + i + '.png'), Buffer.from(png, 'base64'));
      }
      fs.writeFileSync(path.join(qaDir, 'pages.json'), JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ qaDir, pages: report }, null, 2));
      if (report.some(x => x.characters < 120)) throw new Error('Nearly empty PDF page detected');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
