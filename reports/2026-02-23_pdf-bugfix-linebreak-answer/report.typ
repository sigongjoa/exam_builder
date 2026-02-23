#set document(title: "Exam Builder - PDF 버그 수정 리포트")
#set page(
  paper: "a4",
  margin: (x: 2cm, y: 2cm),
  numbering: "1",
  footer: align(center, text(8pt, gray)[Exam Builder · /sc:duo 자동 생성 · 2026-02-23]),
)
#set text(font: "Noto Sans CJK KR", size: 10pt, lang: "ko")
#set heading(numbering: "1.")
#set par(leading: 0.65em)

// Title
#align(center)[
  #text(size: 20pt, weight: "bold")[Exam Builder]
  #v(0.3em)
  #text(size: 14pt)[PDF 버그 수정: 수식 개행 · 정답표 · 헤더 정렬]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-23 | /sc:duo 자동 생성]
]

#line(length: 100%, stroke: 2pt + black)
#v(1em)

= 작업 개요

== 배경

학원 선생님이 실제 학생용 시험지(최예지, 정지효 2월 정기고사)를 출력했을 때 다음 문제가 발견됐다:

1. *LaTeX 수식이 있는 줄마다 강제 줄바꿈* 발생 → 문제 본문 레이아웃 붕괴
2. *정답표에 숫자(1, 2, 3...)* 표시 → ①②③④⑤ 원문자가 아닌 숫자로 표시
3. *헤더 타이틀 위치 불균형* → 태그 유무에 따라 제목이 중앙에서 벗어남

Gemini가 PDF를 시각 분석하여 문제를 신고했고, sc:troubleshoot → sc:duo 워크플로우로 처리했다.

== 근본 원인 분석

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, left),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*버그*], [*원인*], [*증거*],
  [수식 개행], [`latexToTypst()` 기본 호출이 `parts.join(' $ ')` → Typst에서 `$ formula $` (공백 포함) = display math = 블록 렌더링], [DB 문제 본문의 모든 `$수식$`이 별도 줄로 렌더링됨],
  [정답표 숫자], [answer 필드가 `"1"`, `"2"` 등 정수 문자열인데 변환 없이 그대로 출력], [`latexToTypst("1")` = `"1"` 그대로 반환],
  [헤더 불균형], [`#stack(dir: ltr, spacing: 1fr)` 방식은 아이템 크기에 따라 간격 배분 → 빈 왼쪽 태그 시 타이틀 좌측 치우침], [시험지 타입(태그 없음) vs 정답지 타입(태그 있음) 비교],
)

= 수정 내용

수정 파일: `server/routes/pdf.js` (단일 파일만 수정)

== 버그 1: 수식 강제 개행 → inline math 적용

*Before*:
#block(fill: rgb("#fff3f3"), stroke: (left: 3pt + red), inset: 8pt, width: 100%)[
```js
// buildExamTypst 내 문제 본문 렌더링 (AS-IS)
[#text(size: 9.5pt)[${latexToTypst(p.question)}]]
//  ↑ inline=false (기본값) → ' $ formula $ ' → display math → 줄바꿈!
```
]

*After*:
#block(fill: rgb("#f3fff3"), stroke: (left: 3pt + green), inset: 8pt, width: 100%)[
```js
// (TO-BE) inline=true 인자 추가
[#text(size: 9.5pt)[${latexToTypst(p.question, true)}]]
//  ↑ inline=true → '$formula$' → inline math → 줄바꿈 없음 ✅
```
]

`latexToTypst()` 내부 분기 구조:
#block(fill: gray.lighten(90%), inset: 8pt, width: 100%)[
```js
if (arguments[1] === true) {
  // inline: join('$') → '$formula$' → Typst inline math
  return parts.map((p, i) => i % 2 === 1 ? p.trim() : p).join('$');
}
// display (구버전): join(' $ ') → '$ formula $' → Typst display math (블록!)
return parts.join(' $ ');
```
]

정답 박스(`showAnswers`)와 해설 박스(`showSolutions`)도 동일하게 `true` 인자 추가.

== 버그 2: 정답표 숫자 → 원문자 변환

*Before*: 정답표에 `1`, `2`, `3` 출력 (어떤 선택지인지 불명확)

*After*: 객관식 문제는 `①②③④⑤`로 변환

