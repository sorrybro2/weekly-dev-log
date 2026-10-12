// Render new documents from actual local UI captures; preserve every previous export.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
function dependency(name, env) {
  if (process.env[env]) return require(process.env[env]);
  try { return require(name); } catch { return require(path.join(os.tmpdir(), 'fullstack-review-tools', 'node_modules', name)); }
}
const { chromium } = dependency('playwright', 'PLAYWRIGHT_MODULE');
const { marked } = dependency('marked', 'MARKED_MODULE');
const { fontCss } = require('./document-fonts.cjs');
const { publicHtml, assertPublicDocument } = require('./public-document.cjs');
const root = path.resolve(__dirname, '..');
const reviewDir = path.join(root, '경력기술서', '검토');
const outputDir = path.join(root, '경력기술서', '출력');
const qaDir = path.join(reviewDir, '캡처미리보기');
const dataFile = path.join(root, 'portfolio', 'capture-content.json');
const careerFile = path.join(reviewDir, '민간풀스택_경력기술서_로컬캡처본.md');
const css = fontCss + fs.readFileSync(path.join(__dirname, 'capture-print.css'), 'utf8');
const excluded = /8\s*초|0\s*\.\s*05\s*초|160\s*배|\bFDW\b/i;
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, x => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[x])); }
function p(value) { return '<p>' + esc(value) + '</p>'; }
function bullets(values) { return '<ul>' + (values || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>'; }
function raster(file, base = root) {
  if (/^data:image\/(png|jpeg|webp);base64,/i.test(file)) return file;
  if (/^(?:https?:|file:|\/\/)/i.test(file)) throw new Error('Only local raster captures are accepted: ' + file);
  const resolved = path.resolve(base, decodeURIComponent(file));
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Image is outside the workspace: ' + file);
  const mime = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp' }[path.extname(resolved).toLowerCase()];
  if (!mime) throw new Error('Raster image required: ' + file);
  return 'data:' + mime + ';base64,' + fs.readFileSync(resolved).toString('base64');
}
function mast(index, label) { return '<div class="mast"><span><span class="index">' + esc(index) + '</span>' + esc(label) + '</span><span class="owner">진솔 · FULL STACK</span></div>'; }
function chapter(index, label, body) { return '<section class="chapter">' + mast(index, label) + body + '</section>'; }
function overview(data) {
  const intro = data.intro;
  const portrait = fs.existsSync(path.join(root, 'assets/portfolio/profile.jpg')) ? '<img class="portrait" src="' + raster('assets/portfolio/profile.jpg') + '" alt="진솔 프로필 사진">' : '';
  let body = '<header class="profile"><div class="profile-copy"><h1>' + esc(intro.name) + '</h1><p class="role">' + esc(intro.role) + '</p><p class="headline">' + esc(intro.headline) + '</p></div>' + portrait + '</header>' + p(intro.description);
  body += '<h3>경력과 담당 범위</h3>' + (intro.experience || []).map(e => '<div class="experience"><div class="date">' + esc(e.period) + '</div><div><strong>' + esc(e.company + ' · ' + e.role) + '</strong>' + p(e.detail) + '</div></div>').join('');
  body += '<table class="responsibility"><thead><tr><th>프로젝트</th><th>역할</th><th>담당 업무</th></tr></thead><tbody>' + (data.projects || []).map(project => '<tr><td>' + esc(project.title) + '</td><td>' + esc(project.role) + '</td><td>' + esc(project.scope) + '</td></tr>').join('') + '</tbody></table>';
  body += '<h3>주요 기술</h3><div class="stack">' + (intro.stack || []).map(s => '<div><strong>' + esc(s.label) + '</strong>' + p(s.value) + '</div>').join('') + '</div>';
  body += '<p class="note">이후 화면은 담당 기능의 실제 프런트엔드 소스를 합성 데이터로 로컬 실행한 부분 캡처입니다.</p>';
  return chapter('01', '포트폴리오 / 소개와 역할', body);
}
function scenePages(scene, sceneIndex) {
  if (!scene.screens?.length) throw new Error('Scene has no captures: ' + scene.id);
  return scene.screens.map((screen, screenIndex) => {
    const continuation = scene.screens.length > 1 ? ' · 화면 ' + (screenIndex + 1) + '/' + scene.screens.length : '';
    let body = '<p class="eyebrow">' + esc(scene.scope) + '</p><h2 class="scene-title">' + esc(scene.title) + '</h2>';
    if (scene.lead) body += '<p class="lead">' + esc(scene.lead) + '</p>';
    body += '<h3 class="screen-title">' + esc(screen.title) + '</h3>';
    const limit = Math.max(70, Math.min(190, Number(screen.maxHeightMm) || (screen.large ? 150 : 120)));
    body += '<figure style="--capture-height:' + limit + 'mm"><div class="image-frame"><img src="' + raster(screen.file) + '" alt="' + esc(screen.title) + '"></div><figcaption>' + esc(screen.caption) + '</figcaption></figure>';
    if (screen.annotations?.length) body += '<div class="annotations">' + screen.annotations.map(a => '<div class="annotation"><strong>' + esc(a.label) + '</strong>' + p(a.detail) + '</div>').join('') + '</div>';
    if (screenIndex === scene.screens.length - 1) {
      if (scene.workflow?.length) body += '<p class="workflow-line"><strong>업무 흐름</strong> ' + scene.workflow.map(esc).join(' → ') + '</p>';
      if (scene.decisions?.length) body += '<div class="decisions"><h3>구현한 범위와 처리 조건</h3>' + bullets(scene.decisions) + '</div>';
    }
    return chapter(String(sceneIndex + 2).padStart(2, '0'), '포트폴리오 / 담당 기능' + continuation, body);
  }).join('');
}
const captureZoomScript = `<script>
document.querySelectorAll('figure img').forEach(function (capture) {
  capture.tabIndex = 0;
  capture.setAttribute('role', 'button');
  capture.setAttribute('aria-label', capture.alt + ' 크게 보기');
  capture.title = '캡처 크게 보기';
  function openCapture() {
    if (document.querySelector('.capture-dialog')) return;
    var dialog = document.createElement('dialog');
    dialog.className = 'capture-dialog';
    dialog.setAttribute('aria-label', capture.alt);
    var toolbar = document.createElement('div');
    toolbar.className = 'capture-toolbar';
    var label = document.createElement('strong'); label.textContent = capture.alt;
    var close = document.createElement('button'); close.type = 'button'; close.textContent = '닫기';
    toolbar.append(label, close);
    var full = document.createElement('img'); full.src = capture.src; full.alt = capture.alt;
    dialog.append(toolbar, full); document.body.append(dialog);
    var previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', function () {
      document.body.style.overflow = previousOverflow; dialog.remove(); capture.focus({preventScroll:true});
    });
    dialog.showModal();
  }
  capture.addEventListener('click', openCapture);
  capture.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCapture(); }
  });
});
</script>`;
function documentHtml(title, body, className) { return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><style>' + css + '</style></head><body><main class="' + esc(className) + '">' + body + '</main>' + captureZoomScript + '</body></html>'; }
function markdownBody() {
  const markdown = fs.readFileSync(careerFile, 'utf8');
  let body = markdown.split(/<!--\s*page-?break\s*-->|<div\s+class="page-break"\s*>\s*<\/div>/i).map(section => '<section class="doc-section">' + marked.parse(section, { gfm: true }) + '</section>').join('');
  body = body.replace(/<img\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*?)>/gi, (_, before, quote, src, after) => '<img' + before + 'src="' + raster(src, reviewDir) + '"' + after + '>');
  // Pair a standalone raster with the italic paragraph immediately below it.
  body = body.replace(/<p>\s*(<img\b[^>]*>)\s*<\/p>\s*<p>\s*<em>([\s\S]*?)<\/em>\s*<\/p>/gi, (_, img, caption) => '<figure><div class="image-frame">' + img + '</div><figcaption>' + caption + '</figcaption></figure>');
  body = body.replace(/<p>\s*(<img\b[^>]*>)\s*<\/p>/gi, (_, img) => '<figure><div class="image-frame">' + img + '</div></figure>');
  return body;
}
function assertNoExcludedText(html, label) { const text = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/data:[^\s"'<>)]*/gi, '').replace(/<[^>]+>/g, ' '); if (excluded.test(text)) throw new Error(label + ': excluded performance case remains'); }
async function inspectPdf(browser, pdf, label) {
  const pdfjs = process.env.PDFJS_MODULE || path.join(os.tmpdir(), 'fullstack-review-tools', 'node_modules', 'pdfjs-dist', 'build', 'pdf.js');
  if (!fs.existsSync(pdfjs)) throw new Error('PDF.js is needed for page preview QA: ' + pdfjs);
  const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
  try {
    await page.route(/^https?:\/\//, route => route.abort());
    await page.goto(pathToFileURL(pdf.replace(/\.pdf$/, '.html')).href);
    await page.addScriptTag({ path: pdfjs });
    const report = await page.evaluate(async ({ bytes, worker }) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
      const doc = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(bytes), c => c.charCodeAt(0)) }).promise;
      document.body.innerHTML = '<div id="proof" style="display:grid;grid-template-columns:repeat(3,330px);gap:16px;padding:12px;background:#dce2ec"></div>';
      const host = document.getElementById('proof');
      const report = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const sheet = await doc.getPage(i);
        const textContent = await sheet.getTextContent();
        const annotations = await sheet.getAnnotations();
        const viewport = sheet.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.id = 'pdf-' + i; canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.style.cssText = 'width:330px;height:auto;display:block;background:white'; host.append(canvas);
        await sheet.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        report.push({ page: i, text: textContent.items.map(item => item.str).join(''), characters: textContent.items.reduce((n,item) => n + item.str.length, 0), links: annotations.filter(a => a.url).map(a => a.url), rasterWidth: canvas.width, rasterHeight: canvas.height });
      }
      return report;
    }, { bytes: fs.readFileSync(pdf).toString('base64'), worker: pathToFileURL(path.join(path.dirname(pdfjs), 'pdf.worker.js')).href });
    await page.locator('#proof').screenshot({ path: path.join(qaDir, label + '-all.png') });
    for (const sheet of report) {
      const png = await page.locator('#pdf-' + sheet.page).evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
      fs.writeFileSync(path.join(qaDir, label + '-' + sheet.page + '.png'), Buffer.from(png, 'base64'));
      if (excluded.test(sheet.text)) throw new Error(label + ' page ' + sheet.page + ': excluded performance case remains');
      assertPublicDocument(sheet.text, label + ' page ' + sheet.page);
    }
    fs.writeFileSync(path.join(qaDir, label + '-pages.json'), JSON.stringify(report, null, 2) + '\n');
    return report;
  } finally { await page.close(); }
}
(async () => {
  if (!fs.existsSync(dataFile) || !fs.existsSync(careerFile)) throw new Error('Prepare portfolio/capture-content.json and the local-capture career Markdown before rendering.');
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  fs.mkdirSync(outputDir, { recursive: true }); fs.mkdirSync(qaDir, { recursive: true });
  const documents = [
    { label: 'portfolio', name: '진솔_포트폴리오_민간풀스택_로컬캡처본', html: publicHtml(documentHtml('진솔 | 풀스택 개발자 포트폴리오', overview(data) + (data.scenes || []).map(scenePages).join(''), 'portfolio')) },
    { label: 'career', name: '진솔_경력기술서_민간풀스택_로컬캡처본', html: publicHtml(documentHtml('진솔 | 풀스택 개발자 경력기술서', markdownBody(), 'career')) }
  ];
  const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
  const reports = [];
  try {
    for (const doc of documents) {
      assertPublicDocument(doc.html, doc.name); assertNoExcludedText(doc.html, doc.name);
      const htmlPath = path.join(outputDir, doc.name + '.html'); const pdfPath = path.join(outputDir, doc.name + '.pdf');
      fs.writeFileSync(htmlPath, doc.html, 'utf8');
      const page = await browser.newPage({ viewport: { width: 680, height: 1200 } });
      const blocked = [], errors = [];
      try {
        page.on('pageerror', e => errors.push(e.message));
        await page.route(/^https?:\/\//, route => { blocked.push(route.request().url()); return route.abort(); });
        await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
        await page.emulateMedia({ media: 'print' });
        const imageReport = await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); return [...document.images].map(img => ({ alt: img.alt, width: img.naturalWidth, height: img.naturalHeight, embedded: img.src.startsWith('data:') })); });
        if (errors.length || imageReport.some(img => !img.width || !img.height || !img.embedded)) throw new Error(doc.name + ': font/image loading failed: ' + errors.join(';'));
        await page.pdf({ path: pdfPath, format: 'A4', preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;text-align:center;font-family:Arial;font-size:8px;color:#697587"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
        await page.emulateMedia({ media: 'screen' }); await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('figure img').first().click();
        await page.locator('.capture-dialog[open]').waitFor();
        await page.locator('.capture-dialog img').evaluate(img => img.decode());
        await page.keyboard.press('Escape');
        await page.locator('.capture-dialog').waitFor({ state:'detached' });
        const mobile = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
        if (mobile.content > mobile.viewport + 2) throw new Error(doc.name + ': mobile horizontal overflow: ' + JSON.stringify(mobile));
        const pages = await inspectPdf(browser, pdfPath, doc.label);
        if (errors.length) throw new Error(doc.name + ': capture zoom failed: ' + errors.join(';'));
        reports.push({ label: doc.label, document: doc.name, pages: pages.length, html: htmlPath, pdf: pdfPath, images: imageReport, mobile, captureZoom:'opened and closed with Escape', blockedExternalRequests: blocked, browserErrors: errors });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(qaDir, 'documents.json'), JSON.stringify(reports, null, 2) + '\n');
    console.log(JSON.stringify(reports.map(r => ({ document:r.document, pages:r.pages, html:r.html, pdf:r.pdf, embeddedImages:r.images.length, mobile:r.mobile, blockedExternalRequests:r.blockedExternalRequests })), null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
