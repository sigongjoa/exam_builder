#set document(title: "Exam Builder - [[TABLE]] 렌더링 수정 리포트")
#set page(
  paper: "a4",
  margin: (x: 2cm, y: 2cm),
  numbering: "1",
  footer: align(center, text(8pt, gray)[Exam Builder · /sc:duo 자동 생성 · 2026-02-23]),
)
#set text(font: "Noto Sans CJK KR", size: 10pt, lang: "ko")
#set heading(numbering: "1.")
#set par(leading: 0.65em)

#align(center)[
  #text(size: 20pt, weight: "bold")[Exam Builder]
  #v(0.3em)
  #text(size: 14pt)[표(Table) 렌더링 수정 리포트]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-23 | /sc:duo 자동 생성]
]

#line(length: 100%, stroke: 2pt + black)
#v(1em)

= 작업 개요

최예지 시험지 15번 문제에 3×3 표가 있어야 하는데, PDF에서 누락된 문제를 발견하고 수정했다.

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*\#*], [*문제*], [*영향 범위*],
  [1], [AI-Hub import 시 `문항(이미지)` 타입 표가 alt 텍스트로만 저장됨], [DB 데이터],
  [2], [`tableToTypst()` 결과물 `\#table(...)` 이 `latexToTypst()` 에서 `\\#`로 이스케이프됨], [PDF 렌더링],
)

= 근본 원인 분석

== 문제 1: AI-Hub import — 표 데이터 손실

AI-Hub 71859 데이터셋의 `문항(이미지)` class_name 항목은 실제 구조화 데이터 없이 alt 텍스트(`text_description`)만 존재한다. Import 스크립트가 이 타입을 처리하지 못해 표 내용이 DB에 저장되지 않았다.

*수동 복원:* AI-Hub 원본 ZIP에서 `S3_중등_2_001686.png` 이미지를 추출하여 표 구조를 확인 후 DB에 `[[TABLE]]` 마커 형식으로 수동 입력했다.

```
[[TABLE]]
$-x+5$|①|$-2x^{2}+x+3$
$-x^{2}$|$x^{2}-2x+2$|②
③|④|⑤
[[/TABLE]]
```

== 문제 2: `\#` 이스케이프 버그

#block(fill: rgb("#fff3f3"), stroke: (left: 3pt + red), inset: 8pt, width: 100%)[
```
처리 파이프라인 (AS-IS):
1. tableToTypst(p.question)  →  "#table(columns: 3, ...)"  ← 올바른 Typst 코드
2. latexToTypst(processedQ, true)  →  텍스트 모드에서 # → \# 이스케이프!
   결과: "\#table(columns: 3, ...)"  ← Typst 컴파일 오류
```
]

`latexToTypst()` 내부 line 25:
```js
// AS-IS: 텍스트 모드에서 #를 무조건 이스케이프
parts[i] = parts[i].replace(/_/g, '\\_').replace(/\*/g, '\\*').replace(/#/g, '\\#');
```

`\#table(...)` 는 Typst에서 오류가 아니라 `#table(...)` 함수 호출이 무력화되어 텍스트 `\#table(...)` 로 출력된다.

= 수정 내용 (`server/routes/pdf.js`)

== 수정: `tableToTypst()` → `renderQuestionContent()` 리팩터링

기존 2단계 파이프라인(`tableToTypst` → `latexToTypst`) 대신, sentinel 플레이스홀더를 활용한 4단계 안전 파이프라인으로 교체했다.

