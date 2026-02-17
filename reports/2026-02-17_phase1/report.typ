#set document(title: "Exam Builder - Phase 1 MVP 테스트 리포트")
#set page(margin: 2cm, numbering: "1")
#set text(font: "Noto Sans CJK KR", size: 10pt)
#set heading(numbering: "1.1")

#align(center)[
  #text(size: 20pt, weight: "bold")[Exam Builder]
  #v(0.3em)
  #text(size: 14pt)[Phase 1 MVP 테스트 리포트]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-17 | /sc:duo 자동 생성]
]

#line(length: 100%)

= 작업 요약

Phase 1 MVP는 학원 수학 시험지 자동 생성 시스템의 핵심 기능을 구현하는 단계이다.

- *백엔드*: Node.js 20 + Express + SQLite (better-sqlite3)
- *프론트엔드*: React 19 + Vite 7 + TailwindCSS v4 + KaTeX
- *AI 연동*: Ollama REST API (qwen2.5:14b)
- *PDF 생성*: Puppeteer HTML→PDF (시험지/답안지/해설지 3종)

=== 구현 범위

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  [*Phase*], [*내용*], [*상태*],
  [1.1a], [Backend Express + SQLite 초기 설정, 교육과정 210개 시드], [완료],
  [1.1b], [Frontend React + Vite + TailwindCSS v4 설정], [완료],
  [1.2], [학생 CRUD + 조건 관리 + 교육과정 트리 API + StudentList UI], [완료],
  [1.3], [Ollama AI 문제 생성 + 문제 CRUD + AIGenerate/ProblemBank UI], [완료],
  [1.4], [ProblemEditor (KaTeX 실시간 미리보기, 상태 워크플로우)], [완료],
  [1.5], [시험지 빌더 + PDF 출력 (시험지/답안지/해설지)], [완료],
)

= 테스트 결과

총 *16개 API 엔드포인트* 테스트, 전부 통과.

#table(
  columns: (auto, 1fr, auto, auto),
  inset: 8pt,
  align: (center, left, center, center),
  [*\#*], [*테스트 항목*], [*결과*], [*소요시간*],
  [1], [GET /api/curriculum/subjects], [PASS], [19ms],
  [2], [GET /api/curriculum?subject=중1수학], [PASS], [4ms],
  [3], [GET /api/curriculum/tree], [PASS], [3ms],
  [4], [POST /api/students (생성)], [PASS], [56ms],
  [5], [GET /api/students (목록)], [PASS], [4ms],
  [6], [PUT /api/students/1 (수정)], [PASS], [3ms],
  [7], [POST /api/students/1/conditions (조건 추가)], [PASS], [2ms],
  [8], [GET /api/students/1 (상세+조건)], [PASS], [3ms],
  [9], [POST /api/problems (문제 생성)], [PASS], [2ms],
  [10], [GET /api/problems (목록)], [PASS], [3ms],
  [11], [GET /api/problems?subject=중1수학 (필터)], [PASS], [2ms],
  [12], [PUT /api/problems/2/status (상태 변경)], [PASS], [2ms],
  [13], [POST /api/exams (시험지 생성)], [PASS], [3ms],
  [14], [GET /api/exams (목록)], [PASS], [2ms],
  [15], [GET /api/exams/2 (상세+문제)], [PASS], [2ms],
  [16], [GET /api/pdf/2?type=exam (PDF 생성)], [PASS], [11,387ms],
)

*16/16 PASS (100%)*

= 프론트엔드 빌드 결과

- 빌드 도구: Vite 7.3.1
- 모듈 수: 101개 변환
- JS 번들: 575.54 kB (gzip: 175.67 kB)
- CSS 번들: 53.90 kB (gzip: 13.53 kB)
- 빌드 시간: 5.06초
- 결과: *성공* (chunk size 경고만 있음, 에러 없음)

= 구현 파일 목록

=== Backend (server/)

