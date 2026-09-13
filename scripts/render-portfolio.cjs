// Public portfolio (3 pages) + career statement from page 4.
// Uses the same MARKED_MODULE / PLAYWRIGHT_MODULE / PDFJS_MODULE options as render-career.cjs.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { marked } = require(process.env.MARKED_MODULE || 'marked');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { fontCss } = require('./document-fonts.cjs');
const { publicHtml, assertPublicDocument } = require('./public-document.cjs');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'portfolio/content.json'), 'utf8'));
const styles = fontCss + ['career-print.css', 'portfolio-print.css'].map(file => fs.readFileSync(path.join(__dirname, file), 'utf8')).join('\n');
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const missingImages = new Set();
const assetCache = new Map();

function asset(relative) {
  if (!relative) return null;
  if (assetCache.has(relative)) return assetCache.get(relative);
  const file = path.resolve(root, relative);
  const within = path.relative(root, file);
  if (within.startsWith('..') || path.isAbsolute(within)) throw new Error('Asset must be inside workspace: ' + relative);
  if (!fs.existsSync(file)) {
    missingImages.add(relative);
    assetCache.set(relative, null);
    return null;
  }
  const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(file).toLowerCase()];
  if (!type) throw new Error('Unsupported image format: ' + relative);
  const value = 'data:' + type + ';base64,' + fs.readFileSync(file).toString('base64');
  assetCache.set(relative, value);
  return value;
}
function masthead(number, label) {
  return '<div class="page-masthead"><p class="kicker"><span class="folio-index">' + number + '</span>포트폴리오 <span class="masthead-label">/ ' + label + '</span></p><span class="folio-owner">' + escape(data.name) + ' · PORTFOLIO</span></div>';
}
function imageSlot(project) {
  const image = asset(data.images[project.image]);
  if (image) return '<div class="screenshot-frame"><div class="screenshot-bar"><span>' + escape(project.screen) + '</span><span>' + escape(project.access) + '</span></div><div class="screenshot"><img src="' + image + '" alt="' + escape(project.screen) + '"></div></div>';
  return '<div class="workflow"><p class="workflow-label">구현한 업무 흐름</p><ol>' + project.flow.map(step => '<li>' + escape(step) + '</li>').join('') + '</ol></div>';
}
function profilePage(full) {
  const portrait = asset(data.images.portrait);
  return '<section class="front-page" id="overview">' +
    masthead('01', '소개') + '<header class="profile-head"><div class="profile-copy"><div class="identity-line"><h1>' + escape(data.name) + '<span class="name-dot" aria-hidden="true">.</span></h1><p class="role">' + escape(data.role) + '</p></div><p class="headline">' + escape(data.headline) + '</p><p class="intro">' + escape(data.intro) + '</p></div>' +
    (portrait ? '<img class="portrait" src="' + portrait + '" alt="' + escape(data.name + ' 프로필 사진') + '">' : '') + '</header>' +
    '<div class="metric-grid">' + data.metrics.map(m => '<div class="metric"><b>' + escape(m.value) + '</b><span>' + escape(m.label) + '</span><small>' + escape(m.note) + '</small></div>').join('') + '</div>' +
    '<section class="p-section focus-section"><h2 class="section-title">이 포트폴리오에서 보여드릴 역량</h2>' + data.focus.map((f, i) => '<div class="focus-row"><span class="focus-index">0' + (i + 1) + '</span><div><h3>' + escape(f.title) + '</h3><p>' + escape(f.detail) + '</p></div></div>').join('') + '</section>' +
    '<section class="p-section"><h2 class="section-title">주요 기술</h2><div class="stack-grid">' + data.stack.map(s => '<div><strong>' + escape(s.label) + '</strong><p>' + escape(s.value) + '</p></div>').join('') + '</div></section>' +
    '<p class="page-end reading-guide">' + (full ? '01–03  포트폴리오 소개 <span>04부터  경력기술서</span>' : '01  소개 <span>02  대표 프로젝트</span><span>03  문제 해결 사례</span>') + '</p></section>';
}
function projectCard(p, full) {
  return '<article class="project-card">' +
    '<div class="project-heading"><h3><span class="project-number">' + escape(p.number) + '</span>' + escape(p.name) + '</h3><small>' + escape(p.role + ' · ' + p.period) + '</small></div>' +
    '<p class="project-label">' + escape(p.stack + ' · ' + p.access) + '</p>' + imageSlot(p) +
    '<p class="caption">' + escape(p.caption) + '</p><p class="project-description">' + escape(p.description) + '</p>' +
    '<p class="project-scope"><strong>담당</strong> ' + escape(p.scope) + '</p>' +
    (full ? '<div class="project-actions"><a class="project-link" href="#' + escape(p.anchor) + '"><span class="project-link-icon" aria-hidden="true">&#8594;</span>상세 경력</a></div>' : '') + '</article>';
}
function projectsPage(full) {
  return '<section class="front-page" id="projects">' + masthead('02', '대표 프로젝트') + '<h2 class="page-title">직접 구축하고 개선한 세 가지 서비스<span class="title-dot">.</span></h2>' +
    '<p class="page-lead">공개 홈페이지와 사내 업무 도구를 화면·API·데이터까지 연결했습니다.</p>' +
    '<div class="project-grid">' + data.projects.map(p => projectCard(p, full)).join('') + '</div>' +
    '<div class="page-end"><p class="document-note">화면은 실제 서비스 캡처이며, 의뢰인 정보는 테스트 데이터로 대체하거나 가렸습니다.</p></div></section>';
}
function casesPage(full) {
  return '<section class="front-page last-summary" id="engineering">' + masthead('03', '문제 해결 사례') + '<h2 class="page-title">화면·상태·데이터를 함께 설계합니다<span class="title-dot">.</span></h2><p class="page-lead">공통 UI와 상태 공유, Next.js 첫 화면, 업무 데이터 조회의 문제를 해결했습니다.</p>' +
    data.cases.map(c => '<article class="case-card"><div class="case-top"><span class="case-tag">' + escape(c.number + ' / ' + c.tag) + '</span><span class="case-metric">' + escape(c.metric) + '</span></div><h3>' + escape(c.title) + '</h3><p class="case-context">' + escape(c.context) + '</p><dl><dt>문제</dt><dd>' + escape(c.problem) + '</dd><dt>판단</dt><dd>' + escape(c.decision) + '</dd><dt>결과</dt><dd>' + escape(c.result) + '</dd></dl>' + (full ? '<p class="case-ref"><a href="#' + escape(c.anchor) + '">경력기술서에서 구현 상세 →</a></p>' : '') + '</article>').join('') +
    '<div class="page-end portfolio-end"><span>포트폴리오 끝</span>' + (full ? '<strong>다음 페이지부터 경력기술서 →</strong>' : '<strong>대표 프로젝트와 문제 해결 사례 요약</strong>') + '</div></section>';
}
function appendix() {
  const md = fs.readFileSync(path.join(root, '경력기술서_TMI.md'), 'utf8');
  const index = md.indexOf('# 법무법인 법승 (');
  if (index < 0) throw new Error('Cannot find the detailed career section in TMI source');
  let html = marked.parse(md.slice(index), { gfm: true, breaks: false });
  const ids = { I: 'detail-case', II: 'detail-homepage', III: 'detail-crm', IV: 'detail-legacy', V: 'detail-infra' };
  html = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (match, title) => {
    const numeral = title.match(/^([IVX]+)\./)?.[1];
    return ids[numeral] ? '<h2 id="' + ids[numeral] + '">' + title + '</h2>' : match;
  });
  html = html.replace('<h1>리얼타임테크 (공간정보융합팀)</h1>', '<h1 id="detail-previous">리얼타임테크 (공간정보융합팀)</h1>');
  html = html.replace(/<p><strong>(\d+\)[\s\S]*?)<\/strong><\/p>/g, '<h4>$1</h4>');
  html = html.replace(/<p><img src="([^"]+)" alt="([^"]*)"><\/p>/g, (_, src, alt) => {
    const image = asset(decodeURIComponent(src));
    if (!image) throw new Error('Missing architecture image: ' + src);
    return '<figure><img src="' + image + '" alt="' + alt + '"></figure>';
  });
  html = html.replace(/<li><strong>근거<\/strong>([\s\S]*?)<\/li>/g, '<li class="evidence"><strong>근거</strong>$1</li>');
  html = html.replace(/<p><strong>([^<]+)<\/strong><\/p>/g, '<p class="label"><strong>$1</strong></p>');
  return '<article class="appendix" id="details"><header class="career-opening"><p class="kicker">PART 02 · CAREER EXPERIENCE</p><h1 class="career-title">경력기술서<span class="title-dot">.</span></h1><p>근무 이력과 프로젝트별 담당 업무 · 기술적 의사결정 · 성과</p><nav class="detail-nav" aria-label="경력기술서 목차">' + data.appendix.map(a => '<a href="#' + escape(a.anchor) + '">' + escape(a.label) + '</a>').join('') + '</nav></header>' + html + '</article>';
}
function documentHtml(full) {
  const title = full ? '진솔 — 포트폴리오·경력기술서' : '진솔 — 포트폴리오 요약';
  const html = publicHtml('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + title + '</title><style>' + styles + '</style></head><body><main>' + profilePage(full) + projectsPage(full) + casesPage(full) + (full ? appendix() : '') + '</main></body></html>');
  assertPublicDocument(html, title);
  return html;
}

async function inspectPdf(browser, htmlFile, pdfFile, label, qaDir) {
  if (!process.env.PDFJS_MODULE) return null;
  const modulePath = require.resolve(process.env.PDFJS_MODULE);
  const page = await browser.newPage({ viewport: { width: 1160, height: 900 } });
  try {
    await page.goto(pathToFileURL(htmlFile).href);
    await page.addScriptTag({ path: modulePath });
    const report = await page.evaluate(async ({ encoded, worker }) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
      const doc = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(encoded), c => c.charCodeAt(0)) }).promise;
      document.body.innerHTML = '<div id="proof"></div>';
      const host = document.getElementById('proof');
      host.style.cssText = 'width:1120px;display:grid;grid-template-columns:repeat(3,350px);gap:20px;padding:15px;background:#e2e8f0;';
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const { items } = await p.getTextContent();
        const lines = items.filter(x => x.str.trim() && x.transform[5] > 32);
        const annotations = await p.getAnnotations();
        const text = items.map(x => x.str).join('');
        const externalUrls = annotations.filter(a => a.url).map(a => a.url);
        pages.push({ page: i, characters: lines.reduce((sum, x) => sum + x.str.length, 0), top: lines.map(x => x.str).join('').slice(0,140), minY: Math.min(...lines.map(x => x.transform[5])), externalLinks: externalUrls.length, internalLinks: annotations.filter(a => a.dest).length, text, externalUrls });
        const canvas = document.createElement('canvas');
        canvas.id = 'proof-' + i;
        const viewport = p.getViewport({ scale: 1.4 });
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.style.cssText = 'width:350px;height:auto;display:block;background:white;';
        host.append(canvas);
        await p.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      }
      return pages;
    }, { encoded: fs.readFileSync(pdfFile).toString('base64'), worker: pathToFileURL(path.join(path.dirname(modulePath), 'pdf.worker.js')).href });
    await page.locator('#proof').screenshot({ path: path.join(qaDir, label + '-all.png') });
    const previewPages = new Set([1, 2, 3, 4, report.length - 1, report.length].filter(i => i > 0 && i <= report.length));
    for (const i of previewPages) {
      const png = await page.locator('#proof-' + i).evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
      fs.writeFileSync(path.join(qaDir, label + '-' + i + '.png'), Buffer.from(png, 'base64'));
    }
    fs.writeFileSync(path.join(qaDir, label + '-pages.json'), JSON.stringify(report, null, 2));
    if (report.some(p => p.characters < 120)) throw new Error(label + ': nearly empty page');
    if (label === 'summary' && report.length !== 3) throw new Error('Summary must be exactly 3 pages, got ' + report.length);
    for (const p of report) {
      assertPublicDocument(p.text + '\n' + p.externalUrls.join('\n'), label + ' page ' + p.page);
      if (p.externalLinks) throw new Error(label + ': unexpected external PDF link on page ' + p.page);
      if (/2025\s*[.\-/]\s*0?4\b/.test(p.text)) throw new Error(label + ': removed start date remains');
    }
    if (report[0].internalLinks || report[0].externalLinks) throw new Error('Page 1 must contain no links');
    if (report.slice(0,3).some(p => !p.top.replace(/\s+/g, '').includes('포트폴리오'))) throw new Error('First 3 pages must identify as portfolio');
    if (label === 'full' && !report[3]?.top.replace(/\s+/g, '').includes('경력기술서')) throw new Error('Career statement must start on page 4');
    if (label === 'full' && report.slice(3).some(p => /개인\s*포트폴리오|PERSONAL\s*PORTFOLIO/.test(p.text))) throw new Error('Portfolio content must not follow career statement');
    if (label === 'full' && report.slice(0,3).reduce((sum,p) => sum + p.internalLinks,0) < 6) throw new Error('Missing internal PDF navigation');
    return report;
  } finally { await page.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
  const qaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-qa-'));
  try {
    for (const [label, full, basename] of [
      ['summary', false, '진솔_포트폴리오_요약'],
      ['full', true, '진솔_포트폴리오_경력기술서']
    ]) {
      const htmlFile = path.join(root, basename + '.html');
      const stagedPdf = path.join(qaDir, basename + '.pdf');
      fs.writeFileSync(htmlFile, documentHtml(full));
      const page = await browser.newPage({ viewport: { width: 680, height: 1005 }, deviceScaleFactor: 1 });
      try {
        await page.route(/^https?:\/\//, route => route.abort());
        await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
        await page.emulateMedia({ media: 'print' });
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images, img => img.decode())); });
        const errors = await page.evaluate(() => {
          const errors = [];
          for (const section of document.querySelectorAll('.front-page')) {
            if (section.scrollHeight > section.clientHeight + 2) errors.push(section.id + ': vertical overflow ' + section.scrollHeight + '/' + section.clientHeight);
            for (const child of section.querySelectorAll('*')) {
              const a = child.getBoundingClientRect(), b = section.getBoundingClientRect();
              if (a.right > b.right + 2 || a.left < b.left - 2) errors.push(section.id + ': horizontal overflow in ' + child.tagName);
            }
          }
          for (const link of document.querySelectorAll('a[href^="#"]')) {
            if (!document.getElementById(decodeURIComponent(link.hash.slice(1)))) errors.push('Missing destination ' + link.hash);
          }
          if (Array.from(document.images).some(img => !img.complete || img.naturalWidth === 0)) errors.push('Image decode failed');
          return errors;
        });
        if (errors.length) throw new Error(errors.join('\n'));
        // Exercise the optional portrait layout even when no real photo has been supplied.
        const portraitFits = await page.evaluate(() => {
          if (document.querySelector('.portrait')) return true;
          const img = document.createElement('div');
          img.className = 'portrait';
          img.style.flexShrink = '0';
          document.querySelector('.profile-head').append(img);
          const section = document.getElementById('overview');
          const fits = section.scrollHeight <= section.clientHeight + 2;
          img.remove();
          return fits;
        });
        if (!portraitFits) throw new Error('Optional portrait overflows page 1');
        await page.pdf({ path: stagedPdf, format: 'A4', preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-family:Arial,sans-serif;font-size:8px;color:#64748b;width:100%;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
      } finally { await page.close(); }
      const report = await inspectPdf(browser, htmlFile, stagedPdf, label, qaDir);
      const pdfFile = path.join(root, basename + '.pdf');
      fs.copyFileSync(stagedPdf, pdfFile);
      console.log(JSON.stringify({ label, html: htmlFile, pdf: pdfFile, pages: report?.length, contentByPage: report?.map(p => ({ page:p.page, characters:p.characters, internalLinks:p.internalLinks })) }));
    }
    console.log(JSON.stringify({ qaDir, missingImages: Array.from(missingImages), note: 'Projects without screenshots show their implemented workflow; images and fonts are embedded.' }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