#block(fill: rgb("#f3fff3"), stroke: (left: 3pt + green), inset: 8pt, width: 100%)[
```js
// TO-BE: sentinel 방식으로 Typst 원시 블록 보호
function renderQuestionContent(question) {
  const rawBlocks = [];
  const PFX = '\x00TB';  // null byte: _, *, # 없음 → latexToTypst 이스케이프 안 됨
  const SFX = '\x00';

  // Step 1: [[TABLE]] 블록을 #table() Typst 코드로 변환, sentinel으로 대체
  let text = question.replace(/\[\[TABLE\]\]\n([\s\S]*?)\n\[\[\/TABLE\]\]/g,
    (match, tableContent) => {
      const rows = tableContent.trim().split('\n');
      const colCount = rows[0].split('|').length;
      let src = `#table(columns: ${colCount}, inset: 6pt, stroke: 0.5pt + black, align: center,\n`;
      rows.forEach(row => row.split('|').forEach(cell => {
        src += `  [${latexToTypst(cell.trim(), true)}],\n`;
      }));
      const idx = rawBlocks.push(src + ')') - 1;
      return `${PFX}${idx}${SFX}`;  // sentinel 반환
    });

  // Step 2: ㄴ,ㄷ,ㄹ,ㅁ 보기 앞 줄바꿈 삽입
  text = text.replace(/([^\n])[ \t]+(ㄴ\.)/g, '$1\nㄴ.')  /* ... */;

  // Step 3: LaTeX → Typst (sentinel에는 _, *, # 없으므로 안전)
  let rendered = latexToTypst(text, true);

  // Step 4: sentinel → 원래 Typst 코드 복원
  rawBlocks.forEach((block, idx) => {
    rendered = rendered.split(`${PFX}${idx}${SFX}`).join(block);
  });

  return rendered;
}
```
]

`buildExamTypst`에서 사용:
```js
// AS-IS (2단계, 버그)
const questionWithTable = tableToTypst(p.question);
const processedQ = questionWithTable.replace(...);
[#text(size: 9.5pt)[${latexToTypst(processedQ, true)}]]

// TO-BE (4단계, 안전)
const renderedQ = renderQuestionContent(p.question);
[#text(size: 9.5pt)[${renderedQ}]]
```

= 테스트 결과

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*\#*], [*테스트 항목*], [*결과*],
  [1], [sentinel `\x00TB0\x00` 이 `latexToTypst()` 통과 후 보존됨 (\_,\\\*,\\\# 없음)], [✅ PASS],
  [2], [`#table(...)` Typst 코드가 이스케이프 없이 복원됨], [✅ PASS],
  [3], [`[[TABLE]]` 없는 일반 문제 — 기존 동작 유지], [✅ PASS],
  [4], [최예지 시험지 (exam) PDF 생성 (1,368 KB)], [✅ PASS],
  [5], [15번 문제 3×3 표 렌더링 확인 (PDF 시각 검증)], [✅ PASS],
  [6], [수식 셀 `$-2x^{2}+x+3$` → `$-2 x^(2)+x+3$` 올바르게 변환], [✅ PASS],
  [7], [원문자 셀 `①②③④⑤` 그대로 표시], [✅ PASS],
)

= 시각 결과

== 최예지 시험지 2페이지 — 15번 표 렌더링 (수정 후)

#figure(
  image("assets/yeji_exam_p2_table.png", width: 100%),
  caption: [15번 문제: 3×3 표가 정상 렌더링됨. -x+5, ①, -2x²+x+3 / -x², x²-2x+2, ② / ③, ④, ⑤]
)

= 수정된 파일 목록

#table(
  columns: (1fr, 1fr),
  inset: 8pt,
  align: (left, left),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*파일*], [*변경 내용*],
  [`server/routes/pdf.js`], [`tableToTypst()` 제거, `renderQuestionContent()` 신규 추가 (sentinel 방식)],
  [`server/exam_builder.db`], [id:2874 question 필드 `[[TABLE]]` 마커 수동 입력 (이전 세션에서 완료)],
)

= 결론

#table(
  columns: (1fr, auto),
  inset: 8pt,
  align: (left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*항목*], [*상태*],
  [`\#` 이스케이프 버그 수정 (sentinel 방식)], [✅ 완료],
  [최예지 15번 3×3 표 PDF 렌더링], [✅ 완료],
  [수식/원문자 혼합 셀 정상 처리], [✅ 완료],
)

== 권장 후속 작업

1. *`문항(이미지)` 전수 조사*: 다른 문제에도 같은 방식의 표/도형 누락 가능 — DB 조사 필요
2. *`[[TABLE]]` 지원 문서화*: 선생님이 직접 표 문제를 입력할 때 `[[TABLE]]` 마커 사용법 안내
3. *import 스크립트 개선*: `문항(이미지)` 처리 로직 추가 (표 구조 자동 추출)