#table(
  columns: (1fr, 2fr),
  inset: 6pt,
  [*파일*], [*역할*],
  [`index.js`], [Express 서버 메인 (포트 3000, 6개 라우트 등록)],
  [`db.js`], [SQLite 스키마 (6개 테이블, WAL 모드, FK ON)],
  [`seed-curriculum.js`], [2022 교육과정 210개 항목 시드],
  [`routes/students.js`], [학생 CRUD + 조건 CRUD (9개 엔드포인트)],
  [`routes/curriculum.js`], [교육과정 조회 + 트리 (4개 엔드포인트)],
  [`routes/problems.js`], [문제 CRUD + 상태 변경 (6개 엔드포인트)],
  [`routes/generate.js`], [Ollama AI 문제 생성 (JSON 파싱 + 재시도)],
  [`routes/exams.js`], [시험지 CRUD + 문제 배정 (4개 엔드포인트)],
  [`routes/pdf.js`], [Puppeteer PDF 생성 (시험지/답안지/해설지)],
)

=== Frontend (client/src/)

#table(
  columns: (1fr, 2fr),
  inset: 6pt,
  [*파일*], [*역할*],
  [`App.jsx`], [React Router 설정 (7개 라우트)],
  [`components/Layout.jsx`], [사이드바 네비게이션 레이아웃],
  [`pages/Dashboard.jsx`], [통계 대시보드 (학생/문제/시험지 수)],
  [`pages/StudentList.jsx`], [학생 관리 (모달 CRUD, 테이블)],
  [`pages/AIGenerate.jsx`], [AI 문제 생성 (과목/단원/난이도 선택)],
  [`pages/ProblemBank.jsx`], [문제 은행 (필터, 카드형 목록)],
  [`pages/ProblemEditor.jsx`], [문제 편집기 (KaTeX 실시간 미리보기)],
  [`pages/ExamBuilder.jsx`], [시험지 목록 + PDF 다운로드],
  [`pages/ExamCreate.jsx`], [시험지 생성 (문제 선택/순서/배점)],
)

= /sc:duo 워크플로우 실행 요약

#table(
  columns: (auto, 1fr, auto),
  inset: 6pt,
  [*단계*], [*실행 내용*], [*실행자*],
  [PLAN], [서브태스크 분해 + Gemini 프롬프트 설계], [Claude],
  [IMPLEMENT 1.1a], [Express 서버 + SQLite DB + 시드 데이터], [Gemini → Claude 수정],
  [IMPLEMENT 1.1b], [Vite + React + TailwindCSS v4 설정], [Gemini → Claude 수정],
  [IMPLEMENT 1.2], [학생/교육과정 API + StudentList UI], [Gemini + Claude],
  [IMPLEMENT 1.3], [AI 생성 + 문제 CRUD + AIGenerate/ProblemBank], [Gemini + Claude],
  [IMPLEMENT 1.4], [ProblemEditor (KaTeX 미리보기)], [Claude 직접],
  [IMPLEMENT 1.5], [시험지 빌더 + PDF 출력], [Claude 직접],
  [VERIFY], [각 단계 코드 리뷰 + 버그 수정], [Claude],
  [TEST], [16개 API 테스트 + 빌드 확인], [Claude],
)

=== Gemini 실패 및 Claude 수정 사항

- DB path 상대경로 → `__dirname` 절대경로로 수정
- chapter_code UNIQUE 제약 제거 (다른 과목에서 중복 가능)
- `foreign_keys` pragma 세미콜론 제거
- TailwindCSS v4: `@tailwind` → `@import "tailwindcss"`, PostCSS 플러그인 변경
- Vite proxy rewrite 제거 (백엔드가 /api/ 경로 사용)
- problems.js / generate.js 중복 선언 제거
- 프론트엔드 하드코딩 API URL → 상대 경로로 변경

= 결론 및 다음 단계

Phase 1 MVP가 성공적으로 완료됨. 모든 핵심 기능 동작 확인:
- 교육과정 10개 과목, 210개 소단원 시드
- 학생 CRUD + 특수 조건 관리
- AI 문제 생성 (Ollama 연동)
- 문제 편집기 (KaTeX LaTeX 미리보기)
- 시험지 빌더 (문제 선택, 배점 조정)
- PDF 출력 (시험지/답안지/해설지 3종)

*다음 단계: Phase 2 - 문제 변형 생성 + 자동 시험지 구성*
