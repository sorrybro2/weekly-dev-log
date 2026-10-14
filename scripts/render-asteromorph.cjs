// Employer-specific exports. Existing career/portfolio documents are preserved.
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
const { marked } = dependency('marked', 'MARKED_MODULE');
const { fontCss } = require('./document-fonts.cjs');
const { publicHtml, assertPublicDocument } = require('./public-document.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output', 'pdf', '아스테로모프');
const proof = path.join(root, 'tmp', 'pdfs', 'asteromorph');
const sourceDir = path.join(root, '경력기술서', '지원서');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function publicExport(html) {
  // Actual employers belong in a CV; former client identities remain anonymized.
  const clean = publicHtml(html.replaceAll('리얼타임테크', 'ASTER_PUBLIC_EMPLOYER'))
    .replaceAll('ASTER_PUBLIC_EMPLOYER', '리얼타임테크');
  assertPublicDocument(clean.replaceAll('리얼타임테크', 'IT 솔루션 기업'), 'Asteromorph export');
  return clean;
}
function flow(label, nodes) {
  return '<figure class="flow"><figcaption>' + esc(label) + '</figcaption><div class="flow-grid" style="--columns:' + nodes.length + '">' + nodes.map((n,i) => '<div class="node"><small>0' + (i+1) + '</small><strong>' + esc(n[0]) + '</strong><span>' + esc(n[1]) + '</span></div>').join('') + '</div></figure>';
}
function embedImages(html) {
  return html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/g, (_,before,src,after) => {
    if(src.startsWith('data:'))return before+src+after;
    const file=path.resolve(sourceDir,decodeURIComponent(src));
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Image outside workspace');
    const type={'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(file)];
    if(!type)throw new Error('Unsupported document image');
    return before+'data:'+type+';base64,'+fs.readFileSync(file).toString('base64')+after;
  }).replace(/<p>\s*(<img\b[^>]+>)\s*<\/p>/g,'<figure class="capture">$1</figure>');
}
function visuals(index) {
  if (index === 1) return '<div class="metrics"><div><b>50</b><span>평가 문항</span></div><div><b>95.8%</b><span>골든셋 Recall@5</span></div><div><b>직원 시범</b><span>현재 운영 범위</span></div></div>' + flow('검색과 생성의 처리 흐름', [['색인','청킹 + 임베딩'],['검색','pgvector + 글자 검색'],['순위 결합','RRF'],['답변','Gemini + 출력 검사']]);
  if (index === 2) return '<div class="metrics two"><div><b>8초 → 0.05초</b><span>상담료 처리 대기 조회</span></div><div><b>1,695ms → 109ms</b><span>별도 사건목록 조회</span></div></div>' + '<figure class="comparison"><figcaption>FDW 조회 경로 변경</figcaption><div><strong>기존 조회</strong><p>로컬 스케줄 + 원격 이름 정보의 인라인 JOIN</p><span>과도한 원격 데이터 수신 후 로컬 필터링</span></div><div><strong>개선한 조회</strong><p>스케줄 선조회 → 필요한 이름 정보 배치 조회</p><span>필요한 대상을 정한 뒤 애플리케이션에서 결합</span></div></figure>';
  if (index === 3) return flow('업무 데이터 확정과 화면 갱신', [['세션 훅','변경 diff 수집'],['트랜잭션','업무 데이터 + 감사로그'],['커밋 후','LISTEN/NOTIFY'],['SSE','변경 신호 + 재조회']]);
  if (index === 4) return flow('빌드부터 정상 응답 확인까지', [['빌드','Dockerfile 명시'],['배포','생성된 이미지 지정'],['검증','본문 + Content-Type'],['복구','이전 리비전 롤백']]);
  return '';
}
const css = `
@page { size:A4; margin:14mm 15mm 16mm; }
* { box-sizing:border-box; }
html { background:#e9eef4; }
body { margin:0; color:#172033; font-family:Pretendard,'Malgun Gothic',sans-serif; font-size:10.2pt; line-height:1.58; word-break:keep-all; overflow-wrap:anywhere; }
main { max-width:900px; margin:30px auto; padding:42px 48px; background:white; }
.folio { height:266mm; display:flex; flex-direction:column; break-after:page; }
.folio:last-child { break-after:auto; }
.folio > * { flex-shrink:0; }
.mast { border-bottom:1.6px solid #152b49; padding-bottom:10px; margin-bottom:19px; display:flex; justify-content:space-between; align-items:center; font-size:8pt; letter-spacing:.04em; color:#52647c; }
.mast .type { color:#185b9c; font-weight:730; }
.mast .number { display:inline-block; background:#185b9c; color:white; padding:2px 6px; margin-right:9px; }
.pagebody { position:relative; }
h1,h2,h3 { letter-spacing:-.035em; line-height:1.32; color:#11263e; break-after:avoid; }
h1 { font-size:28pt; margin:0 0 14px; font-weight:810; }
h2 { font-size:23pt; margin:0 0 12px; font-weight:780; }
h3 { font-size:11.2pt; margin:15px 0 5px; font-weight:730; color:#174b7b; }
p { margin:6px 0 10px; orphans:3; widows:3; }
strong { font-weight:720; }
ul { padding-left:17px; margin:6px 0 12px; }
li { margin:5px 0; break-inside:avoid; }
li::marker { color:#1b609e; }
a { color:#155b98; text-decoration:none; }
code { font-family:Consolas,Pretendard,monospace; font-size:.94em; padding:1px 3px; background:#edf3f8; border-radius:3px; }
table { border-collapse:collapse; width:100%; font-size:9.3pt; line-height:1.55; margin:13px 0 18px; }
th,td { border-bottom:1px solid #d8e1e9; padding:10px 9px; text-align:left; vertical-align:top; }
th { background:#edf4fa; color:#153c61; border-top:2px solid #185b9c; }
td:first-child { width:24%; font-weight:650; }
.endnote { margin-top:auto; border-top:1px solid #cbd6e0; padding-top:10px; font-size:8pt; color:#65768b; display:flex; justify-content:space-between; }
.portrait { float:right; width:28mm; margin:0 0 14px 21px; border:1px solid #dce5ec; }
.cover h2 { font-size:25pt; max-width:130mm; margin:20px 0 16px; }
.cover > p:first-of-type { font-size:11pt; }
.cover h3 { margin-top:23px; }
.tagline { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0 15px; }
.tagline span { font-size:8.2pt; font-weight:650; background:#edf4fa; color:#215c8d; padding:5px 9px; border-radius:3px; }
.metrics { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; padding:15px 0 14px; margin:12px 0 15px; border-top:2px solid #153c61; border-bottom:1px solid #d4dfe9; }
.metrics b { display:block; font-size:21pt; line-height:1.28; color:#185b9c; font-weight:800; letter-spacing:-.03em; }
.metrics span { display:block; font-size:8.7pt; color:#63758a; margin-top:4px; }
.metrics.two { grid-template-columns:1fr 1fr; }
.metrics.two b { font-size:20pt; }
figure { margin:12px 0 16px; break-inside:avoid; }
figcaption { font-size:8.5pt; font-weight:700; color:#4b6680; margin-bottom:7px; }
.flow-grid { display:grid; grid-template-columns:repeat(var(--columns),1fr); gap:8px; }
.node { background:#f2f6fa; border-top:2px solid #6496bc; padding:9px 9px 10px; position:relative; }
.node small { display:block; color:#5782a2; font-size:7.8pt; margin-bottom:4px; }
.node strong { display:block; font-size:10pt; margin-bottom:5px; color:#174b7b; }
.node span { display:block; font-size:8.3pt; line-height:1.45; color:#526b80; }
.comparison { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.comparison figcaption { grid-column:1/-1; margin:0; }
.comparison > div { border:1px solid #cbdbe7; background:#f5f8fb; padding:12px; }
.comparison strong { color:#185b9c; font-size:10pt; }
.comparison p { font-size:9.3pt; margin:6px 0; }
.comparison span { font-size:8.5pt; color:#62788b; }
.cv { font-size:10.1pt; line-height:1.55; }
.cv h2 { border-bottom:1px solid #cbd9e6; padding-bottom:6px; font-size:15pt; margin:17px 0 9px; }
.cv h3 { font-size:12pt; margin:15px 0 5px; }
.cv .pagebody > p > strong:only-child { color:#174b7b; }
.cv .endnote { font-size:7.7pt; }
.capture img { display:block; max-width:100%; width:100%; height:auto; border:1px solid #d4dfe9; }
.public-sites { font-size:9.7pt; line-height:1.52; }
.public-sites .capture { margin:8px 0 10px; }
.public-sites .capture img { max-height:54mm; object-fit:contain; background:#f6f8fa; }
.public-sites h3 { margin-top:14px; }
.with-workflow-capture { font-size:9.8pt; line-height:1.5; }
.with-workflow-capture h3 { margin-top:12px; }
.with-workflow-capture .capture { margin:10px 0 6px; }
.with-workflow-capture .capture img { max-height:42mm; object-fit:contain; }
.with-workflow-capture .capture + p { font-size:8.2pt; color:#5b7188; margin-top:5px; }
.public-code { font-size:9.6pt; line-height:1.5; }
.public-code h3 { margin-top:14px; }
.public-code .capture img { width:82%; margin:0 auto; }
.public-code .sample-grid { display:grid; grid-template-columns:1fr 1fr; gap:15px; }
.sample-grid figure { margin:5px 0 10px; }
.sample-grid img { width:100%; height:39mm; object-fit:cover; object-position:top; border:1px solid #d4dfe9; background:#f5f8fb; }
.sample-grid figcaption { font-size:8pt; line-height:1.48; margin-top:6px; color:#536a80; font-weight:450; }
.analysis-scope { background:#eef4f9; border-left:3px solid #185b9c; padding:10px 12px; margin-top:12px; }
.analysis-scope strong { color:#174b7b; font-size:9pt; }
.analysis-scope p { font-size:9pt; margin:5px 0 0; }
@media print { html { background:white; } main { padding:0; margin:0; max-width:none; } * { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
@media screen and (max-width:760px) { main { margin:0; padding:24px 20px; } .folio { height:auto; margin-bottom:35px; } .endnote { margin-top:20px; } .flow-grid { grid-template-columns:1fr 1fr; } .metrics,.metrics.two { grid-template-columns:1fr; } .comparison { grid-template-columns:1fr; } .mast .owner { display:none; } table { font-size:8.5pt; } th,td { padding:7px 5px; } h1 { font-size:25pt; } h2 { font-size:20pt; } }
`;
function html(doc) {
  const md = fs.readFileSync(path.join(sourceDir, doc.source), 'utf8');
  let parts = md.split(/<!--\s*page-break\s*-->/).map(x => x.trim());
  // Technical evidence leads; public screens support the completed product.
  if(doc.label==='portfolio')parts=[parts[0],parts[2],parts[3],parts[4],parts[5],parts[1],parts[6]];
  if (parts.length !== doc.pages) throw new Error(doc.label + ': unexpected source page count');
  const portrait = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root,'assets','portfolio','profile.jpg')).toString('base64');
  const headings = doc.label === 'portfolio' ? ['소개와 담당 범위','검색과 평가','데이터 조회','비동기와 동시성','배포와 데이터 연동','공개 사이트','공개 코드와 업무 화면'] : ['소개와 주요 경력','프로젝트와 이전 경력'];
  const pages = parts.map((part,i) => {
    const source = part.replace(/[–—‑]/g,'-').replace(/\*\*([^*\n]+)\*\*/g, (_,text) => '<strong>' + esc(text) + '</strong>');
    let body = embedImages(marked.parse(source, {gfm:true}));
    if (doc.label === 'portfolio' && i === 0) body = '<img class="portrait" src="' + portrait + '" alt="진솔 프로필 사진">' + body;
    if (doc.label === 'portfolio' && i >= 1 && i <= 4) {
      body = body.replace(/(<h2[^>]*>[\s\S]*?<\/h2>\s*<p>[\s\S]*?<\/p>)/, '$1' + visuals(i));
    }
    if(doc.label==='portfolio'&&i===4)body+='<aside class="analysis-scope"><strong>기존 Go 시스템 분석 경험</strong><p>API·인증·WebSocket·배포 구조 분석 → 신규 개발 설계 근거자료 정리</p></aside>';
    if (i === 0 && doc.label === 'portfolio') body = body.replace(/(<h1[^>]*>[\s\S]*?<\/h1>)/, '$1<div class="tagline"><span>SEARCH</span><span>BACKEND</span><span>DATA</span><span>OPERATIONS</span></div>');
    const pageClass=i===0?'cover':doc.label==='portfolio'?({5:'public-sites',3:'with-workflow-capture',6:'public-code'}[i]||''):'';
    return '<section class="folio"><div class="mast"><span class="type"><span class="number">' + String(i+1).padStart(2,'0') + '</span>' + esc(headings[i]) + '</span><span class="owner">진솔 · SOFTWARE ENGINEER · ' + (doc.label === 'cv' ? 'CV' : 'PORTFOLIO') + '</span></div><div class="pagebody ' + pageClass + '">' + body + '</div><div class="endnote"><span>' + (doc.label === 'cv' ? '업무 코드는 비공개이며 설계·문제 해결 사례는 포트폴리오에 정리했습니다.' : '실제 업무 기록에 기반한 담당 범위와 설계·검증 사례') + '</span><span>' + (i+1) + ' / ' + parts.length + '</span></div></section>';
  }).join('');
  return publicExport('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>진솔 | Software Engineer ' + (doc.label==='cv'?'CV':'Portfolio') + '</title><style>' + fontCss + css + '</style></head><body><main class="' + doc.label + '">' + pages + '</main></body></html>');
}
async function inspect(browser, doc, pdfFile, htmlFile) {
  const page = await browser.newPage({viewport:{width:1080,height:1000}});
  const pdfjs = process.env.PDFJS_MODULE || path.join(deps,'pdfjs-dist','build','pdf.js');
  try {
    await page.goto(pathToFileURL(htmlFile).href);
    await page.addScriptTag({path:pdfjs});
    const rows = await page.evaluate(async ({bytes,worker}) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc=worker;
      const pdf=await pdfjsLib.getDocument({data:Uint8Array.from(atob(bytes),x=>x.charCodeAt(0))}).promise;
      document.body.innerHTML='<div id="proof" style="display:grid;grid-template-columns:repeat(3,320px);gap:16px;padding:16px;background:#dae3ec"></div>';
      const rows=[];
      for(let i=1;i<=pdf.numPages;i++){
        const p=await pdf.getPage(i),vp=p.getViewport({scale:1.5});
        const canvas=document.createElement('canvas'); canvas.id='pdf-'+i;canvas.width=vp.width;canvas.height=vp.height;canvas.style.cssText='width:320px;height:auto;background:white';document.querySelector('#proof').append(canvas);
        await p.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
        const content=await p.getTextContent(),annotations=await p.getAnnotations();
        rows.push({page:i,text:content.items.map(x=>x.str).join(''),links:annotations.filter(x=>x.url).map(x=>x.url),characters:content.items.reduce((s,x)=>s+x.str.length,0)});
      }
      return rows;
    },{bytes:fs.readFileSync(pdfFile).toString('base64'),worker:pathToFileURL(path.join(path.dirname(pdfjs),'pdf.worker.js')).href});
    for(const row of rows){
      const b64=await page.locator('#pdf-'+row.page).evaluate(x=>x.toDataURL('image/png').split(',')[1]);
      fs.writeFileSync(path.join(proof,doc.label+'-'+row.page+'.png'),Buffer.from(b64,'base64'));
      assertPublicDocument(row.text.replaceAll('리얼타임테크','IT 솔루션 기업'),doc.label+' page '+row.page);
      if(row.characters<150)throw new Error(doc.label+': nearly blank page');
    }
    await page.locator('#proof').screenshot({path:path.join(proof,doc.label+'-all.png')});
    fs.writeFileSync(path.join(proof,doc.label+'-pages.json'),JSON.stringify(rows,null,2));
    if(rows.length!==doc.pages)throw new Error(doc.label+': expected '+doc.pages+' PDF pages, got '+rows.length);
    return rows;
  }finally{await page.close();}
}
(async()=>{
  fs.mkdirSync(output,{recursive:true}); fs.mkdirSync(proof,{recursive:true});
  const documents=[{label:'cv',source:'아스테로모프_CV.md',name:'진솔_CV_아스테로모프',pages:2},{label:'portfolio',source:'아스테로모프_포트폴리오.md',name:'진솔_포트폴리오_아스테로모프',pages:7}];
  const browser=await chromium.launch({headless:true,args:['--allow-file-access-from-files']});
  const report=[];
  try{
    for(const doc of documents){
      const htmlFile=path.join(output,doc.name+'.html'),pdfFile=path.join(output,doc.name+'.pdf');
      fs.writeFileSync(htmlFile,html(doc));
      const page=await browser.newPage({viewport:{width:680,height:1200}});
      try{
        await page.route(/^https?:\/\//,route=>route.abort());
        await page.goto(pathToFileURL(htmlFile).href,{waitUntil:'load'});await page.emulateMedia({media:'print'});
        await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(x=>x.decode()));});
        const overflow=await page.locator('.folio').evaluateAll(items=>items.map((p,i)=>({page:i+1,height:p.clientHeight,content:p.scrollHeight,body:p.querySelector('.pagebody').getBoundingClientRect().height})).filter(p=>p.content>p.height+2));
        if(overflow.length)throw new Error(doc.label+' page overflow '+JSON.stringify(overflow));
        await page.pdf({path:pdfFile,format:'A4',preferCSSPageSize:true,printBackground:true});
        await page.emulateMedia({media:'screen'});await page.setViewportSize({width:390,height:844});
        const widths=await page.evaluate(()=>({visible:innerWidth,content:document.documentElement.scrollWidth}));
        if(widths.content>widths.visible+2)throw new Error(doc.label+' mobile horizontal overflow');
      }finally{await page.close();}
      const pages=await inspect(browser,doc,pdfFile,htmlFile);
      const all=pages.map(x=>x.text).join('\n');
      if(all.includes('**'))throw new Error(doc.label+': unrendered Markdown emphasis');
      if(!all.includes('직원')||!all.includes('2인 팀')||!all.includes('분석'))throw new Error(doc.label+': expected scope statements missing');
      if(!all.includes('95.8%'))throw new Error(doc.label+': search metric missing');
      if(!all.includes('런앤점프'))throw new Error(doc.label+': public project missing');
      if(doc.label==='portfolio'){
        const links=pages.flatMap(p=>p.links);
        for(const host of ['bslawwin.co.kr','lawwin.co.kr','github.com/sorrybro2/runandjump-company'])if(!links.some(link=>link.includes(host)))throw new Error('Public project link missing: '+host);
      }
      if(fs.statSync(pdfFile).size>50*1024*1024)throw new Error(doc.label+': upload size exceeded');
      report.push({document:doc.name,pages:pages.length,pdf:pdfFile,bytes:fs.statSync(pdfFile).size});
    }
    fs.writeFileSync(path.join(proof,'documents.json'),JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
