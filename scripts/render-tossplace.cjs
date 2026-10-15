// 토스플레이스 Node.js Developer 지원 자료: 이력서·경력기술서(A4)와 포트폴리오(16:9).
// 문안은 tossplace-content.cjs, 수치 근거는 portfolio/프로젝트_지표.md.
// 사용: node scripts/render-tossplace.cjs [resume|deck]
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const deps = path.join(os.tmpdir(), 'fullstack-review-tools', 'node_modules');
function dependency(name, key) {
  if (process.env[key]) return require(process.env[key]);
  try { return require(name); } catch { return require(path.join(deps, name)); }
}
const { chromium } = dependency('playwright', 'PLAYWRIGHT_MODULE');
const { fontCss } = require('./document-fonts.cjs');
const { publicHtml, assertPublicDocument } = require('./public-document.cjs');
const { person, resume, deck } = require('./tossplace-content.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output', 'pdf', '토스플레이스');
const proof = path.join(root, 'tmp', 'pdfs', 'tossplace');
const assets = path.join(root, 'assets', 'portfolio');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// `코드` → code, \n → 줄바꿈. 그 밖의 마크업은 쓰지 않는다.
const rich = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error('PNG only: ' + file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function dataUri(rel) {
  const file = path.join(assets, rel);
  return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
}
// crop = [x, y, w, h] (원본 픽셀). 상자 비율을 자른 영역에 맞추고 이미지를 옮겨 보여준다.
function shot(rel, { crop, alt = '', cls = '' } = {}) {
  const { w, h } = pngSize(path.join(assets, rel));
  const [x, y, cw, ch] = crop || [0, 0, w, h];
  const style = `aspect-ratio:${cw}/${ch}`;
  const img = `width:${(w / cw * 100).toFixed(3)}%;left:${(-x / cw * 100).toFixed(3)}%;top:${(-y / ch * 100).toFixed(3)}%`;
  return `<div class="shot ${cls}" style="${style}"><img src="${dataUri(rel)}" alt="${esc(alt)}" style="${img}"></div>`;
}

// 경로(배송 조회처럼 이어지는 점과 선). 문제는 빨간 점, 결과는 채운 점.
function route(items, cls = '') {
  return `<ol class="route ${cls}">` + items.map(([k, t]) => {
    const state = k === '문제' ? 'alert' : k === '결과' ? 'done' : '';
    return `<li class="${state}"><span class="k">${esc(k)}</span><p>${rich(t)}</p></li>`;
  }).join('') + '</ol>';
}

/* ───────────── 공통 토큰 ───────────── */
const tokens = `
:root{--ink:#191F28;--ink2:#333D4B;--slate:#4E5968;--mute:#8B95A1;--faint:#B0B8C1;--line:#E5E8EB;--fog:#F2F4F6;--blue:#3182F6;--blue-ink:#1B64DA;--blue-fog:#E8F3FF;--red:#F04452;--red-fog:#FFEEEE;}
*{box-sizing:border-box}
body{margin:0;font-family:Pretendard,'Malgun Gothic',sans-serif;color:var(--ink);word-break:keep-all;overflow-wrap:anywhere;-webkit-font-smoothing:antialiased}
code{font-family:Consolas,Pretendard,monospace;font-size:.9em;background:var(--fog);color:var(--ink2);padding:.05em .3em;border-radius:4px}
a{color:inherit;text-decoration:none}
@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

/* ───────────── 이력서·경력기술서 (A4) ───────────── */
const resumeCss = `
@page{size:A4;margin:15mm 16mm 17mm}
html{background:#D1D6DB}
body{font-size:9.4pt;line-height:1.6}
.paper{max-width:178mm;margin:24px auto;background:#fff;padding:0}
@media screen{.paper{padding:15mm 16mm;max-width:210mm;box-shadow:0 0 0 1px var(--line)}}
@media print{html{background:#fff}.paper{margin:0}}
.one{break-after:page}
.head{display:grid;grid-template-columns:1fr auto auto;gap:18px;align-items:end;padding-bottom:12px;border-bottom:2px solid var(--ink)}
.photo{width:25mm;height:33.3mm;object-fit:cover;border-radius:10px;display:block;background:var(--fog)}
.name{font-size:30pt;font-weight:800;letter-spacing:-.04em;line-height:1.05;margin:0}
.role{font-size:13pt;font-weight:750;color:var(--blue-ink);margin:8px 0 2px;letter-spacing:-.01em}
.line{font-size:10.4pt;color:var(--ink2);margin:0;font-weight:500}
.contact{margin:0;font-size:8.6pt;line-height:1.72;text-align:right;color:var(--slate)}
.contact b{color:var(--ink2);font-weight:650;margin-right:6px}
.intro{font-size:9.8pt;line-height:1.66;margin:11px 0 10px;color:var(--ink2)}
.facts{display:grid;grid-template-columns:repeat(4,1fr);background:var(--fog);border-radius:12px;padding:11px 4px;margin:0 0 4px}
.facts div{padding:0 12px;border-left:1px solid var(--line)}
.facts div:first-child{border-left:0}
.facts dt{font-size:7.8pt;color:var(--slate);font-weight:600}
.facts dd{margin:1px 0 0;font-size:13pt;font-weight:800;letter-spacing:-.02em}
.facts small{display:block;font-size:7.6pt;color:var(--mute);margin-top:1px}
h2.sec{font-size:12pt;font-weight:800;letter-spacing:-.02em;margin:13px 0 5px;display:flex;align-items:center;gap:8px}
h2.sec::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--blue)}
.job{display:grid;grid-template-columns:31mm 1fr;gap:12px;padding:8px 0;border-top:1px solid var(--line)}
.job:first-of-type{border-top:0}
.job .when{font-size:8.5pt;color:var(--slate);font-weight:600;line-height:1.5}
.job .when small{display:block;color:var(--mute);font-weight:500}
.job h3{font-size:10.6pt;margin:0 0 3px;font-weight:800}
.job h3 span{font-weight:600;color:var(--slate);margin-left:7px;font-size:9.4pt}
ul.dots{list-style:none;margin:0;padding:0}
ul.dots li{position:relative;padding-left:11px;margin:2px 0}
ul.dots li::before{content:'';position:absolute;left:1px;top:.68em;width:4px;height:4px;border-radius:50%;background:var(--faint)}
table.skills{width:100%;border-collapse:collapse;font-size:8.9pt;line-height:1.5}
.skills th{width:15mm;text-align:left;vertical-align:top;color:var(--slate);font-weight:700;padding:5px 0;border-top:1px solid var(--line)}
.skills td{padding:5px 0 5px 4px;border-top:1px solid var(--line);vertical-align:top}
.skills td small{display:block;color:var(--mute);font-size:8pt}
.certs{display:flex;gap:8px;margin:2px 0 0}
.certs span{background:var(--fog);border-radius:6px;padding:3px 9px;font-weight:600;font-size:8.8pt}
.cv-title{display:flex;align-items:baseline;justify-content:space-between;border-bottom:2px solid var(--ink);padding-bottom:8px;margin:0 0 4px}
.cv-title h1{font-size:20pt;font-weight:800;letter-spacing:-.03em;margin:0}
.cv-title p{margin:0;font-size:8.4pt;color:var(--slate);max-width:96mm;text-align:right;line-height:1.5}
.proj{margin-top:16px}
.keep{break-inside:avoid}
.keep.projtop{break-after:avoid}
.case h3{break-after:avoid}
.route.sm li{break-inside:avoid}
.proj-h{display:flex;align-items:center;gap:8px;margin:0}
.proj-h h2{font-size:14pt;font-weight:800;letter-spacing:-.03em;margin:0}
.team{font-size:8pt;font-weight:700;color:var(--slate);background:var(--fog);border-radius:6px;padding:2px 8px}
.proj .sum{margin:3px 0 6px;color:var(--ink2)}
dl.meta{display:grid;grid-template-columns:auto 1fr;gap:1px 10px;margin:0 0 8px;font-size:8.4pt;line-height:1.55;color:var(--slate);padding:7px 10px;background:var(--fog);border-radius:10px}
dl.meta dt{font-weight:700;color:var(--ink2)}
dl.meta dd{margin:0}
.case{margin:10px 0 2px}
.case h3{font-size:10.4pt;font-weight:800;margin:0 0 5px;letter-spacing:-.015em}
.route{list-style:none;margin:0;padding:0}
.route.sm li{position:relative;display:grid;grid-template-columns:7.5mm 1fr;padding:0 0 5px 16px}
.route.sm li::before{content:'';position:absolute;left:0;top:.42em;width:9px;height:9px;border-radius:50%;border:2px solid var(--blue);background:#fff}
.route.sm li::after{content:'';position:absolute;left:4px;top:calc(.42em + 11px);bottom:1px;width:1px;background:#C4CAD1}
.route.sm li:last-child{padding-bottom:0}
.route.sm li:last-child::after{display:none}
.route.sm li.alert::before{border-color:var(--red)}
.route.sm li.done::before{background:var(--blue)}
.route.sm .k{font-size:8.3pt;font-weight:750;color:var(--blue-ink)}
.route.sm li.alert .k{color:var(--red)}
.route.sm p{margin:0;font-size:9.1pt;line-height:1.58;color:var(--ink2)}
.more{margin:8px 0 0;break-inside:avoid}
.more > b{font-size:8.4pt;color:var(--slate);font-weight:700}
.more ul.dots{font-size:9pt;line-height:1.56;color:var(--ink2)}
`;

function buildResume() {
  const contact = [['전화', person.phone], ['이메일', `<a href="mailto:${person.email}">${person.email}</a>`],
    ['GitHub', `<a href="https://${person.github}">${person.github}</a>`], ['업무용', `<a href="https://${person.githubWork}">${person.githubWork}</a>`]]
    .map(([k, v]) => `<b>${k}</b>${v}`).join('<br>');
  const facts = resume.facts.map(([k, v, s]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd><small>${esc(s)}</small></div>`).join('');
  const jobs = resume.jobs.map(j => `<div class="job"><div class="when">${esc(j.period)}${j.sub ? `<small>${esc(j.sub)}</small>` : ''}</div><div><h3>${esc(j.company)}<span>${esc(j.title)}</span></h3><ul class="dots">${j.items.map(i => `<li>${rich(i)}</li>`).join('')}</ul></div></div>`).join('');
  const skills = resume.skills.map(([k, v, s]) => `<tr><th>${esc(k)}</th><td>${rich(v)}<small>${rich(s)}</small></td></tr>`).join('');
  const one = `<section class="one">
    <header class="head"><div><h1 class="name">${esc(person.name)}</h1><p class="role">${esc(person.role)}</p><p class="line">${esc(resume.line)}</p></div><p class="contact">${contact}</p><img class="photo" src="data:image/jpeg;base64,${fs.readFileSync(path.join(assets, 'profile.jpg')).toString('base64')}" alt="진솔 사진"></header>
    <p class="intro">${rich(resume.intro)}</p>
    <dl class="facts">${facts}</dl>
    <h2 class="sec">경력</h2>${jobs}
    <h2 class="sec">기술과 쓰인 곳</h2><table class="skills">${skills}</table>
    <h2 class="sec">자격</h2><div class="certs">${resume.certs.map(c => `<span>${esc(c)}</span>`).join('')}</div>
  </section>`;
  // 프로젝트 제목이 쪽 끝에 홀로 남지 않도록 제목, 요약, 개요와 첫 내용을 한 덩어리로 묶는다.
  const projects = resume.projects.map(p => {
    const cases = (p.cases || []).map(c => `<div class="case"><h3>${esc(c.title)}</h3>${route(c.route, 'sm')}</div>`);
    const more = p.more ? `<div class="more">${p.cases ? '<b>그 밖에</b>' : ''}<ul class="dots">${p.more.map(m => `<li>${rich(m)}</li>`).join('')}</ul></div>` : '';
    const head = `<div class="proj-h"><h2>${esc(p.name)}</h2>${p.team ? `<span class="team">${esc(p.team)}</span>` : ''}</div><p class="sum">${rich(p.summary)}</p>${p.meta ? `<dl class="meta">${p.meta.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${rich(v)}</dd>`).join('')}</dl>` : ''}`;
    // 사례가 없는 프로젝트는 목록까지 묶고, 사례가 있으면 제목 묶음을 다음 사례와 떨어지지 않게 한다.
    if (!cases.length) return `<section class="proj"><div class="keep">${head}${more}</div></section>`;
    return `<section class="proj"><div class="keep projtop">${head}</div>${cases.join('')}${more}</section>`;
  }).join('');
  const cv = `<section class="cv"><div class="cv-title"><h1>경력기술서</h1><p>사례마다 문제, 본질, 선택, 결과 순서로 적었습니다. 사내 코드는 비공개이며, 수치는 직접 측정한 값입니다.</p></div>${projects}</section>`;
  return doc('진솔 이력서 및 경력기술서', resumeCss, `<main class="paper">${one}${cv}</main>`);
}

/* ───────────── 포트폴리오 (16:9) ───────────── */
const deckCss = `
@page{size:1280px 720px;margin:0}
html{background:#D1D6DB}
.deck{padding:24px 0}
.slide{position:relative;width:1280px;height:720px;margin:0 auto 24px;background:#fff;overflow:hidden;padding:50px 72px 62px;display:flex;flex-direction:column;break-after:page}
.slide:last-child{break-after:auto}
@media print{html{background:#fff}.deck{padding:0}.slide{margin:0}}
.top{display:flex;align-items:center;gap:12px;font-size:15px;font-weight:600;color:var(--slate);margin:0 0 18px;min-height:28px}
.badge{display:inline-flex;align-items:center;height:28px;padding:0 11px;border-radius:8px;background:var(--blue-fog);color:var(--blue-ink);font-weight:700;font-size:14px}
.foot{position:absolute;left:72px;right:72px;bottom:24px;display:flex;justify-content:space-between;font-size:12.5px;color:var(--mute)}
.h{font-size:34px;line-height:1.32;letter-spacing:-.035em;font-weight:800;margin:0 0 26px}
.body{flex:1;min-height:0;display:grid;gap:52px}
.split{grid-template-columns:1fr 1.2fr}
.split-wide{grid-template-columns:.92fr 1.3fr}
.route{list-style:none;margin:0;padding:0}
/* 세로 경로 */
.route.lg li{position:relative;padding:0 0 15px 30px}
.route.lg li::before{content:'';position:absolute;left:0;top:4px;width:15px;height:15px;border-radius:50%;border:3px solid var(--blue);background:#fff}
.route.lg li::after{content:'';position:absolute;left:6.5px;top:22px;bottom:2px;width:2px;background:#D1D6DB}
.route.lg li:last-child{padding-bottom:0}
.route.lg li:last-child::after{display:none}
.route.lg li.alert::before{border-color:var(--red)}
.route.lg li.done::before{background:var(--blue)}
.route.lg .k{display:block;font-size:13px;font-weight:750;color:var(--blue-ink);margin-bottom:2px}
.route.lg li.alert .k{color:var(--red)}
.route.lg p{margin:0;font-size:15.5px;line-height:1.6;color:var(--ink2)}
/* 가로 경로 */
.hroute{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n),1fr)}
.hroute li{position:relative;padding:32px 20px 0 0}
.hroute li::before{content:'';position:absolute;left:0;top:0;width:19px;height:19px;border-radius:50%;background:var(--blue)}
.hroute li::after{content:'';position:absolute;left:19px;top:8px;width:calc(100% - 19px);height:3px;background:var(--blue)}
.hroute li:last-child::after{display:none}
.hroute li:has(+ .next)::after,.hroute.future li::after{background:none;height:0;top:8px;border-top:3px dashed var(--blue)}
.hroute li.next::before,.hroute.future li::before{background:#fff;border:3px solid var(--blue)}
.hroute b{display:block;font-size:20px;font-weight:800;letter-spacing:-.02em;margin-bottom:5px}
.hroute li.next b{color:var(--blue-ink)}
.hroute span{display:block;font-size:14.5px;line-height:1.5;color:var(--ink2)}
.hroute small{display:inline-block;margin-top:10px;font-size:12.5px;font-weight:650;color:var(--slate);background:var(--fog);border-radius:6px;padding:3px 8px}
.hroute li.next small{background:var(--blue-fog);color:var(--blue-ink)}
/* 캡처 */
.shot{position:relative;overflow:hidden;border-radius:14px;border:1px solid var(--line);background:var(--fog)}
.shot img{position:absolute;display:block;height:auto;max-width:none}
.cap{font-size:12.5px;color:var(--mute);margin-top:8px}
.label{display:block;font-size:13px;font-weight:700;color:var(--slate);margin:0 0 6px}
/* 표지 */
.s-cover{padding-top:60px}
.s-cover .kick{font-size:16px;font-weight:650;color:var(--slate);margin:0 0 18px}
.s-cover h1{font-size:50px;line-height:1.26;letter-spacing:-.04em;font-weight:800;margin:0 0 20px}
.s-cover .lead{font-size:18px;line-height:1.65;color:var(--ink2);max-width:780px;margin:0}
.s-cover .hroute{margin-top:auto}
.s-cover .who{display:flex;gap:22px;align-items:baseline;margin-top:34px;padding-top:16px;border-top:1px solid var(--line);font-size:14px;color:var(--slate)}
.s-cover .who b{font-size:17px;color:var(--ink);font-weight:800}
/* 시스템 */
.systems{display:grid;grid-template-columns:repeat(5,1fr);gap:18px;margin-top:6px}
.sys{border-top:4px solid var(--blue);padding-top:16px}
.sys.team{border-top-color:var(--faint)}
.sys .since{font-size:12.5px;color:var(--mute);font-weight:600;min-height:18px}
.sys h3{font-size:19px;line-height:1.35;font-weight:800;letter-spacing:-.025em;margin:4px 0 6px;min-height:52px}
.sys .who{font-size:14px;color:var(--slate);margin:0 0 10px;min-height:42px;line-height:1.5}
.pill{display:inline-block;font-size:12.5px;font-weight:700;border-radius:6px;padding:3px 9px;background:var(--blue-fog);color:var(--blue-ink)}
.sys.team .pill{background:var(--fog);color:var(--slate)}
.sys .stack{font-size:13.5px;color:var(--ink2);margin:12px 0 12px;line-height:1.5;min-height:40px}
.sys .size{font-size:19px;font-weight:800;line-height:1.35;letter-spacing:-.02em}
.note{font-size:13px;color:var(--mute);margin:auto 0 0;line-height:1.55}
/* 일하는 방식 */
.method{--n:4}
.method li{padding-right:28px}
.method .e{margin-top:16px;background:var(--fog);border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;color:var(--ink2)}
.endline{margin-top:auto;font-size:17px;font-weight:700;color:var(--ink2)}
/* 잠금 */
.duo{grid-template-columns:1fr 1fr;gap:44px}
.panel h3{font-size:19px;font-weight:800;margin:0 0 14px;letter-spacing:-.02em}
.panel p.t{font-size:15px;line-height:1.62;color:var(--ink2);margin:16px 0 0}
.lockfig{display:grid;grid-template-columns:auto 1fr auto 1fr auto;align-items:center;gap:0;background:var(--fog);border-radius:16px;padding:18px 20px}
.lockfig .col{display:grid;gap:10px}
.lockfig .box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:13.5px;font-weight:650;white-space:nowrap}
.lockfig .lock{background:var(--ink);color:#fff;border-color:var(--ink);padding:16px 14px;text-align:center;line-height:1.4}
.lockfig .lock small{display:block;font-weight:500;color:var(--faint);font-size:12px}
.lockfig .wire{height:2px;background:var(--faint);margin:0 8px;position:relative}
.lockfig .run{background:var(--blue);color:#fff;border-color:var(--blue)}
.lockfig .skip{color:var(--mute)}
.panel .route.lg p{font-size:15px}
.footline{margin-top:auto;font-size:14px;color:var(--slate);line-height:1.6;background:var(--fog);border-radius:12px;padding:12px 16px}
/* 아키텍처 */
.arch{display:grid;gap:18px;align-content:start}
.arow{background:var(--fog);border-radius:16px;padding:16px 18px 18px}
.arow.after{background:var(--blue-fog)}
.arow .tag{font-size:13px;font-weight:750;color:var(--slate);margin:0 0 12px;display:block}
.arow.after .tag{color:var(--blue-ink)}
.flow{display:flex;align-items:center}
.flow .n{background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 11px;font-size:13.5px;font-weight:700;line-height:1.35;text-align:center;flex:0 0 auto;max-width:150px}
.flow .n small{display:block;font-weight:500;color:var(--slate);font-size:11.5px;margin-top:2px}
.flow .n.key{border-color:var(--blue);box-shadow:inset 0 0 0 1px var(--blue)}
.flow .e{flex:1;position:relative;height:44px;min-width:70px;margin:0 6px}
.flow .e::before{content:'';position:absolute;left:0;right:6px;top:50%;height:2px;background:var(--mute)}
.flow .e::after{content:'';position:absolute;right:0;top:calc(50% - 5px);border-left:8px solid var(--mute);border-top:6px solid transparent;border-bottom:6px solid transparent}
.flow .e span{position:absolute;left:0;right:0;bottom:calc(50% + 5px);text-align:center;font-size:11.5px;color:var(--slate);line-height:1.3;font-weight:600}
.flow .e em{position:absolute;left:0;right:0;top:calc(50% + 6px);text-align:center;font-size:11px;color:var(--slate);font-style:normal;line-height:1.3}
.flow .e.bad::before{background:var(--red)}
.flow .e.bad::after{border-left-color:var(--red)}
.flow .e.bad span{color:var(--red)}
.after .flow .e::before{background:var(--blue)}
.after .flow .e::after{border-left-color:var(--blue)}
.watch{margin-top:14px;display:flex;gap:10px;align-items:center;font-size:13px;color:var(--ink2)}
.watch b{flex:0 0 auto;background:#fff;border:1.5px dashed var(--blue);border-radius:10px;padding:6px 10px;font-size:13px}
/* 복구 */
.three{grid-template-columns:repeat(3,1fr);gap:26px;align-content:start}
.rec .n{font-size:40px;font-weight:800;letter-spacing:-.03em;color:var(--blue-ink);line-height:1.1}
.rec h3{font-size:17px;font-weight:800;margin:6px 0 8px}
.rec p{font-size:14.5px;line-height:1.62;color:var(--ink2);margin:0}
.timeline{margin-top:auto;background:var(--fog);border-radius:16px;padding:18px 22px;display:grid;grid-template-columns:1.25fr 1fr;gap:28px;align-items:center}
.timeline p{margin:0;font-size:14px;line-height:1.62;color:var(--ink2)}
.axis{position:relative;height:74px}
.axis .bar{position:absolute;left:0;right:0;top:32px;height:6px;border-radius:3px;background:linear-gradient(90deg,var(--blue-fog),#fff)}
.axis .m{position:absolute;top:22px;transform:translateX(-50%);text-align:center;font-size:12px;font-weight:700;white-space:nowrap}
.axis .m i{display:block;width:14px;height:14px;border-radius:50%;margin:3px auto 6px;background:var(--blue)}
.axis .m.miss i{background:var(--red)}
.axis .m.miss{color:var(--red)}
.axis .m.line i{width:2px;height:30px;border-radius:0;margin:-5px auto 1px;background:var(--ink)}
.axis .m em{display:block;font-style:normal;font-weight:600;color:var(--slate)}
.axis .zero{position:absolute;left:0;top:0;font-size:11.5px;color:var(--mute)}
/* 포털 필름 */
.film{display:grid;grid-template-columns:1.62fr 1fr;gap:18px}
.film .stack{display:grid;gap:14px;align-content:start}
.frame{position:relative}
.frame .num{position:absolute;left:10px;top:10px;z-index:2;width:26px;height:26px;border-radius:50%;background:var(--ink);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center}
.frame figcaption{font-size:13.5px;font-weight:650;color:var(--ink2);margin-top:7px}
.notes3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:18px}
.notes3 b{display:block;font-size:15px;font-weight:800;margin-bottom:4px}
.notes3 p{margin:0;font-size:13.5px;line-height:1.58;color:var(--ink2)}
/* 성능 */
.bars{display:grid;gap:16px;align-content:start}
.barrow .lbl{display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px}
.barrow .lbl b{font-weight:800}
.barrow .lbl span{color:var(--slate)}
.track{height:42px;border-radius:10px;background:var(--fog);position:relative}
.fill{height:100%;border-radius:10px;background:var(--faint);display:flex;align-items:center;justify-content:flex-end;padding-right:12px;color:#fff;font-weight:800;font-size:17px;min-width:84px}
.barrow.last .fill{background:var(--blue)}
.barrow:nth-child(2) .fill{background:var(--mute)}
/* 파이프라인 */
.pipe{--n:4;margin-bottom:22px}
.pipe li{padding-top:30px}
.pipe b{font-size:18px}
.pipe span{font-size:14px}
.pl{grid-template-columns:1fr 1fr;gap:40px}
.metrics{display:flex;gap:28px;margin:0 0 14px}
.metrics div b{display:block;font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.15}
.metrics div:first-child b{color:var(--blue-ink)}
.metrics div span{font-size:13px;color:var(--slate)}
ul.ticks{list-style:none;margin:0;padding:0}
ul.ticks li{position:relative;padding-left:16px;font-size:14px;line-height:1.58;color:var(--ink2);margin:0 0 7px}
ul.ticks li::before{content:'';position:absolute;left:2px;top:.6em;width:6px;height:6px;border-radius:50%;background:var(--blue)}
.shots{display:grid;gap:12px;align-content:start}
/* 장애 */
.inc{display:flex;flex-direction:column}
.inc .sys{border:0;padding:0;font-size:13px;font-weight:700;color:var(--slate);margin-bottom:8px}
.inc .what{font-size:24px;font-weight:800;color:var(--red);letter-spacing:-.025em;margin:0 0 10px}
.inc .cause{font-size:14.5px;line-height:1.6;color:var(--ink2);margin:0 0 14px;flex:1}
.inc .rule{border-top:2px solid var(--blue);padding-top:12px;font-size:14.5px;line-height:1.6;color:var(--ink)}
.inc .rule b{display:block;font-size:13px;color:var(--blue-ink);margin-bottom:3px}
/* 기록 */
.rec2 .n{font-size:44px;font-weight:800;letter-spacing:-.03em;color:var(--blue-ink);line-height:1.05;min-height:46px}
.rec2 h3{font-size:18px;font-weight:800;margin:10px 0 8px}
.rec2 p{font-size:14.5px;line-height:1.65;color:var(--ink2);margin:0}
.quote{margin-top:auto;font-size:21px;font-weight:750;letter-spacing:-.02em;color:var(--ink2);padding-left:18px;border-left:4px solid var(--blue)}
/* 스택 */
table.map{width:100%;border-collapse:collapse}
.map th{width:220px;text-align:left;vertical-align:top;font-size:15px;font-weight:800;padding:11px 0;border-top:1px solid var(--line)}
.map td{font-size:15px;line-height:1.55;color:var(--ink2);padding:11px 0;border-top:1px solid var(--line)}
.map tr:first-child th,.map tr:first-child td{border-top:2px solid var(--ink)}
/* 마무리 */
.s-closing h1{font-size:44px;line-height:1.3;letter-spacing:-.04em;font-weight:800;margin:6px 0 18px}
.s-closing .lead{font-size:18px;line-height:1.65;color:var(--ink2);margin:0 0 34px;max-width:860px}
.s-closing .hroute{--n:9}
.s-closing .hroute b{font-size:17px}
.s-closing .contact{margin-top:auto;display:flex;gap:30px;align-items:baseline;padding-top:16px;border-top:1px solid var(--line);font-size:15px;color:var(--ink2)}
.s-closing .contact b{font-size:20px;font-weight:800;color:var(--ink)}
.s-closing .fine{font-size:12.5px;color:var(--mute);margin:10px 0 0}
`;

function frame(top, body, i, n, cls = '') {
  return `<section class="slide ${cls}">${top ? `<div class="top">${top}</div>` : ''}${body}<div class="foot"><span>진솔 포트폴리오</span><span>${i} / ${n}</span></div></section>`;
}
const caseTop = s => s.no ? `<span class="badge">사례 ${s.no}</span><span>${esc(s.project)}</span>` : `<span class="badge">${esc(s.label)}</span><span>${esc(s.project)}</span>`;
const title = t => `<h2 class="h">${rich(t)}</h2>`;
const hroute = (items, cls = '', n) => `<ol class="hroute ${cls}" style="--n:${n || items.length}">` + items.map(r => `<li class="${r.next ? 'next' : ''}"><b>${esc(r.k)}</b><span>${rich(r.d || r.t || '')}</span>${r.s ? `<small>${esc(r.s)}</small>` : ''}${r.e ? `<div class="e">${rich(r.e)}</div>` : ''}${r.ref ? `<span class="ref">${esc(r.ref)}에서 자세히</span>` : ''}</li>`).join('') + '</ol>';

const slides = {
  cover: s => `<p class="kick">${esc(s.kicker)}</p><h1>${rich(s.title)}</h1><p class="lead">${rich(s.lead)}</p>${hroute(s.route)}<div class="who"><b>${esc(person.name)}</b><span>${esc(person.phone)}</span><span>${esc(person.email)}</span><span>${esc(person.github)}</span></div>`,
  systems: s => `${title(s.title)}<div class="systems">${s.systems.map(x => `<div class="sys ${x.role === '혼자' ? '' : 'team'}"><div class="since">${esc(x.since ? x.since + '부터' : '')}</div><h3>${esc(x.name)}</h3><p class="who">${esc(x.who)}</p><span class="pill">${esc(x.role === '혼자' ? '혼자 개발' : x.role)}</span><p class="stack">${esc(x.stack)}</p><div class="size">${rich(x.size)}</div></div>`).join('')}</div>
    <div class="links"><span class="label">시스템 사이를 잇는 일</span><div class="linkrow">${s.links.map(([a, b, t]) => `<div class="lk"><b>${esc(a)}<i></i>${esc(b)}</b><span>${esc(t)}</span></div>`).join('')}</div></div><p class="note">${rich(s.note)}</p>`,
  method: s => `${title(s.title)}${hroute(s.steps.map(x => ({ k: x.k, d: x.d, e: x.e, ref: x.ref })), 'method')}<p class="endline">${rich(s.foot)}</p>`,
  case: s => `${title(s.title)}<div class="body split"><div>${route(s.route, 'lg')}${s.facts ? `<div class="facts3">${s.facts.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}</div><div><div class="crmshots">${shot(s.shots[0].file, { alt: s.shots[0].label })}<div class="inset">${shot(s.shots[1].file, { crop: [1022, 0, 284, 560], alt: s.shots[1].label })}</div></div><p class="cap">왼쪽은 ${esc(s.shots[0].label)}, 오른쪽은 ${esc(s.shots[1].label)} 미리보기예요. 글자 수가 아니라 바이트 수로 문자 종류를 정해요. ${esc(s.caption)}</p></div></div>`,
  lock: s => `${title(s.title)}<div class="body duo"><div class="panel"><h3>${esc(s.lock.head)}</h3><div class="lockfig"><div class="col"><div class="box">인스턴스 1</div><div class="box">인스턴스 2</div><div class="box">인스턴스 3</div></div><div class="wire"></div><div class="box lock">MySQL<br>GET_LOCK<small>먼저 잡은 한 대만</small></div><div class="wire"></div><div class="col"><div class="box run">실행</div><div class="box skip">건너뜀</div><div class="box skip">건너뜀</div></div></div><p class="t">${rich(s.lock.text)}</p></div><div class="panel"><h3>${esc(s.claim.head)}</h3>${route(s.claim.steps.map((t, i) => [['처리 시작', '동시 접근', '10분 무조작'][i], t]), 'lg claim')}</div></div><p class="footline">${rich(s.foot)}</p>`,
  migrate: s => `${title(s.title)}<div class="body split-wide">${route(s.route, 'lg')}<div class="mig"><span class="label">테이블 성격별로 다시 맞추는 방법</span><table class="plans">${s.plans.map(([k, d, t]) => `<tr><th>${esc(k)}</th><td>${esc(d)}</td><td><span>${esc(t)}</span></td></tr>`).join('')}</table><span class="label">증분 방식으로 7주 뒤 재 보니</span><div class="gaps">${s.gaps.map(([n, t]) => `<div><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')}</div></div></div><p class="footline">${rich(s.foot)}</p>`,
  arch: s => `${title(s.title)}<div class="body split-wide">${route(s.route, 'lg')}<div class="arch">
    <div class="arow"><span class="tag">이전: 배치가 두 DB에 직접 접속</span><div class="flow"><div class="n">레거시<small>SQL Server</small></div><div class="e"><span>직접 접속</span></div><div class="n key">동기화 PC<small>작업 스케줄러</small></div><div class="e bad"><span>직접 접속</span><em>허용목록이 비어 끊김</em></div><div class="n">Cloud SQL<small>V2 DB</small></div></div></div>
    <div class="arow after"><span class="tag">이후: 들어오는 길은 API 하나</span><div class="flow"><div class="n">레거시 쪽 배치<small>자기 DB만 읽음</small></div><div class="e"><span>HTTPS</span><em>열쇠, IP 허용목록,<br>속도 제한</em></div><div class="n key">V2 백엔드<small>NestJS</small></div><div class="e"><span>커넥터</span></div><div class="n">Cloud SQL<small>V2 DB</small></div></div>
    <div class="watch"><b>감시, Cloud Run</b><span>마지막 성공이 26시간을 넘기면 알림. 실패 알림과는 따로 둬요.</span></div></div>
  </div></div>`,
  recovery: s => {
    const max = 30;
    const marks = s.watch.marks.map(([h, l, c]) => `<div class="m ${c}" style="left:${(h / max * 100).toFixed(2)}%"><i></i><span>${h}시간<em>${esc(l)}</em></span></div>`).join('');
    return `${title(s.title)}<div class="body three">${s.items.map(x => `<div class="rec"><div class="n">${esc(x.n)}</div><h3>${esc(x.k)}</h3><p>${rich(x.t)}</p></div>`).join('')}</div><div class="timeline"><p>${rich(s.watch.text)}</p><div class="axis"><span class="zero">마지막 성공 이후 지난 시간</span><div class="bar"></div>${marks}</div></div>`;
  },
  film: s => {
    const [a, b, c] = s.film;
    const fig = (f, n, opts) => `<figure class="frame"><span class="num">${n}</span>${shot(f.file, opts)}<figcaption>${esc(f.k)}</figcaption></figure>`;
    return `${title(s.title)}<div class="body filmwrap"><div class="frames">${fig(a, 1, { crop: [0, 110, 2464, 890], alt: a.k })}<div class="pair">${fig(b, 2, { crop: [160, 69, 880, 420], alt: b.k })}${fig(c, 3, { crop: [0, 0, 1320, 630], alt: c.k })}</div></div><div class="notesv">${s.notes.map(x => `<div><b>${esc(x.k)}</b><p>${rich(x.t)}</p></div>`).join('')}<p class="cap">${esc(s.caption)}</p></div></div>`;
  },
  perf: s => {
    const max = Math.max(...s.bars.map(b => b.v));
    const bars = s.bars.map((b, i) => `<div class="barrow ${i === s.bars.length - 1 ? 'last' : ''}"><div class="lbl"><b>${esc(b.k)}</b><span>${esc(b.d)}</span></div><div class="track"><div class="fill" style="width:${(b.v / max * 100).toFixed(1)}%">${esc(b.label)}</div></div></div>`).join('');
    return `${title(s.title)}<div class="body split"><div class="bars">${bars}<p class="cap">로그인 직후 첫 화면 응답 시간. 운영 요청 로그로 원인 하나를 고칠 때마다 다시 쟀어요.</p></div>${route(s.route, 'lg')}</div>`;
  },
  pipeline: s => `${title(s.title)}${hroute(s.steps, 'pipe')}<div class="body pl"><div><div class="metrics">${s.metrics.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div><ul class="ticks">${s.notes.map(t => `<li>${rich(t)}</li>`).join('')}</ul></div><div class="shots">${shot(s.shots[0].file, { alt: s.shots[0].label })}${shot(s.shots[1].file, { crop: [0, 60, 1920, 470], alt: s.shots[1].label })}<p class="cap" style="margin-top:0">${esc(s.caption)}</p></div></div>`,
  incidents: s => `${title(s.title)}<div class="body three inc3">${s.items.map(x => `<div class="inc"><div class="where">${esc(x.sys)}</div><p class="what">${esc(x.what)}</p><p class="cause">${rich(x.cause)}</p><div class="rule"><b>원칙</b>${rich(x.rule)}</div></div>`).join('')}</div><p class="footline">${rich(s.foot)}</p>`,
  audit: s => `${title(s.title)}${hroute(s.steps, 'pipe')}<div class="metrow">${s.metrics.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div><ul class="ticks cols">${s.notes.map(t => `<li>${rich(t)}</li>`).join('')}</ul>`,
  records: s => `${title(s.title)}<div class="body recwrap"><div class="reclist">${s.items.map(x => `<div class="rec2">${x.n ? `<div class="n">${esc(x.n)}</div>` : ''}<div><h3>${esc(x.k)}</h3><p>${rich(x.t)}</p></div></div>`).join('')}</div><div class="papers"><div class="paper-card"><b class="ph">${esc(s.sample.head)}</b><p class="pl2">${rich(s.sample.lead)}</p><span class="ps">10초 핵심 요약</span><ul>${s.sample.bullets.map(t => `<li>${rich(t)}</li>`).join('')}</ul><span class="pf">이하 상세 업무 내역, 커밋 해시와 이슈 번호 병기</span></div><div class="rule-card"><b>AI 에이전트 작성 규칙, AGENTS.md 일부</b><ol>${s.rules.map(t => `<li>${rich(t)}</li>`).join('')}</ol></div></div></div><p class="quote">${rich(s.quote)}</p>`,
  stack: s => `${title(s.title)}<table class="map"><thead><tr><th>공고에 적힌 기술과 일</th><td>제가 해 본 것</td></tr></thead><tbody>${s.rows.map(([k, v, tag]) => `<tr><th>${esc(k)}${tag ? `<small>${esc(tag)}</small>` : ''}</th><td>${rich(v)}</td></tr>`).join('')}</tbody></table>`,
  closing: s => `<div class="mid"><h1>${rich(s.title)}</h1><p class="lead">${rich(s.lead)}</p>${hroute(['발주', '입고', '출고', '배송', '도착', '운영', 'A/S', '반품', '재출고'].map(k => ({ k })), 'future')}<p class="src">토스플레이스 Node.js 챕터 소개 글에 나온 단말기 한 대의 라이프사이클이에요.</p></div><div class="contact"><b>${esc(person.name)}</b><span>${esc(person.phone)}</span><span>${esc(person.email)}</span><span>${esc(person.github)}</span></div><p class="fine">${rich(s.note)}</p>`,
};

const deckExtraCss = `
.crmshots{display:grid;grid-template-columns:1fr 150px;gap:14px;align-items:start}
.route.claim li:nth-child(2)::before{border-color:var(--mute)}
.route.claim li:nth-child(2) .k{color:var(--slate)}
/* 시스템 연결 */
.links{margin-top:30px}
.linkrow{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.lk{background:var(--fog);border-radius:12px;padding:12px 14px}
.lk b{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800;margin-bottom:4px;white-space:nowrap}
.lk b i{flex:1;height:2px;background:var(--blue);position:relative;min-width:14px}
.lk b i::after{content:'';position:absolute;right:-1px;top:-4px;border-left:7px solid var(--blue);border-top:5px solid transparent;border-bottom:5px solid transparent}
.lk span{font-size:13px;line-height:1.5;color:var(--slate)}
.s-systems .note{margin-top:auto}
/* 방식 */
.method li{padding-right:30px}
.method b{font-size:22px}
.method span{font-size:15.5px}
.method .e{font-size:15px;padding:16px 18px;margin-top:18px}
.method .ref{display:inline-block;margin-top:10px;font-size:12.5px;font-weight:700;color:var(--blue-ink);background:var(--blue-fog);border-radius:6px;padding:3px 8px}
.s-method .hroute{margin-top:16px}
/* 복구 */
.rec .n{font-size:44px}
.rec p{font-size:15px}
.timeline{grid-template-columns:1.2fr 1fr}
.axis{position:relative;height:100px}
.axis .bar{position:absolute;left:0;right:0;top:46px;height:6px;border-radius:3px;background:linear-gradient(90deg,var(--blue-fog),#fff)}
.axis .m{position:absolute;top:0;width:0;height:100px}
.axis .m i{position:absolute;left:-7px;top:42px;width:14px;height:14px;border-radius:50%;background:var(--blue);margin:0}
.axis .m.miss i{background:var(--red)}
.axis .m.line i{left:-1px;top:30px;width:2px;height:38px;border-radius:0;background:var(--ink)}
.axis .m span{position:absolute;left:0;top:62px;transform:translateX(-50%);white-space:nowrap;text-align:center;font-size:12px;font-weight:700}
.axis .m.line span{top:0}
.axis .m.miss span{color:var(--red)}
.axis .m em{display:block;font-style:normal;font-weight:600;color:var(--slate)}
.axis .zero{position:absolute;left:0;top:0;font-size:11.5px;color:var(--mute)}
/* 포털 */
.filmwrap{grid-template-columns:1.5fr 1fr;gap:40px}
.frames{display:grid;gap:14px;align-content:start}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.frame{margin:0}
.notesv{display:flex;flex-direction:column;gap:18px}
.notesv div{border-top:2px solid var(--ink);padding-top:10px}
.notesv b{display:block;font-size:16px;font-weight:800;margin-bottom:4px}
.notesv p{margin:0;font-size:14.5px;line-height:1.6;color:var(--ink2)}
.notesv .cap{margin-top:auto}
/* 파이프라인 */
.pl{grid-template-columns:1fr 1.05fr}
/* 장애 */
.inc3{gap:30px}
.inc .where{font-size:13px;font-weight:700;color:var(--slate);margin-bottom:6px}
.inc .what{font-size:27px}
.inc .cause{flex:none;min-height:100px;font-size:15px}
.inc .rule{font-size:15px}
.s-incidents .footline{margin-top:auto}
/* 사건관리 */
.metrow{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:4px 0 18px;padding:16px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.metrow b{display:block;font-size:26px;font-weight:800;letter-spacing:-.025em}
.metrow div:first-child b{color:var(--blue-ink)}
.metrow span{font-size:13.5px;color:var(--slate)}
ul.ticks.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:0 26px}
ul.ticks.cols li{font-size:14.5px}
/* 기록 */
.recwrap{grid-template-columns:1fr 1.08fr;gap:44px}
.reclist{display:flex;flex-direction:column;gap:16px}
.rec2{display:grid;grid-template-columns:118px 1fr;gap:14px;align-items:start;border-top:1px solid var(--line);padding-top:14px}
.rec2:first-child{border-top:0;padding-top:0}
.rec2 > div:only-child{grid-column:1/-1}
.rec2 .n{font-size:36px;min-height:0}
.rec2 h3{margin:2px 0 4px;font-size:17px}
.rec2 p{font-size:14px;line-height:1.6}
.papers{display:grid;gap:12px;align-content:start}
.paper-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:0 1px 0 var(--line)}
.paper-card .ph{display:block;font-size:15px;font-weight:800;margin-bottom:6px}
.paper-card .pl2{margin:0 0 10px;font-size:13px;line-height:1.55;color:var(--ink2);border-left:3px solid var(--line);padding-left:10px}
.paper-card .ps{display:block;font-size:12.5px;font-weight:800;margin-bottom:4px}
.paper-card ul{margin:0 0 8px;padding-left:16px;font-size:12.5px;line-height:1.55;color:var(--ink2)}
.paper-card .pf{font-size:11.5px;color:var(--mute)}
.rule-card{background:var(--ink);color:#fff;border-radius:14px;padding:14px 18px}
.rule-card b{display:block;font-size:13px;font-weight:700;color:var(--faint);margin-bottom:6px}
.rule-card ol{margin:0;padding:0;list-style:none;counter-reset:rule;font-size:13px;line-height:1.6}
.rule-card li{counter-increment:rule;position:relative;padding-left:20px}
.rule-card li::before{content:counter(rule) '.';position:absolute;left:0;color:var(--faint);font-weight:700}
.s-records .quote{margin-top:auto;font-size:18px}

.facts3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:26px;padding-top:16px;border-top:1px solid var(--line)}
.facts3 b{display:block;font-size:24px;font-weight:800;letter-spacing:-.025em}
.facts3 span{font-size:13px;color:var(--slate)}
.rec .n{font-size:52px}
.rec h3{font-size:18px}
.rec p{font-size:15.5px}
.inc .what{font-size:30px}
.inc .cause{min-height:112px;font-size:16px}
.inc .rule{font-size:16px}
.s-audit .pipe b{font-size:20px}
.s-audit .pipe span{font-size:15px}
.s-audit .metrow{margin-top:26px}
.s-audit .metrow b{font-size:30px}
ul.ticks.cols li{font-size:15px}
.method .e{font-size:15.5px}
.s-method .endline{font-size:18px}

.map thead th,.map thead td{font-size:13px;font-weight:700;color:var(--slate);padding:0 0 10px;border-top:0}
.map tbody tr:first-child th,.map tbody tr:first-child td{border-top:2px solid var(--ink)}
.map tr:first-child th,.map tr:first-child td{border-top:0}
.map th{width:250px;padding:13px 0;font-size:16px}
.map td{padding:13px 0;font-size:16px}
.map th small{display:inline-block;margin-left:8px;font-size:11.5px;font-weight:700;color:var(--slate);background:var(--fog);border-radius:5px;padding:2px 6px;vertical-align:2px}
/* 이관 */
.mig{display:flex;flex-direction:column}
.mig .label{margin-top:0}
table.plans{width:100%;border-collapse:collapse;margin:0 0 18px}
.plans th{text-align:left;font-size:15px;font-weight:800;padding:9px 0;border-top:1px solid var(--line);white-space:nowrap;width:132px}
.plans td{font-size:14px;color:var(--ink2);padding:9px 0 9px 10px;border-top:1px solid var(--line)}
.plans td:last-child{text-align:right;white-space:nowrap}
.plans td span{font-size:12.5px;font-weight:700;color:var(--slate);background:var(--fog);border-radius:6px;padding:3px 8px}
.plans tr:last-child th,.plans tr:last-child td{border-bottom:1px solid var(--line)}
.plans tr:last-child th{color:var(--blue-ink)}
.gaps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.gaps div{background:var(--red-fog);border-radius:12px;padding:11px 13px}
.gaps b{display:block;font-size:24px;font-weight:800;color:var(--red);letter-spacing:-.02em}
.gaps span{font-size:12.5px;line-height:1.5;color:var(--ink2)}
.s-migrate .footline{margin-top:16px}
/* 마무리 */
.s-closing .mid{margin:auto 0}
.s-closing .src{font-size:12.5px;color:var(--mute);margin:16px 0 0}
.s-closing .hroute b{font-size:18px}
`;

function buildDeck() {
  const n = deck.length;
  const sections = deck.map((s, i) => {
    const make = slides[s.type];
    if (!make) throw new Error('Unknown slide type ' + s.type);
    const top = s.type === 'cover' || s.type === 'closing' ? '' : s.top ? `<span>${esc(s.top)}</span>` : caseTop(s);
    return frame(top, make(s), i + 1, n, 's-' + s.type);
  }).join('');
  return doc('진솔 포트폴리오', deckCss + deckExtraCss, `<main class="deck">${sections}</main>`);
}

function doc(t, css, body) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title><style>${fontCss}${tokens}${css}</style></head><body>${body}</body></html>`;
}

// 현재·이전 회사명은 이력서에 남기고, 이전 회사의 고객사 식별정보만 익명화한다.
function publicExport(html) {
  const clean = publicHtml(html.replaceAll('리얼타임테크', 'TOSS_PUBLIC_EMPLOYER')).replaceAll('TOSS_PUBLIC_EMPLOYER', '리얼타임테크');
  assertPublicDocument(clean.replaceAll('리얼타임테크', 'IT 솔루션 기업'), 'Toss Place export');
  return clean;
}

async function inspect(browser, label, pdfFile, htmlFile, scale) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const pdfjs = process.env.PDFJS_MODULE || path.join(deps, 'pdfjs-dist', 'build', 'pdf.js');
  try {
    await page.goto(pathToFileURL(htmlFile).href);
    await page.addScriptTag({ path: pdfjs });
    const rows = await page.evaluate(async ({ bytes, worker, scale }) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
      const pdf = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(bytes), x => x.charCodeAt(0)) }).promise;
      document.body.innerHTML = '<div id="proof" style="display:grid;grid-template-columns:repeat(3,380px);gap:14px;padding:14px;background:#cfd6dd"></div>';
      const rows = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i), vp = p.getViewport({ scale });
        const canvas = document.createElement('canvas'); canvas.id = 'pdf-' + i; canvas.width = vp.width; canvas.height = vp.height; canvas.style.cssText = 'width:380px;height:auto;background:white';
        document.querySelector('#proof').append(canvas);
        await p.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        const content = await p.getTextContent(), annotations = await p.getAnnotations();
        rows.push({ page: i, text: content.items.map(x => x.str).join(''), links: annotations.filter(x => x.url).map(x => x.url), characters: content.items.reduce((s, x) => s + x.str.length, 0) });
      }
      return rows;
    }, { bytes: fs.readFileSync(pdfFile).toString('base64'), worker: pathToFileURL(path.join(path.dirname(pdfjs), 'pdf.worker.js')).href, scale });
    for (const row of rows) {
      const b64 = await page.locator('#pdf-' + row.page).evaluate(x => x.toDataURL('image/png').split(',')[1]);
      fs.writeFileSync(path.join(proof, label + '-' + row.page + '.png'), Buffer.from(b64, 'base64'));
      assertPublicDocument(row.text.replaceAll('리얼타임테크', 'IT 솔루션 기업'), label + ' page ' + row.page);
      if (row.characters < 120) throw new Error(label + ': nearly blank page ' + row.page);
    }
    await page.locator('#proof').screenshot({ path: path.join(proof, label + '-all.png') });
    fs.writeFileSync(path.join(proof, label + '-pages.json'), JSON.stringify(rows, null, 2));
    return rows;
  } finally { await page.close(); }
}

(async () => {
  const only = process.argv[2];
  fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(proof, { recursive: true });
  const docs = [
    { label: 'resume', name: '진솔_이력서_경력기술서_토스플레이스', build: buildResume, scale: 1.4 },
    { label: 'deck', name: '진솔_포트폴리오_토스플레이스', build: buildDeck, scale: 1.0 },
  ].filter(d => !only || d.label === only);
  const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
  const report = [];
  try {
    for (const d of docs) {
      const htmlFile = path.join(output, d.name + '.html'), pdfFile = path.join(output, d.name + '.pdf');
      fs.writeFileSync(htmlFile, publicExport(d.build()));
      const viewport = d.label === 'deck' ? { width: 1280, height: 720 } : { width: 673, height: 1000 };
      const page = await browser.newPage({ viewport });
      try {
        await page.route(/^https?:\/\//, r => r.abort());
        await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
        await page.emulateMedia({ media: 'print' });
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(x => x.decode())); });
        if (d.label === 'deck') {
          const over = await page.locator('.slide').evaluateAll(xs => xs.map((s, i) => ({ slide: i + 1, h: s.scrollHeight - s.clientHeight, w: s.scrollWidth - s.clientWidth }))
            .filter(x => x.h > 1 || x.w > 1));
          // 슬라이드 안 요소가 아래 여백(바닥 글씨 자리)을 침범하는지도 본다.
          const intrude = await page.locator('.slide').evaluateAll(xs => xs.map((s, i) => {
            const limit = s.getBoundingClientRect().bottom - 52;
            const worst = [...s.querySelectorAll('*')].filter(e => !e.closest('.foot') && !(e.tagName === 'IMG' && e.closest('.shot'))).reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0);
            return { slide: i + 1, over: Math.round(worst - limit) };
          }).filter(x => x.over > 0));
          if (over.length || intrude.length) console.warn('DECK OVERFLOW', JSON.stringify({ over, intrude }));
          await page.pdf({ path: pdfFile, preferCSSPageSize: true, printBackground: true });
        } else {
          const one = await page.locator('.one').evaluate(e => e.getBoundingClientRect().height);
          const limit = (297 - 32) * 96 / 25.4;
          if (one > limit) console.warn('RESUME PAGE 1 OVERFLOW', Math.round(one), '>', Math.round(limit));
          await page.pdf({
            path: pdfFile, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true,
            headerTemplate: '<span></span>',
            footerTemplate: '<div style="width:100%;padding:0 16mm;font-family:\'Malgun Gothic\',sans-serif;font-size:7.5pt;color:#8B95A1;display:flex;justify-content:space-between"><span>진솔 이력서 및 경력기술서</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
          });
        }
      } finally { await page.close(); }
      const pages = await inspect(browser, d.label, pdfFile, htmlFile, d.scale);
      const all = pages.map(x => x.text).join('\n');
      const flat = all.replace(/\s/g, '');
      for (const must of ['2인팀', '23%', '1,873']) if (!flat.includes(must)) throw new Error(d.label + ': missing ' + must);
      if (all.includes('**') || all.includes('`')) throw new Error(d.label + ': unrendered markup');
      // Pretendard의 tnum 같은 대체 글리프는 PDF 텍스트에서 사용자 정의 문자로 빠져, 채용 시스템이 숫자를 못 읽는다.
      if (/[\uE000-\uF8FF]/.test(all)) throw new Error(d.label + ': private-use glyphs in PDF text');
      if (d.label === 'resume' && !pages[1].text.replace(/\s/g, '').startsWith('경력기술서')) console.warn('RESUME: page 2 does not start with 경력기술서');
      if (fs.statSync(pdfFile).size > 50 * 1024 * 1024) throw new Error(d.label + ': upload size exceeded');
      report.push({ document: d.name, pages: pages.length, bytes: fs.statSync(pdfFile).size, pdf: pdfFile });
    }
    fs.writeFileSync(path.join(proof, 'documents.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