#block(fill: rgb("#f3fff3"), stroke: (left: 3pt + green), inset: 8pt, width: 100%)[
```js
// 정답표 + 문제별 정답 박스 모두 적용
const circles = ['①','②','③','④','⑤'];
const n = parseInt(p.answer);
const ans = (!isNaN(n) && n >= 1 && n <= 5) ? circles[n-1]
          : latexToTypst(String(p.answer), true);
// "1" → "①", "3" → "③", "$2x+1$" → "$2x+1$" (수식 그대로)
```
]

== 버그 3: 헤더 타이틀 중앙 정렬

*Before*: `#stack(dir: ltr, spacing: 1fr, [태그], [타이틀], [점수])`
- 태그가 비어있을 때 `spacing: 1fr` 배분이 왼쪽으로 치우침

*After*: `#grid(columns: (1fr, auto, 1fr), align: (left, center, right), ...)`
- 1fr 왼쪽 + auto 중앙(타이틀) + 1fr 오른쪽 → 항상 완벽 중앙

= 테스트 결과

#table(
  columns: (auto, 1fr, auto, auto),
  inset: 8pt,
  align: (center, left, center, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*\#*], [*테스트 항목*], [*결과*], [*크기*],
  [1], [최예지 시험지 (exam) PDF 생성], [✅ PASS], [1,398 KB],
  [2], [최예지 정답지 (answer) PDF 생성], [✅ PASS], [1,427 KB],
  [3], [정지효 시험지 (exam) PDF 생성], [✅ PASS], [1,380 KB],
  [4], [정지효 정답지 (answer) PDF 생성], [✅ PASS], [1,409 KB],
  [5], [inline=true 수식 변환 단위 테스트], [✅ PASS], [-],
  [6], [정답 원문자 변환 단위 테스트 (1→①, 5→⑤)], [✅ PASS], [-],
  [7], [Typst 컴파일 오류 없음 (4개 시험 전체)], [✅ PASS], [-],
)

= 시각 결과

== 최예지 정답지 (수정 후)

#figure(
  image("assets/screenshot_yeji_answer_final.png", width: 100%),
  caption: [최예지 2월 정기고사 정답지: 헤더 중앙 정렬, 수식 inline 렌더링, 정답 ①② 표시]
)

#pagebreak()

== 최예지 시험지 (수정 후)

#figure(
  image("assets/screenshot_yeji_exam.png", width: 100%),
  caption: [최예지 2월 정기고사 시험지: 수식이 줄바꿈 없이 문장 내 inline으로 렌더링]
)

== 정지효 정답지 (수정 후)

#figure(
  image("assets/screenshot_jiho_answer.png", width: 100%),
  caption: [정지효 2월 정기고사 정답지: 제곱근 수식 inline 렌더링, 정답 ①② 정답표]
)

= 데이터 품질 이슈 (별도 대응 필요)

코드 수정과 별개로 DB 데이터에서 확인된 이슈:

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, left),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*문제 ID*], [*이슈 내용*], [*현황*],
  [2887, 2870], [answer 필드에 숫자 대신 전체 LaTeX 수식 저장 (`"$2x^2+8y-4$"`)], [코드가 수식 그대로 표시 (fallback 동작)],
  [5747 (정지효5)], ["정답 2개" 문제인데 answer=`"2"`만 저장 (⑤ 누락)], [정답표가 불완전하게 표시됨],
)

이 데이터 이슈는 AI-Hub 71859 import 시 정답 매핑 오류로 추정되며, 별도 DB 수정 작업이 필요하다.

= 결론 및 다음 단계

== 완료된 수정

#table(
  columns: (1fr, auto),
  inset: 8pt,
  align: (left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*항목*], [*상태*],
  [수식 강제 개행 버그 수정 (`inline=true`)], [✅ 완료],
  [정답표 원문자 표시 (①②③④⑤)], [✅ 완료],
  [문제별 정답 박스 원문자 표시], [✅ 완료],
  [헤더 타이틀 중앙 정렬 (grid 방식)], [✅ 완료],
)

== 권장 후속 작업

1. *DB 데이터 수정*: answer 필드가 수식으로 저장된 문제들 정수로 수정 (id: 2887, 2870 등)
2. *복수 정답 지원*: "(정답 2개)" 유형 문제에 대한 answer 저장 형식 개선 (예: `"2,5"`)
3. *전체 시험 QA*: 현재 DB 내 모든 시험의 정답 정합성 일괄 검증
