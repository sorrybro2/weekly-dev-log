# TMI 경력기술서 출력

포트폴리오형 3쪽 요약본과 상세 경력 전체본은 `node scripts/render-portfolio.cjs`로 생성합니다.
문구·프로필 사진·서비스 캡처를 바꾸는 방법은 [포트폴리오 편집 가이드](../portfolio/README.md)를 참고하세요.

원문은 `경력기술서_TMI.md`, 도식은 `assets/career-tmi/*.svg`입니다.
도식은 720px 너비에 17px 이상의 글자를 사용하며, 외부 폰트나 Mermaid CDN 없이 표시됩니다.

`node scripts/render-career.cjs`를 실행하면 같은 원문으로 아래 두 파일을 갱신합니다.

- `진솔_경력기술서_TMI.html`: 도식을 내장한 HTML
- `진솔_경력기술서_TMI.pdf`: A4 PDF, 본문 10.5pt, 페이지 번호만 표시

일반 경력기술서 원문 `경력기술서.md`는 `node scripts/render-career.cjs --brief`로
`진솔_경력기술서.html`과 `진솔_경력기술서.pdf`를 갱신합니다. 포트폴리오 3쪽 요약과는 별도 문서입니다.

필요 모듈은 marked 12.0.2와 Playwright입니다. 준비되지 않은 환경에서는
`npm install --prefix scripts --no-save marked@12.0.2 playwright`와
`npx playwright install chromium`으로 설치합니다.
기존 설치를 사용하려면 `MARKED_MODULE`, `PLAYWRIGHT_MODULE` 환경변수에 모듈 경로를 지정할 수 있습니다.
선택적으로 `PDFJS_MODULE`에 PDF.js 모듈 경로를 지정하면 임시 폴더에 전체 페이지 미리보기와 페이지별 텍스트 검사 결과도 저장합니다.

글자 크기를 줄여 페이지 수를 맞추지 않고, 강제 새 페이지 없이 본문이 이어지도록 출력합니다.
본문의 기술 설명은 분할할 수 있고, 제목과 그림에는 필요한 범위에서만 페이지 나눔 제한을 적용합니다.
레거시 사례의 원본 보고 링크는 저장소에서 확인할 수 있습니다.
HTML을 단독 공유할 때도 그림은 유지되며, 원본 보고 링크는 GitHub의 업무 기록으로 연결합니다.
