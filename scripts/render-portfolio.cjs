// Portfolio summary (3 pages) + detailed career appendix from the existing TMI source.
// Uses the same MARKED_MODULE / PLAYWRIGHT_MODULE / PDFJS_MODULE options as render-career.cjs.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { marked } = require(process.env.MARKED_MODULE || 'marked');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'portfolio/content.json'), 'utf8'));
const styles = ['career-print.css', 'portfolio-print.css'].map(file => fs.readFileSync(path.join(__dirname, file), 'utf8')).join('\n');
const repoUrl = 'https://github.com/sorrybro2/weekly-dev-log/blob/main/';
const sourceUrl = file => repoUrl + file.split('/').map(part => encodeURIComponent(decodeURIComponent(part))).join('/');
const detailUrl = sourceUrl('경력기술서_TMI.md');
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
function detailLink(anchor, full) { return full ? '#' + anchor : detailUrl; }
function imageSlot(project) {
  const image = asset(data.images[project.image]);
  const content = image
    ? '<img src="' + image + '" alt="' + escape(project.screen) + '">'
    : '<div class="image-placeholder" role="img" aria-label="' + escape(project.screen + ' 캡처 자리') + '"><span class="frame-icon" aria-hidden="true"></span><strong>' + escape(project.screen) + '</strong><small>화면 캡처 영역</small></div>';
  return '<div class="screenshot">' + content + '</div>';
}
function profilePage() {
  const portrait = asset(data.images.portrait);
  const contact = data.contactEmail ? '<div class="link-row"><strong>연락처</strong><a href="mailto:' + escape(data.contactEmail) + '">' + escape(data.contactEmail) + '</a></div>' : '';
  return '<section class="front-page" id="overview">' +
    '<p class="kicker">PORTFOLIO / CAREER</p><header class="profile-head"><div class="profile-copy"><h1>' + escape(data.name) + '</h1><p class="role">' + escape(data.role) + '</p><p class="headline">' + escape(data.headline) + '</p><p class="intro">' + escape(data.intro) + '</p></div>' +
    (portrait ? '<img class="portrait" src="' + portrait + '" alt="' + escape(data.name + ' 프로필 사진') + '">' : '') + '</header>' +
    '<div class="metric-grid">' + data.metrics.map(m => '<div class="metric"><b>' + escape(m.value) + '</b><span>' + escape(m.label) + '</span><small>' + escape(m.note) + '</small></div>').join('') + '</div>' +
    '<section class="p-section"><h2 class="section-title">경력</h2>' + data.experience.map(e => '<div class="experience-row"><div><strong>' + escape(e.company) + '</strong><small>' + escape(e.period) + '</small></div><div><strong>' + escape(e.position) + '</strong><p>' + escape(e.detail) + '</p></div></div>').join('') + '</section>' +
    '<section class="p-section"><h2 class="section-title">프로젝트별 담당 범위</h2><table class="role-table"><tbody>' +
    data.projects.map(p => '<tr><td>' + escape(p.name) + '</td><td>' + escape(p.role) + '</td><td>' + escape(p.scope) + '</td></tr>').join('') + '</tbody></table></section>' +
    '<section class="p-section"><h2 class="section-title">주요 기술</h2><div class="stack-grid">' + data.stack.map(s => '<div><strong>' + escape(s.label) + '</strong><p>' + escape(s.value) + '</p></div>').join('') + '</div></section>' +
    '<div class="page-end link-list">' + data.links.map(l => '<div class="link-row"><strong>' + escape(l.label) + '</strong><a href="' + escape(l.url) + '">' + escape(l.text) + '</a></div>').join('') + contact + '</div></section>';
}
function projectCard(p, full, wide) {
  return '<article class="' + (wide ? 'project-wide' : 'project-small') + '">' +
    '<div class="project-heading"><h3>' + escape(p.number + '. ' + p.name) + '</h3><small>' + escape(p.role + ' · ' + p.period) + '</small></div>' +
    '<p class="project-label">' + escape(p.stack + ' · ' + p.access) + '</p>' + imageSlot(p) +
    '<p class="caption">' + escape(p.caption) + '</p><p class="project-description">' + escape(p.description) + '</p>' +
    '<p class="project-scope"><strong>담당</strong> ' + escape(p.scope) + '</p>' +
    (p.url ? '<a class="project-link" href="' + escape(p.url) + '">서비스 보기 · ' + escape(p.url.replace('https://', '')) + '</a> &nbsp; ' : '') +
    '<a class="project-link" href="' + escape(detailLink(p.anchor, full)) + '">상세 경력 보기 →</a></article>';
}
function projectsPage(full) {
  return '<section class="front-page" id="projects"><p class="kicker">SELECTED PROJECTS</p><h2 class="page-title">직접 구현한 서비스와 업무 화면</h2>' +
    '<p class="page-lead">공개 홈페이지와 사내 업무 도구를 화면·API·데이터까지 연결했습니다.</p>' +
    projectCard(data.projects[0], full, true) + '<div class="project-grid">' + data.projects.slice(1).map(p => projectCard(p, full, false)).join('') + '</div>' +
    '<div class="page-end"><p class="document-note">홈페이지는 공개 URL로 확인할 수 있습니다. 사내 시스템은 화면과 담당 기능을 중심으로 소개합니다.</p></div></section>';
}
function casesPage(full) {
  return '<section class="front-page' + (full ? '' : ' last-summary') + '" id="engineering"><p class="kicker">ENGINEERING DECISIONS</p><h2 class="page-title">문제에서 설계 판단과 결과까지</h2><p class="page-lead">기능 구현에 더해 조회 성능, 데이터 이전, 다중 사용자 환경의 문제를 해결했습니다.</p>' +
    data.cases.map(c => '<article class="case-card"><div class="case-top"><span class="case-tag">' + escape(c.number + ' / ' + c.tag) + '</span><span class="case-metric">' + escape(c.metric) + '</span></div><h3>' + escape(c.title) + '</h3><p class="case-context">' + escape(c.context) + '</p><dl><dt>문제</dt><dd>' + escape(c.problem) + '</dd><dt>판단</dt><dd>' + escape(c.decision) + '</dd><dt>결과</dt><dd>' + escape(c.result) + '</dd></dl><p class="case-ref"><a href="' + escape(detailLink(c.anchor, full)) + '">구현 상세 →</a>' + (c.source ? ' &nbsp; <a href="' + escape(sourceUrl(c.source)) + '">업무 기록 ↗</a>' : '') + '</p></article>').join('') +
    '<div class="page-end"><h3 class="section-title">' + (full ? '이어지는 상세 경력기술서' : '프로젝트별 상세 기록') + '</h3><nav class="detail-nav" aria-label="상세 경력 목차">' + data.appendix.map(a => '<a href="' + escape(detailLink(a.anchor, full)) + '">' + escape(a.label) + '</a>').join('') + '</nav></div></section>';
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
  html = html.replace(/href="((?:daily|weekly)\/[^"]+)"/g, (_, file) => 'href="' + escape(sourceUrl(file)) + '"');
  return '<article class="appendix" id="details"><p class="kicker">DETAILED EXPERIENCE</p>' + html + '</article>';
}
function documentHtml(full) {
  const title = full ? '진솔 — 포트폴리오·경력기술서' : '진솔 — 포트폴리오 요약';
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + title + '</title><style>' + styles + '</style></head><body><main>' + profilePage() + projectsPage(full) + casesPage(full) + (full ? appendix() : '') + '</main></body></html>';
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
        pages.push({ page: i, characters: lines.reduce((sum, x) => sum + x.str.length, 0), top: lines.slice(0,4).map(x => x.str).join(' '), minY: Math.min(...lines.map(x => x.transform[5])), externalLinks: annotations.filter(a => a.url).length, internalLinks: annotations.filter(a => a.dest).length });
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
    for (let i = 1; i <= Math.min(report.length, 4); i++) {
      const png = await page.locator('#proof-' + i).evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
      fs.writeFileSync(path.join(qaDir, label + '-' + i + '.png'), Buffer.from(png, 'base64'));
    }
    fs.writeFileSync(path.join(qaDir, label + '-pages.json'), JSON.stringify(report, null, 2));
    if (report.some(p => p.characters < 120)) throw new Error(label + ': nearly empty page');
    if (label === 'summary' && report.length !== 3) throw new Error('Summary must be exactly 3 pages, got ' + report.length);
    if (label === 'full' && !report[3]?.top.replace(/\s+/g, '').includes('DETAILEDEXPERIENCE')) throw new Error('Detailed section must start on page 4');
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
    console.log(JSON.stringify({ qaDir, missingImages: Array.from(missingImages), note: 'Missing project images use labeled capture slots; missing portrait stays hidden.' }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
