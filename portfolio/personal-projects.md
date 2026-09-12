# 개인 포트폴리오 — React·Next.js

2025년 개인 개발과 학습을 시작해 팀 프로젝트의 검색·인증·공통 UI 구현으로 경험을 넓혔습니다.

## 내 냉장고를 구해줘 · 팀 프로젝트

**기여 기간** 2026.01–04 · **기술** React, Vite, React Router, Context, Axios

- **검색·상태관리**: 입력 값과 실행 검색어, 최초·추가 로딩, 다음 커서를 구분하고 IntersectionObserver 기반 무한 스크롤과 API 연동을 구현했습니다.
- **로딩·오류 처리**: 검색 페이지에 React.lazy·Suspense·ErrorBoundary를 적용하고 초기화 순서와 빈 응답 처리를 보완했습니다.
- **공통 UI·인증**: 입력·버튼·모달과 냉장고·분류 화면을 개발했습니다. Context 기반 UserProvider의 세션 복구, 보호 화면 복귀, 로그아웃 상태 유지를 개선했습니다.
- **코드**: [프로젝트](https://github.com/cliffside-potatoes/Frontend) · [무한 스크롤](https://github.com/cliffside-potatoes/Frontend/commit/8292c69) · [지연 로딩](https://github.com/cliffside-potatoes/Frontend/commit/c9f557a) · [인증 상태 복구](https://github.com/cliffside-potatoes/Frontend/commit/46cc8224a211f7efcdd10df29928c27b8a512613)

## DateWebApp · 개인 공통 UI 개발

**구현 시점** 2025.04.30 · **기술** React, TypeScript, styled-components

React 웹·React Native 앱 모노레포의 초기 구성과 공통 UI 패키지를 작성했습니다. Button의 variant·size·disabled·fullWidth 속성과 색상·폰트·간격 테마를 구현했습니다. [당시 구현 커밋](https://github.com/sorrybro2/DateWebApp/commit/e836916aca75ca4e0fca2bbe0e3f91f7d41a2041)

## React·Next.js 학습과 적용

| 시점 | 학습·실습 내용 | 코드·기록 |
|---|---|---|
| 2025.12 | React Todo: useState·useRef, 컴포넌트·props, 불변 업데이트, 추가·검색·완료·삭제 | [Todo 학습 기록](https://github.com/sorrybro2/react-todolist/blob/main/README.md) |
| 2025.12 | Next.js Pages Router: useRouter, 쿼리스트링, 동적 경로, 404 | [라우팅 실습](https://github.com/sorrybro2/nextjs-practice) |
| 2026.04–05 | 강의 실습: App Router·Server Actions·인증 API 연동, TanStack Query의 useQuery·queryKey·로딩 처리 | [실습 코드](https://github.com/sorrybro2/inflearn-fullstack-clone/blob/main/frontend/app/api-test/client-test.tsx) · [React Query 노트](https://github.com/sorrybro2/inflearn-fullstack-clone/blob/main/docs/04-react-query.md) |
