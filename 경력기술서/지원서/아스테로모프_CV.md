# 진솔 | Software Engineer

**검색·데이터 처리·백엔드 서비스 개발 및 운영**  
연락처: 010-9914-3907 · 이메일: <mikely329@gmail.com>  
GitHub 개인: https://github.com/sorrybro2  
GitHub 업무용: https://github.com/js-sohlJin

TypeScript·Python으로 검색·랭킹, 데이터 처리와 비동기 백엔드를 구현하고 운영했습니다. pgvector·RRF 검색을 골든셋으로 평가하고, 원격 DB 조회와 실시간 이벤트 전달의 병목을 분석했습니다. 기능을 배포한 뒤에도 실제 응답·로그·데이터 정합성을 확인하며 운영 구조를 개선합니다.

## 기술

- **백엔드:** TypeScript, NestJS, Node.js(Express), Python, FastAPI, SQLAlchemy, Prisma
- **검색·데이터:** PostgreSQL, pgvector, pg_trgm, RRF, Vertex AI, RAG
- **실시간·운영:** asyncio, SSE, PostgreSQL LISTEN/NOTIFY, Docker, GCP Cloud Run·Cloud SQL·Cloud Build·Secret Manager
- **화면:** React, Next.js, Flutter / **이전 업무:** Spring Framework, FFmpeg, Ubuntu
- **시스템 분석:** Go(gin-gonic) 기반 REST API·인증·WebSocket 구조 분석

## 자격

정보처리기사 · SW개발_L5

## 경력

### 법무법인 법승 | 풀스택 개발

**2026.01.19 – 현재**

CRM·홈페이지 V2·사내 포털은 단독 구축했으며, 사건관리 앱은 2인 팀에서 상담·문서·전자결재·정산 도메인과 인프라·배포를 담당했습니다.

**법률 상담 RAG 검색·평가 | 홈페이지 V2 내부 모듈**

- 공개 문서 4,398건을 7,786조각으로 청킹·임베딩하고 pgvector 검색·Gemini 생성·SSE 스트리밍을 연결했습니다. 사건번호에 약한 의미 검색과 동의어에 약한 키워드 검색의 순위를 RRF로 결합했습니다.
- 실제 상담 본문을 참고해 개인정보를 제거한 골든셋 50문항으로 Recall@5 95.8%를 기록했습니다. 답변 거절 질문도 포함하고 검색 적합성과 답변 품질을 구분했습니다.
- 누적문 스트리밍 검사와 완료 후 URL·연락처 검사를 분리했습니다. 남은 시간으로 재시도를 제한하고 스트리밍 시작 후 재시도를 막았습니다. 직원 대상 시범 운영 중입니다.
- 별도 사례 요약·FAQ 기능은 생성·원문 대조 검사·비공개 분류를 연결한 파이프라인으로 구현해 3,038건을 공개했습니다. 생성 결과는 원문과 분리 저장하고 변경 시 재생성과 재검사를 연결했습니다.

<!-- page-break -->

**사건관리 앱 | FastAPI·SQLAlchemy·PostgreSQL, 2인 팀**

- `postgres_fdw` 원격 인라인 조인의 과도한 데이터 전송·로컬 필터링을 분석했습니다. 스케줄 선조회와 이름 정보의 배치 조회로 바꿔 응답을 8초에서 0.05초로 줄였습니다.
- 조인 키의 `text`·`character(8)` 타입 불일치로 인덱스를 못 쓰는 원인을 확인하고 명시적 캐스팅으로 복구했습니다. 목록 조회는 1,695ms에서 109ms로 개선했습니다.
- SQLAlchemy 세션 훅으로 업무 데이터와 감사로그를 같은 트랜잭션에 저장하고 커밋 후 이벤트를 발행했습니다. LISTEN/NOTIFY·접속자별 asyncio 큐·SSE를 연결하고, 운영 gzip·CDN 버퍼링을 해결했습니다.

**CRM·홈페이지 재구축 및 운영 | 단독 담당**

- Node.js·Flutter CRM과 Next.js·NestJS 홈페이지·CMS를 구축했습니다. 레거시 SQL Server의 730만 건을 PostgreSQL로 이관하고, 운영 중에는 원본 키 대조·중복 저장 방지·실패 및 미실행 감시를 갖춘 HTTPS API 동기화 경로를 구성했습니다.
- CRM의 MySQL 운영 시기에 Named Lock으로 다중 인스턴스의 스케줄러 중복 실행을 제어했습니다. 접수 점유 상태·수정 제한·만료 회수를 구현해 여러 직원의 접수 처리를 조율했습니다.
- Cloud Run·Cloud SQL·Secret Manager, Cloud Scheduler 예열, ALB·인증서·DNS를 구성했습니다. 사건관리 오배포를 롤백한 뒤 Dockerfile 명시·빌드·배포·응답 검증 절차를 다른 시스템에도 적용했습니다.
- 신규 홈페이지는 GCP Cloud Run·Cloud SQL에서 구축·운영하고, 기존 홈페이지는 가비아 Windows Server·IIS·SQL Server 환경에서 유지보수합니다.

### 리얼타임테크 | 공간정보융합팀

**인턴 2024.08 – 2025.02 / 사원 2025.03 – 2025.06**

- **ETRI CCTV:** Node.js 웹서비스 유지보수. FFmpeg 처리를 Windows·Ubuntu별로 분기하고 Ubuntu 스크립트 실행·배포에 대응했습니다.
- **KOGAS:** 기존 Go(gin)의 REST API·인증·WebSocket과 Docker·systemd 구조를 분석해 신규 개발 설계 근거자료로 정리했습니다.
- **Jubix:** Spring·PostgreSQL 출력·가공 로직, JavaScript·CSS 화면 기능과 레거시 코드를 개선했습니다.

## 공개 프로젝트

**런앤점프 컴퍼니 기업 홈페이지 | Next.js·TypeScript, 2026.05 – 08**  
회사소개와 사업별 콘텐츠 페이지를 구성하고, 회사정보·메뉴 데이터와 타입을 정의한 공통 UI 컴포넌트를 분리했습니다. GSAP·Lenis 스크롤 효과에 모션 감소 설정과 컴포넌트 해제 시 자원 정리를 적용하고, 탭·섹션 내비게이션을 구현했습니다.  
코드: https://github.com/sorrybro2/runandjump-company  
사이트: https://runandjump-five.vercel.app

업무 코드는 비공개이며 담당 범위·설계·검증은 별도 포트폴리오에 기술했습니다. 수치 기준일: 2026.10.12.
