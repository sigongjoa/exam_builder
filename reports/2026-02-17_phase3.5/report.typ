#set document(title: "Exam Builder - Phase 3.5 테스트 리포트")
#set page(margin: 2cm, numbering: "1")
#set text(font: "Noto Sans CJK KR", size: 10pt)
#set heading(numbering: "1.1")

#align(center)[
  #text(size: 20pt, weight: "bold")[Exam Builder]
  #v(0.3em)
  #text(size: 14pt)[Phase 3.5: 난이도별 맞춤 시험지 시스템]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-17 | /sc:duo 자동 생성]
]

#line(length: 100%)

= 작업 요약

AI-Hub 71859에서 import된 9,933건의 수학 문제 데이터를 활용하여, 선생님이 난이도 비율과 단원을 지정하면 자동으로 시험지를 생성하는 "스마트 출제" 시스템을 구현했다.

*변경된 파일 5개:*
- `server/routes/problems.js` — 페이지네이션 + 키워드 검색 + 다중 단원 필터
- `server/routes/exams.js` — POST /api/exams/smart 엔드포인트
- `server/routes/pdf.js` — Buffer.from() 버그 수정 (Puppeteer Uint8Array 호환)
- `client/src/pages/ProblemBank.jsx` — 페이지네이션 UI + 검색
- `client/src/pages/ExamCreate.jsx` — 스마트 모드 탭 (단원 트리 + 난이도 슬라이더)

*구현 방식:* Claude 설계/감독 + Gemini CLI 코드 생성 (sc:duo)

= 테스트 결과

#table(
  columns: (auto, 1fr, auto, auto),
  inset: 8pt,
  align: (center, left, center, center),
  table.header([*\#*], [*테스트 항목*], [*결과*], [*비고*]),
  [1], [GET /api/problems?page=1&limit=5], [PASS], [9,940건 중 5건 반환],
  [2], [GET /api/problems?search=소인수], [PASS], [64건 검색 결과],
  [3], [POST /api/exams/smart (비율 40/40/20)], [PASS], [하4/중4/상2 정확],
  [4], [npm run build (프론트엔드)], [PASS], [9.95초 빌드 완료],
  [5], [Playwright 스크린샷 (ProblemBank)], [PASS], [페이지네이션 + 검색 확인],
  [6], [Playwright 스크린샷 (ExamCreate Smart)], [PASS], [단원 트리 + 슬라이더 확인],
  [7], [E2E: 스마트 시험지 생성 (15문제)], [PASS], [하6/중6/상3 배분 정확],
  [8], [PDF 생성: 시험지 (exam)], [PASS], [133KB, 3페이지, KaTeX 수식 렌더링],
  [9], [PDF 생성: 답안지 (answer)], [PASS], [172KB, 정답 표시 + 정답표],
  [10], [PDF 생성: 해설지 (solution)], [PASS], [196KB, 5페이지, 풀이 포함],
)

= API 테스트 로그
#raw(block: true, lang: "text", read("assets/api_test_output.txt"))

= 스크린샷: 문제 은행 (페이지네이션)

#figure(
  image("assets/screenshot_problembank.png", width: 95%),
  caption: [문제 은행 — 총 9,940건 중 1-20 표시, 필터 + 검색 input 추가됨]
)

= 스크린샷: 문제 은행 (검색 결과)

#figure(
  image("assets/screenshot_problembank_search.png", width: 95%),
  caption: [키워드 '소인수' 검색 — 총 64건 중 1-20 표시]
)

= 스크린샷: 스마트 출제 (초기 화면)

#figure(
  image("assets/screenshot_smart_mode.png", width: 85%),
  caption: [스마트 출제 모드 — 과목 선택 전 초기 상태. 난이도 비율 슬라이더(하40/중40/상20), 유형 비율(객관식70/서술형30), 미리보기(하8/중8/상4=총20문제) 표시]
)

= 스크린샷: 스마트 출제 (단원 트리)

#figure(
  image("assets/screenshot_smart_curriculum.png", width: 85%),
  caption: [공통수학1 선택 시 단원 트리 로드 — I.다항식, II.방정식과 부등식, III.경우의 수, IV.행렬]
)

= 스크린샷: 스마트 출제 (단원 선택 완료)

