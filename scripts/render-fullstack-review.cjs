// Produce new review artifacts only; existing exports are never overwritten.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
function dependency(name, env) {
  if (process.env[env]) return require(process.env[env]);
  try { return require(name); } catch {
    return require(path.join(os.tmpdir(), 'fullstack-review-tools', 'node_modules', name));
  }
}
const { chromium } = dependency('playwright', 'PLAYWRIGHT_MODULE');
const { marked } = dependency('marked', 'MARKED_MODULE');
const { fontCss } = require('./document-fonts.cjs');
const { publicHtml, assertPublicDocument } = require('./public-document.cjs');
const root = path.resolve(__dirname, '..');
const reviewDir = path.join(root, '경력기술서', '검토');
const outputDir = path.join(root, '경력기술서', '출력');
const qaDir = path.join(reviewDir, '미리보기');
const css = fontCss + fs.readFileSync(path.join(__dirname, 'fullstack-review.css'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'review-fullstack.json'), 'utf8'));
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const p = value => '<p>' + esc(value) + '</p>';
const bullets = values => '<ul>' + values.map(v => '<li>' + esc(v) + '</li>').join('') + '</ul>';
function asset(relative) {
  const file = path.resolve(root, relative);
  const within = path.relative(root, file);
  if (within.startsWith('..') || path.isAbsolute(within)) throw new Error('Asset outside workspace');
  const type = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(file)];
  if (!type) throw new Error('Unsupported image asset');
  return 'data:' + type + ';base64,' + fs.readFileSync(file).toString('base64');
}
function mast(number, label) {
  return '<div class="mast"><span><span class="index">' + esc(number) + '</span>포트폴리오 / ' + esc(label) + '</span><span class="owner">진솔 · FULL STACK</span></div>';
}
function page(number, label, body, note) {
  return '<section class="folio" id="page-' + number + '">' + mast(number, label) + body + '<div class="endnote">' + esc(note) + '</div></section>';
}
function flow(values) {
  return values.map((v, i) => (i ? '<div class="flow-arrow" aria-hidden="true">↓</div>' : '') + '<div class="flow-node">' + esc(v) + '</div>').join('');
}
function comparison(diagram, beforeLabel = '변경 전', afterLabel = '변경 후') {
  return '<div class="comparison"><div class="flow-panel"><strong>' + esc(beforeLabel) + '</strong>' + flow(diagram.before) + '</div><div class="flow-panel"><strong>' + esc(afterLabel) + '</strong>' + flow(diagram.after) + '</div></div>';
}
function caseBlock(label, text) { return '<div class="case-block"><h3>' + esc(label) + '</h3>' + p(text) + '</div>'; }
function overview() {
  const i = data.intro;
  const capabilities = [
    { title: '화면과 업무 동선', detail: '작성과 발행 · 상담과 발송 · 구성원 관리' },
    { title: '원본과 서비스 연동', detail: 'CRM · Google Workspace · 레거시 병행' },
    { title: '권한과 운영', detail: '변경 확인 · 충돌 처리 · GCP 배포' }
  ];
  let body = '<header class="profile"><div class="copy"><h1>' + esc(i.name) + '</h1><p class="role">' + esc(i.role) + '</p><p class="headline">' + esc(i.headline) + '</p></div><img class="portrait" src="' + asset('assets/portfolio/profile.jpg') + '" alt="진솔 프로필 사진"></header>' + p(i.description);
  body += '<div class="capabilities">' + capabilities.map(c => '<div><strong>' + esc(c.title) + '</strong>' + p(c.detail) + '</div>').join('') + '</div>';
  body += '<h3>경력과 담당 범위</h3>' + i.experience.map(e => '<div class="experience"><div class="date">' + esc(e.period) + '</div><div><strong>' + esc(e.company + ' · ' + e.role) + '</strong>' + p(e.detail) + '</div></div>').join('');
  body += '<h3>주요 기술</h3><div class="stack">' + i.stack.map(s => '<div><strong>' + esc(s.label) + '</strong>' + p(s.value) + '</div>').join('') + '</div>';
  return page('01', '소개와 역할', body, '02 담당 프로젝트 → 03 구성원 업무 → 04 콘텐츠 운영 → 05 상담과 결재');
}
function projects() {
  let body = '<p class="eyebrow">RESPONSIBILITY & PRODUCTS</p><h2 class="case-title">직접 맡은 범위를<br>프로젝트별로 구분합니다.</h2>';
  body += data.projects.slice(0,3).map((project, i) => '<article class="project"><h3>' + esc('0' + (i + 1) + ' ' + project.title) + '</h3><div class="meta">' + esc(project.period + ' · ' + project.role + ' · ' + project.status) + '</div>' + p(project.description) + '<p class="scope"><strong>담당</strong> ' + esc(project.scope) + '</p><p class="stackline">' + esc(project.stack) + '</p>' + (project.url ? '<a href="' + esc(project.url) + '">공개 서비스 보기 ↗</a>' : '') + '</article>').join('');
  const portal = data.projects[3];
  body += '<aside class="small-project"><strong>' + esc(portal.title + ' · ' + portal.role) + '</strong>' + p(portal.description) + '</aside>';
  return page('02', '담당 프로젝트', body, 'RAG 상담봇은 홈페이지 V2의 내부 모듈이며 직원 대상 시범 운영입니다.');
}
function fullCase(index, number, label) {
  const c = data.cases[index];
  let body = '<p class="eyebrow">' + esc(c.scope) + '</p><h2 class="case-title">' + esc(c.title) + '</h2><p class="lead">' + esc(c.headline) + '</p>';
  body += '<div class="metricbar"><span class="result">' + esc(c.result) + '</span><span class="scope">' + esc(c.measurement || c.scope) + '</span></div>';
  body += index === 1
    ? '<div class="steps signal-flow">' + c.diagram.after.map((step, i) => '<div class="step"><small>0' + (i + 1) + '</small>' + esc(step) + '</div>').join('') + '</div>'
    : comparison(c.diagram);
  body += caseBlock('문제와 원인', c.problem + ' ' + c.cause);
  body += caseBlock('선택한 구조', c.decision);
  body += '<h3>구현과 처리 조건</h3>' + bullets(c.implementation);
  if (c.tradeoff) body += caseBlock('적용 범위와 한계', c.tradeoff);
  return page(number, label, body, c.evidence);
}
function workflowCases() {
  let body = '<p class="eyebrow">CUSTOMER & DOCUMENT WORKFLOWS</p><h2 class="case-title">상담과 결재를<br>처리 순서에 맞춰 구현합니다.</h2>';
  body += data.cases.slice(2).map(c => '<article class="split-case"><div class="eyebrow">' + esc(c.scope) + '</div><h3>' + esc(c.title) + '</h3><div class="result">' + esc(c.result) + '</div>' + p(c.problem + ' ' + c.cause) + '<p><strong>설계</strong> ' + esc(c.decision) + '</p>' + bullets(c.implementation) + '<p class="evidence">' + esc(c.evidence) + '</p></article>').join('');
  return page('05', '상담과 결재', body, '화면 입력과 업무 상태, 외부 연동을 함께 다룬 구현 사례입니다.');
}
function html(title, body, className = '') {
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><style>' + css + '</style></head><body><main class="' + esc(className) + '">' + body + '</main></body></html>';
}
function markdownDocument(file, title, className) {
  const sourcePath = path.join(reviewDir, file);
  const md = fs.readFileSync(sourcePath, 'utf8');
  // Explicit boundaries keep separate project narratives together without shrinking type.
  const sections = md.split(/<!--\s*page-?break\s*-->|<div\s+class="page-break"\s*>\s*<\/div>/i);
  let body = sections.map(section => '<section class="doc-page">' + marked.parse(section, { gfm: true }) + '</section>').join('');
  if (className === 'review') {
    body = body.replace('<section class="doc-page">', '<section class="doc-page"><p class="intro-label">내부 검토용 · 민간 풀스택 개발자 이직 · 2026.10.12</p>');
    body = body.replace(/href="(?!https?:|#|data:)([^"]+)"/g, (_, href) => 'href="' + esc(pathToFileURL(path.resolve(reviewDir, decodeURIComponent(href))).href) + '"');
  }
  const result = html(title, body, className);
  return className === 'career' ? publicHtml(result) : result;
}
async function inspectPdf(browser, pdf, label) {
  const pdfjs = process.env.PDFJS_MODULE || path.join(os.tmpdir(), 'fullstack-review-tools', 'node_modules', 'pdfjs-dist', 'build', 'pdf.js');
  const page = await browser.newPage({ viewport: { width: 1050, height: 900 } });
  try {
    await page.goto(pathToFileURL(pdf.replace(/\.pdf$/, '.html')).href);
    await page.addScriptTag({ path: pdfjs });
    const report = await page.evaluate(async ({ bytes, worker }) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
      const doc = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(bytes), c => c.charCodeAt(0)) }).promise;
      document.body.innerHTML = '<div id="proof" style="display:grid;grid-template-columns:repeat(3,320px);gap:16px;padding:12px;background:#dce2ec"></div>';
      const host = document.getElementById('proof');
      const report = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const pdfPage = await doc.getPage(i);
        const content = await pdfPage.getTextContent();
        const annotations = await pdfPage.getAnnotations();
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.id = 'pdf-' + i;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.cssText = 'width:320px;height:auto;display:block;background:white';
        host.append(canvas);
        await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        report.push({ page: i, text: content.items.map(x => x.str).join(''), links: annotations.filter(a => a.url).map(a => a.url), characters: content.items.reduce((sum,x) => sum + x.str.length, 0) });
      }
      return report;
    }, { bytes: fs.readFileSync(pdf).toString('base64'), worker: pathToFileURL(path.join(path.dirname(pdfjs), 'pdf.worker.js')).href });
    await page.locator('#proof').screenshot({ path: path.join(qaDir, label + '-all.png') });
    for (const r of report) {
      const png = await page.locator('#pdf-' + r.page).evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
      fs.writeFileSync(path.join(qaDir, label + '-' + r.page + '.png'), Buffer.from(png, 'base64'));
    }
    fs.writeFileSync(path.join(qaDir, label + '-pages.json'), JSON.stringify(report, null, 2));
    if (report.some(r => r.characters < 100)) throw new Error(label + ': nearly empty page');
    return report;
  } finally { await page.close(); }
}
(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(qaDir, { recursive: true });
  const portfolio = publicHtml(html('진솔 | 풀스택 개발자 포트폴리오', overview() + projects() + fullCase(0,'03','구성원 업무') + fullCase(1,'04','콘텐츠 운영') + workflowCases()));
  const documents = [
    { label: 'portfolio', name: '진솔_포트폴리오_민간풀스택_개선본', html: portfolio, public: true, expected: data.cases.length + 1 },
    { label: 'career', name: '진솔_경력기술서_민간풀스택_개선본', html: markdownDocument('민간풀스택_경력기술서_개선본.md', '진솔 | 풀스택 개발자 경력기술서', 'career'), public: true },
    { label: 'review', name: '진솔_포트폴리오_경력기술서_평가_2026-10-12', html: markdownDocument('포트폴리오_경력기술서_평가_2026-10-12.md', '포트폴리오와 경력기술서 평가 | 2026.10.12', 'review'), public: false }
  ];
  const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
  const reports = [];
  try {
    for (const doc of documents) {
      if (doc.public) assertPublicDocument(doc.html, doc.name);
      const htmlPath = path.join(outputDir, doc.name + '.html');
      const pdfPath = path.join(outputDir, doc.name + '.pdf');
      fs.writeFileSync(htmlPath, doc.html);
      // Match the A4 printable width (210mm - 15mm margins on both sides).
      const page = await browser.newPage({ viewport: { width: 680, height: 1200 } });
      try {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route(/^https?:\/\//, route => route.abort());
        await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
        await page.emulateMedia({ media: 'print' });
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
        const overflow = await page.locator('.folio').evaluateAll(pages => pages.filter(p => p.scrollHeight > p.clientHeight + 2).map(p => ({ id: p.id, height: p.clientHeight, content: p.scrollHeight })));
        if (overflow.length) throw new Error(doc.name + ' page overflow: ' + JSON.stringify(overflow));
        if (errors.length) throw new Error(errors.join('\n'));
        await page.pdf({ path: pdfPath, format: 'A4', preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;text-align:center;font-family:Arial;font-size:8px;color:#697587"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
        await page.emulateMedia({ media: 'screen' });
        await page.setViewportSize({ width: 390, height: 844 });
        const mobile = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
        if (mobile.content > mobile.width + 2) throw new Error(doc.name + ': mobile horizontal overflow');
      } finally { await page.close(); }
      const report = await inspectPdf(browser, pdfPath, doc.label);
      if (report.some(r => /8\s*초|0\s*\.\s*05\s*초|160\s*배|\bFDW\b/i.test(r.text))) throw new Error(doc.name + ': excluded performance example remains');
      if (doc.expected && report.length !== doc.expected) throw new Error(doc.name + ': expected ' + doc.expected + ' pages, got ' + report.length);
      if (doc.public) report.forEach(r => assertPublicDocument(r.text, doc.name + ' page ' + r.page));
      reports.push({ document: doc.name, pages: report.length, html: htmlPath, pdf: pdfPath });
    }
    fs.writeFileSync(path.join(qaDir, 'documents.json'), JSON.stringify(reports, null, 2));
    console.log(JSON.stringify(reports, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
