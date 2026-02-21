#set document(title: "Exam Builder - Phase 5 ExamCreate 재설계 리포트")
#set page(paper: "a4", margin: (x: 2cm, y: 2cm), numbering: "1")
#set text(font: "Noto Sans CJK KR", size: 10pt, lang: "ko")
#set heading(numbering: "1.")
#show heading: it => { v(0.8em); it; v(0.3em) }

#align(center)[
  #text(size: 22pt, weight: "bold")[Exam Builder]
  #v(0.3em)
  #text(size: 15pt, fill: rgb("#4F46E5"))[Phase 5 — 문제 출제 UI 전면 재설계]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-21 | /sc:duo (Claude + Gemini CLI) 자동 생성]
]

#line(length: 100%, stroke: 0.5pt + gray)
#v(0.5em)

= 작업 요약

== 배경
족보닷컴(Zocbo Cloud) UI를 벤치마크 분석한 결과, 기존 `ExamCreate.jsx`의 4탭 방식(수동/자동/그룹/스마트)이 복잡하고 직관성이 낮았다. 로그인 후 족보닷컴의 실제 출제 화면은 *좌우 2패널 + 단원 트리 체크박스 + 슬라이더 문제수* 구조로 더 깔끔하다는 점을 확인하고, 동일 패턴으로 재설계를 진행했다.

== 구현 목표
#table(
  columns: (auto, 1fr, auto),
  inset: 7pt,
  align: (center, left, center),
  stroke: 0.4pt + gray,
  [*\#*], [*요구사항*], [*결과*],
  [1], [중등/고등 탭으로 학년 그룹화], [✅ PASS],
  [2], [좌(60%) 단원트리 / 우(40%) 설정 2패널], [✅ PASS],
  [3], [대단원 접기/펼치기 + 소단원 체크박스], [✅ PASS],
  [4], [슬라이더 문제수 (5~30)], [✅ PASS],
  [5], [난이도 버튼 3개 (쉽게/기본/어렵게)], [✅ PASS],
  [6], [상세 난이도 % 설정 + 합계 검증], [✅ PASS],
  [7], [문제형식 버튼 (객관식만/서술형만/혼합)], [✅ PASS],
  [8], [3단계 wizard 인디케이터], [✅ PASS],
  [9], [대단원 전체선택 버튼], [✅ PASS],
  [10], [선택 단원 chip 목록 표시], [✅ PASS],
)

= 구현 세부 내용

== 아키텍처 변경

기존 `ExamCreate.jsx`는 수동/자동/그룹/스마트 4가지 모드를 탭으로 구분했으나, 새 설계에서는 *스마트 출제만* 남기고 나머지는 제거했다. 수동 선택은 `ProblemBank` 페이지에서 접근 가능하므로 중복이었다.

*상태 구조 비교:*

#table(
  columns: (1fr, 1fr),
  inset: 7pt,
  stroke: 0.4pt + gray,
  [*기존 (복잡)*], [*신규 (단순)*],
  [`mode, autoCount, batchGroup, batchPrefix, groups, allProblems, selected, filterSubject, filterDifficulty, filterStatus, smartSubject, curriculumItems, selectedChapterCodes, expandedLevel1, expandedLevel2, smartTotalCount, diffRatio, mcRatio, smartTitle, smartExamType, smartStudentId` (22개 상태)],
  [`gradeTab, selectedSubject, curriculumItems, selectedCodes, expandedL1, title, examType, studentId, students, problemCount, diffPreset, diffRatio, showCustomDiff, typePreset, isLoading, msg` (16개 상태)],
)

== 핵심 기능 구현

*단원 트리 구조:*
```
과목 선택 → curriculumItems 로드 (GET /api/curriculum?subject=...)
→ level1(대단원) 별로 groupBy
  → level2(중단원) 그룹 표시
    → level3(소단원) 체크박스 (chapter_code)
```

*난이도 프리셋:*
- 쉽게: `{1: 50, 2: 40, 3: 10}`
- 기본: `{1: 30, 2: 50, 3: 20}` (default)
- 어렵게: `{1: 10, 2: 40, 3: 50}`
- 상세설정: 직접 % 입력, 합계 100% 검증

*API 호출:*
```
POST /api/exams/smart {
  title, exam_type, student_id, subject,
  chapter_codes: Array.from(selectedCodes),
  total_count: problemCount,
  difficulty_ratio: diffRatio,
  type_ratio: getTypeRatio()
}
```

= 테스트 결과

== 스크린샷 1: 초기 화면

#figure(
  image("assets/01_initial.png", width: 100%),
  caption: [초기 화면 — 중등 탭 기본 선택, 우측 패널에 설정 전체 표시]
)

== 스크린샷 2: 과목 선택 후

#figure(
  image("assets/02_subject_selected.png", width: 100%),
  caption: [중1수학 선택 → 4개 대단원(I.수와연산 II.변화와관계 III.도형과측정 IV.자료와가능성) 표시]
)

== 스크린샷 3: 대단원 펼치기

#figure(
  image("assets/03_expanded.png", width: 100%),
  caption: [I.수와연산 펼치기 → 2개 중단원(소인수분해, 정수와유리수) + 소단원 체크박스 2컬럼 표시]
)

== 스크린샷 4: 단원 선택 후 (생성 버튼 활성화)

#figure(
  image("assets/04_checked.png", width: 100%),
  caption: [3개 소단원 체크 → 하단 chip 표시, 우측 wizard ① 활성, 생성 버튼 파란색으로 활성화]
)

= 버그 수정 이력 (Claude 직접 수정)

Gemini CLI가 3회 시도에서 파일을 디스크에 저장하지 않는 문제가 반복되어 3번째 시도에서 성공. 이후 Claude가 다음 2가지를 직접 수정:

#table(
  columns: (auto, 1fr, 1fr),
  inset: 7pt,
  stroke: 0.4pt + gray,
  [*\#*], [*문제*], [*수정*],
  [1], [`HIGH_SUBJECTS`에 `'확률과 통계'` (공백 포함)로 DB와 불일치], [`'확률과통계'` (공백 없음)로 수정],
  [2], [슬라이더 `max=40`으로 스펙 초과], [`max=30`으로 수정],
)

= 결론 및 다음 단계

== 완료된 작업
- `ExamCreate.jsx` 503줄로 전면 재설계 완료
- Zocbo 스타일 좌우 2패널 레이아웃 구현
- 10개 과목 × 210개 소단원 전체 커리큘럼 체계적 탐색 가능
- 모든 테스트 케이스 PASS

== 다음 단계 제안 (Phase 6)
+ *학생 취약점 분석 시스템* — 채점 데이터 기반 약점 단원 자동 식별
+ *시험지 미리보기* — 생성 전 문제 구성 확인 UI
+ *단원별 문제 수 현황* — 각 chapter_code의 실제 문제 수 표시 (chip에 뱃지)