#figure(
  image("assets/screenshot_smart_tree_expanded.png", width: 85%),
  caption: [I.다항식 대단원 체크 → 하위 8개 소단원 전체 선택. 3단계 접이식 트리(대단원→중단원→소단원) 동작 확인]
)

= E2E 테스트: 실제 시험지 PDF 생성

스마트 출제 API로 실제 시험지를 생성하고 PDF 3종(시험지/답안지/해설지)을 출력하여 검증했다.

- *요청*: POST /api/exams/smart — 공통수학1, 15문제, 난이도 비율 40/40/20
- *결과*: exam ID=7, 하6/중6/상3 정확 배분
- *버그 발견 및 수정*: Puppeteer가 Uint8Array를 반환하여 JSON으로 직렬화되는 문제 → `Buffer.from(pdfData)` 추가

== 시험지 (exam) — 1페이지

#figure(
  image("assets/pdf_exam-1.png", width: 75%),
  caption: [2월 스마트 월말고사 시험지 — 15문제(객관식+서술형), KaTeX 수식 렌더링, A4 포맷]
)

== 답안지 (answer) — 1페이지

#figure(
  image("assets/pdf_answer-1.png", width: 75%),
  caption: [답안지 — 정답 빨간색 표시, 하단에 정답표 포함]
)

== 해설지 (solution) — 1페이지

#figure(
  image("assets/pdf_solution-1.png", width: 75%),
  caption: [해설지 — 각 문제별 풀이 과정 포함 (보라색 좌측 보더)]
)

= 구현 상세

== 백엔드: 페이지네이션 (problems.js)
- `buildWhereClause`에 `search` (LIKE 검색)과 `chapter_codes` (IN 절) 필터 추가
- GET /api/problems → `{problems, total, page, totalPages}` 형식 반환
- COUNT(\*) 쿼리로 전체 건수 조회 후 LIMIT/OFFSET 적용

== 백엔드: 스마트 시험지 (exams.js)
- difficulty_ratio 비율 합계 정규화 + 반올림 보정
- 각 난이도별로 chapter_codes IN 절 + status='approved' + RANDOM() LIMIT N
- type_ratio 지원: 각 난이도 내에서 객관식/서술형 비율 분배
- 트랜잭션으로 exam + exam_problems 일괄 INSERT

== 프론트엔드: ProblemBank.jsx
- 검색 input (Enter/버튼 클릭 시 검색)
- "총 N건 중 X-Y" 건수 표시
- 이전/다음 + 페이지 번호 (1 ... [7] ... 497)

== 프론트엔드: ExamCreate.jsx 스마트 모드
- 4번째 탭 "스마트 출제" 추가
- 과목 선택 → curriculum API → 3단계 접이식 체크박스 트리
- 대단원 체크 시 하위 전체 선택/해제 (indeterminate 상태 지원)
- 난이도 비율 슬라이더 3개 (합계 100% 자동 조정)
- 유형 비율 (객관식/서술형) 슬라이더
- 미리보기: "하 N문제 / 중 N문제 / 상 N문제 = 총 N문제"

= sc:duo 분업 결과

#table(
  columns: (auto, 1fr, auto, auto),
  inset: 8pt,
  align: (center, left, center, center),
  table.header([*파일*], [*작업*], [*담당*], [*결과*]),
  [problems.js], [페이지네이션], [Gemini], [1회 성공],
  [exams.js], [스마트 API], [Gemini + Claude], [Gemini 구현 + Claude 1줄 수정],
  [ProblemBank.jsx], [페이지네이션 UI], [Gemini + Claude], [Gemini 구현 + Claude 1줄 수정],
  [ExamCreate.jsx], [스마트 모드 UI], [Claude 직접], [Gemini 8회+ 실패 → Claude 전체 재작성],
)

*교훈:* Gemini CLI는 백엔드 단일 파일 수정에 강하지만, 대형 JSX (300+행) 편집에서는 replace 도구 반복 실패. 프론트엔드 복잡 작업은 Claude 직접 수정이 더 효율적.

= 결론 및 다음 단계

Phase 3.5 완료. 9,940건의 문제 DB에서 난이도/단원/유형 비율을 지정하여 자동으로 시험지를 생성할 수 있게 되었다.

*다음 단계 (Phase 4):*
- 학생 취약점 분석 시스템
- 시험 결과 기반 단원별 정답률 추적
- 취약 단원 자동 보충 시험지 생성
