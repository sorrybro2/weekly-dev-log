# 포트폴리오와 경력기술서 출력

포트폴리오 3쪽 요약본과 경력기술서를 포함한 전체본은 `node scripts/render-portfolio.cjs`로 생성합니다.
두 렌더러의 HTML·PDF 산출물은 모두 `경력기술서/출력/`에 저장됩니다.
앞 3쪽은 소개·대표 프로젝트·문제 해결 사례입니다. 전체본 4쪽은 **경력기술서** 제목과
문서 내부 목차로 시작하며, 이후에는 프로젝트별 상세 경력이 이어집니다.
`portfolio/personal-projects.md`는 독립 자료로 보관하고 전체본에 붙이지 않습니다.
문구·프로필 사진·서비스 캡처를 바꾸는 방법은 [포트폴리오 편집 가이드](../portfolio/README.md)를 참고하세요.

원문은 `경력기술서/경력기술서_TMI.md`, 도식은 `assets/career-tmi/*.svg`입니다.
원문 안의 도식·근거 링크는 원문 위치(`경력기술서/`) 기준의 상대 경로(`../assets/…`, `../daily/…`)입니다.
도식은 720px 너비에 17px 이상의 글자를 사용하며, 외부 폰트나 Mermaid CDN 없이 표시됩니다.

두 렌더러의 모든 출력은 `public-document.cjs`를 거칩니다. 현재 회사명(법무법인 법승)과
도메인은 그대로 표시하고, 이전 직장의 고객사명·내부 저장소명을 익명화하며 비공개 업무 기록
URL, 내부 커밋 식별자, 민감한 회계 금액을 제거합니다.
내장 SVG의 제목·설명도 처리하며, 기술 성과 수치와 미완료 조치에 관한 설명은 유지합니다.
원본 경력 Markdown·일일/주간 보고·SVG는 내부 근거 자료로 그대로 보관합니다.

공통 서체는 Pretendard Variable입니다. `scripts/document-fonts.cjs`가 `assets/fonts/`의 폰트와
OFL 라이선스를 HTML에 내장하고, PDF에도 사용 글리프를 포함합니다. 렌더링 중 폰트 다운로드는 없습니다.
본문 스타일은 `career-print.css`, 포트폴리오 앞부분은 `portfolio-print.css`에서 관리합니다.

`node scripts/render-career.cjs`를 실행하면 같은 원문으로 아래 두 파일을 갱신합니다.

- `경력기술서/출력/진솔_경력기술서_TMI.html`: 도식을 내장한 HTML
- `경력기술서/출력/진솔_경력기술서_TMI.pdf`: A4 PDF, 본문 10.5pt, 페이지 번호만 표시

일반 경력기술서 원문 `경력기술서/경력기술서.md`는 `node scripts/render-career.cjs --brief`로
`경력기술서/출력/진솔_경력기술서.html`과 `경력기술서/출력/진솔_경력기술서.pdf`를 갱신합니다. 포트폴리오 3쪽 요약과는 별도 문서입니다.

필요 모듈은 marked 12.0.2와 Playwright입니다. 준비되지 않은 환경에서는
`npm install --prefix scripts --no-save marked@12.0.2 playwright`와
`npx playwright install chromium`으로 설치합니다.
기존 설치를 사용하려면 `MARKED_MODULE`, `PLAYWRIGHT_MODULE` 환경변수에 모듈 경로를 지정할 수 있습니다.
선택적으로 `PDFJS_MODULE`에 PDF.js 모듈 경로를 지정하면 임시 폴더에 전체 페이지 미리보기와 페이지별 텍스트 검사 결과도 저장합니다.

포트폴리오 3쪽과 경력기술서 시작은 명확히 나누고, 상세 본문은 자연스럽게 이어지도록 출력합니다.
본문의 기술 설명은 분할할 수 있고, 제목과 그림에는 필요한 범위에서만 페이지 나눔 제한을 적용합니다.
홈페이지 V2 카드의 "서비스 보기"만 실제 공개 사이트로 연결되고, 나머지 링크는 전체본 안에서
같은 문서의 상세 항목으로만 이동합니다. `public-document.cjs`는 `content.json`에 등록된
프로젝트 URL만 허용하고, 그 외의 외부 링크가 남으면 출력을 실패시킵니다.
HTML을 단독 공유해도 사진·도식·폰트가 유지됩니다.
