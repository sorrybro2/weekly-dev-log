// Anonymize outward-facing exports without changing their internal evidence sources.
// This is a publication filter for these local documents, not a general HTML sanitizer.
// Current employer's name/domain (법무법인 법승 / law-win.co.kr) is intentionally shown; other
// employers' client identities, internal dev-log links, repo codenames, and exact accounting
// figures stay anonymized.
const confidentialRecord = /weekly-dev-log|(?:^|[/\\])(?:daily|weekly)(?:[/\\]|$)|github\.com\/lawwin-info\b/i;
const forbiddenIdentity = /리얼타임테크|공간정보융합팀|\blawwin-info\b|\bBS_[A-Z0-9_]+\b|\bETRI\b|한국전자통신연구원|\bKOGAS\b|한국가스기술공사|\bJubix\b|\bMD\s*\/\s*TYL\b|\bPCM\s*\/\s*SCM\s*\/\s*COM\s*\/\s*OMS\b/i;

function decode(value) {
  let result = String(value ?? '').replace(/&amp;/gi, '&').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10)));
  // Decode nested percent-encoding too, so an encoded source path cannot evade the guard.
  for (let i = 0; i < 2; i++) {
    try { result = decodeURIComponent(result); } catch { break; }
  }
  return result;
}

function confidentialUrl(value) {
  const decoded = decode(value);
  return confidentialRecord.test(decoded);
}

function publicText(value) {
  // Encoded image/font bytes can coincidentally contain short brand names; never edit them as text.
  const assets = [];
  return String(value ?? '').replace(/data:[^\s"'<>)]*/gi, data => '\uE000' + (assets.push(data) - 1) + '\uE001')
    .replace(/https?:\/\/[^\s<>"']+/gi, url => confidentialUrl(url) ? '내부 업무 기록' : url)
    .replace(/(?:www\.)?github\.com\/[^\s<>"']*weekly-dev-log[^\s<>"']*/gi, '내부 업무 기록')
    .replace(/\b(?:daily|weekly)\/[^\s<>"')]+/gi, '내부 업무 기록')
    .replace(/리얼타임테크/g, 'IT 솔루션 기업')
    .replace(/공간정보융합팀/g, '개발팀')
    .replace(/\bETRI\s*\(한국전자통신연구원\)|\bETRI\b|한국전자통신연구원/gi, '공공 연구기관')
    .replace(/\bKOGAS\s*\(한국가스기술공사\)|\bKOGAS\b|한국가스기술공사/gi, '에너지 공기업')
    .replace(/\bJubix\b/gi, '제조업 고객사')
    .replace(/\s*\(BS_[A-Z0-9_]+\)/g, '')
    .replace(/\bBS_[A-Z0-9_]+\b/g, '사내 저장소')
    .replace(/\blawwin-info\b/gi, '회사 조직')
    .replace(/파트너사\s*\(MD\s*\/\s*TYL\)/gi, '파트너사')
    .replace(/\bMD\s*\/\s*TYL\b/gi, '파트너사')
    .replace(/\(PCM\s*\/\s*SCM\s*\/\s*COM\s*\/\s*OMS\s*4종\)/gi, '(4종)')
    .replace(/\bPCM\s*\/\s*SCM\s*\/\s*COM\s*\/\s*OMS\b/gi, '점검 유형')
    .replace(/대전\s*·\s*부산\s*·\s*청주\s*3개 지사/g, '일부 지사')
    .replace(/월 차액 10,836,000원을 원인 2가지로 1원 단위까지 완전 분해/g, '월별 정산 차액을 두 가지 원인으로 분해해 금액 정합성을 검증')
    .replace(/(?:DB 자체 |DB )?미수금 중복 27쌍\(43,818,000원\)/g, 'DB 미수금 중복 데이터')
    .replace(/10,836,000원|43,818,000원/g, '회계 금액')
    .replace(/\uE000(\d+)\uE001/g, (_, index) => assets[Number(index)]);
}

function publicHtml(value) {
  let html = String(value ?? '');
  // Remove citation-only rows, but keep any result/limitation recorded after a citation.
  html = html.replace(/<li\b[^>]*>\s*<strong>근거<\/strong>([\s\S]*?)<\/li>/gi, (_, evidence) => {
    const remainder = evidence
      .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<code>\s*[0-9a-f]{7,40}\s*<\/code>/gi, '')
      .replace(/^[\s:;,.·]+|[\s:;,·]+$/g, '');
    return remainder ? '<li>' + remainder + '</li>' : '';
  });
  html = html.replace(/<a\b([^>]*?)\bhref\s*=\s*(["'])([\s\S]*?)\2([^>]*)>([\s\S]*?)<\/a>/gi,
    (anchor, before, quote, href, after, label) => confidentialUrl(href) ? label : anchor);
  // Company commit hashes are evidence identifiers, not useful public implementation detail.
  html = html.replace(/(?:\s*[,;]\s*)?<code>\s*[0-9a-f]{7,40}\s*<\/code>/gi, '');
  html = html.replace(/([.!?])\s+\.(?=\s*<\/)/g, '$1');
  html = html.replace(/data:image\/svg\+xml;base64,([a-z0-9+/=]+)/gi, (_, encoded) => {
    const svg = publicText(Buffer.from(encoded, 'base64').toString('utf8'));
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  });
  return publicText(html);
}

function assertPublicDocument(value, label = 'Public document') {
  const html = String(value ?? '');
  const sources = [{ label, text: html.replace(/data:[^\s"'<>)]*/gi, '') }];
  for (const match of html.matchAll(/data:image\/svg\+xml;base64,([a-z0-9+/=]+)/gi)) {
    sources.push({ label: label + ' embedded SVG', text: Buffer.from(match[1], 'base64').toString('utf8') });
  }
  for (const source of sources) {
    const text = decode(source.text);
    if (forbiddenIdentity.test(text)) throw new Error(source.label + ': company or client identifier remains');
    if (/weekly-dev-log/i.test(text)) throw new Error(source.label + ': confidential development record remains');
    if (/\b(?:daily|weekly)[/\\]/i.test(text)) throw new Error(source.label + ': confidential source path remains');
    if (/10,836,000원|43,818,000원/.test(text)) throw new Error(source.label + ': exact accounting amount remains');
    for (const match of text.matchAll(/\b(?:href|src)\s*=\s*(["'])([\s\S]*?)\1/gi)) {
      if (confidentialUrl(match[2])) throw new Error(source.label + ': confidential link remains');
    }
  }
  return true;
}

module.exports = { publicText, publicHtml, assertPublicDocument };
