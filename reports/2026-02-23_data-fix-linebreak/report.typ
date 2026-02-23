#set document(title: "Exam Builder - 데이터 수정 & ㄱ,ㄴ,ㄷ 개행 처리 리포트")
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
  #text(size: 14pt)[데이터 정규화 & ㄱ,ㄴ,ㄷ 개행 처리 리포트]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-23 | /sc:duo 자동 생성]
]

#line(length: 100%, stroke: 2pt + black)
#v(1em)

= 작업 개요

이번 작업은 두 가지 독립적인 문제를 다룬다.

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*\#*], [*문제*], [*영향 범위*],
  [1], [MC 문제 answer 필드 데이터 오류 (600건)], [DB 데이터],
  [2], [ㄱ,ㄴ,ㄷ,ㄹ,ㅁ 보기 항목 개행 미처리], [PDF 렌더링],
)

= 문제 1: MC answer 필드 데이터 오류

== 원인 분석

AI-Hub 71859 데이터셋을 import할 때 `scripts/import-aihub-71859.js`의 `extractAnswerNumber()` 함수 버그가 원인이다.

#block(fill: rgb("#fff3f3"), stroke: (left: 3pt + red), inset: 8pt, width: 100%)[
```js
// 버그가 있는 원래 코드 (import-aihub-71859.js)
function extractAnswerNumber(answerTexts) {
  const circleNums = { '①': '1', '②': '2', ... };
  for (const text of answerTexts) {
    for (const [circle, num] of Object.entries(circleNums)) {
      if (text.startsWith(circle)) return num;  // ① 로 시작할 때만 성공
    }
  }
  return answerTexts.join('\n');  // ← 나머지는 전체 텍스트를 그대로 저장!
}
```
]

AI-Hub 원본 데이터에서 정답이 `$3^3 \times 5^2$` 같은 수식으로만 저장된 경우, 또는 `ㄴ, ㄷ` 같은 텍스트로 저장된 경우 → ①~⑤ prefix가 없어 fallback으로 전체 텍스트가 answer 필드에 저장됐다.

*이것은 사용자 데이터를 임의로 수정한 것이 아니라, import 로직이 모든 AI-Hub 데이터 형식을 처리하지 못한 것이다.*

== 데이터 오류 현황 (수정 전)

#table(
  columns: (1fr, auto),
  inset: 8pt,
  align: (left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*오류 유형*], [*건수*],
  [수식 텍스트로 저장 (`$3^3 \times 5^2$`, `$-x+7y-8$` 등)], [~450건],
  [한글 텍스트로 저장 (`ㄴ, ㄷ`, `ㄱ, ㄷ, ㄹ` 등)], [~100건],
  [㉠~㉤ 원문자 (다른 방식의 보기 번호)], [~50건],
  [*총 비정상 MC 정답*], [*600건*],
)

== 수정 스크립트 (`scripts/fix-mc-answers.js`)

3단계 매칭 전략으로 600건을 처리했다:

#block(fill: rgb("#f3fff3"), stroke: (left: 3pt + green), inset: 8pt, width: 100%)[
```js
// Case 1: ㉠~㉤ 직접 매핑 → 1~5
if (marumMap[ansText]) { updateStmt.run(marumMap[ansText], p.id); }

// Case 2: ①~⑤ prefix 추출
for (const [c, n] of Object.entries(circleMap)) {
  if (ansText.startsWith(c)) { updateStmt.run(n, p.id); break; }
}

// Case 3: answer 텍스트가 choices 배열 어디에 포함되는지 검색
choices.forEach((choice, idx) => {
  const choiceClean = String(choice).replace(/^[①②③④⑤㉠-㉤]\s*/, '').trim();
  if (choiceClean.includes(mainAns.substring(0, 20))) matchIdx = idx;
});
if (matchIdx >= 0) updateStmt.run(String(matchIdx + 1), p.id);
```
]

== 수정 결과

#table(
  columns: (1fr, auto),
  inset: 8pt,
  align: (left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*항목*], [*수량*],
  [총 처리 대상], [600건],
  [✅ 성공적으로 수정], [598건 (99.7%)],
  [⚠️ 매칭 불가 (answer="(답 없음)")], [2건],
  [수정 후 정상 MC 정답 수], [7,003건],
)

매칭 불가 2건(id: 3471, 8170)은 AI-Hub 원본에서 이미 `(답 없음)`으로 저장된 문제이며, 원본 데이터 자체의 문제다.

= 문제 2: ㄱ,ㄴ,ㄷ 보기 개행 미처리

== 원인 분석

두 가지 복합 원인이 있었다.

*원인 1*: DB 데이터 구조 — AI-Hub import 시 `parts.question.join('\n\n')`으로 저장하지만, ㄱ.ㄴ.ㄷ. 항목들이 동일 단락에 공백으로 이어져 있음:
```
"다음 보기 중 옳은 것을 모두 고르시오.\n\nㄱ. 명제1 ㄴ. 명제2 ㄷ. 명제3"
```

*원인 2*: `latexToTypst()` 함수가 모든 `\n`을 공백으로 변환:
```js
// 구버전 (모든 개행 제거)
return parts.map(...).join('$').replace(/\n/g, ' ');  // \n → 공백!
```

== 수정 내용 (`server/routes/pdf.js`)

*수정 1*: `latexToTypst()` — text 파트의 `\n`을 Typst line break로 변환:

#block(fill: rgb("#f3fff3"), stroke: (left: 3pt + green), inset: 8pt, width: 100%)[
```js
// 신버전: text 파트 \n → Typst forced line break (' \' + newline)
//         math 파트 \n → 공백 (수식 안에서는 개행 불필요)
if (arguments[1] === true) {
  return parts.map((p, i) =>
    i % 2 === 1
      ? p.trim().replace(/\n/g, ' ')      // math: \n → 공백
      : p.replace(/\n/g, ' \\\n')         // text: \n → Typst line break
  ).join('$');
}
```
]

*수정 2*: `buildExamTypst()` — 문제 본문 렌더링 전 ㄴ.ㄷ.ㄹ.ㅁ. 패턴 앞에 개행 삽입:

#block(fill: rgb("#f3fff3"), stroke: (left: 3pt + green), inset: 8pt, width: 100%)[
```js
// 같은 줄에 ㄴ. ㄷ. ㄹ. ㅁ. 가 있으면 줄바꿈 삽입
const processedQ = p.question
  .replace(/([^\n])[ \t]+(ㄴ\.)/g, '$1\nㄴ.')
  .replace(/([^\n])[ \t]+(ㄷ\.)/g, '$1\nㄷ.')
  .replace(/([^\n])[ \t]+(ㄹ\.)/g, '$1\nㄹ.')
  .replace(/([^\n])[ \t]+(ㅁ\.)/g, '$1\nㅁ.');

// latexToTypst에 processedQ 전달
[#text(size: 9.5pt)[${latexToTypst(processedQ, true)}]]
```
]

*추가 수정*: `\mathrm{...}`, `\mathbf{...}`, `~` (LaTeX non-breaking space) 변환 추가:
```js
m = m.replace(/\\mathrm\s*\{([^}]*)\}/g, '"$1"');
m = m.replace(/\\mathbf\s*\{([^}]*)\}/g, 'bold($1)');
m = m.replace(/~/g, ' ');
```

= 테스트 결과

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*\#*], [*테스트 항목*], [*결과*],
  [1], [DB answer 정규화: 600건 처리], [✅ 598건 성공 (99.7%)],
  [2], [ㄱ,ㄴ,ㄷ 전처리: `ㄴ.` 앞 개행 삽입 검증], [✅ PASS],
  [3], [Typst line break: text 파트 `\n` → ` \` 변환 검증], [✅ PASS],
  [4], [수식 inline 유지: math 파트 개행 없음 검증], [✅ PASS],
  [5], [ㄱ,ㄴ,ㄷ 포함 문제 PDF 생성 (6문제)], [✅ PASS],
  [6], [최예지 시험지 최종 생성], [✅ PASS (1,398 KB)],
  [7], [최예지 정답지 최종 생성], [✅ PASS (1,427 KB)],
  [8], [정지효 시험지 최종 생성], [✅ PASS (1,380 KB)],
  [9], [정지효 정답지 최종 생성], [✅ PASS (1,409 KB)],
)

= 시각 결과

== ㄱ,ㄴ,ㄷ 개행 처리 (수정 후)

#figure(
  image("assets/gak_screenshot.png", width: 100%),
  caption: [ㄱ,ㄴ,ㄷ,ㄹ 보기 항목이 각각 별도 줄에 출력됨 — 수식 포함 항목도 정상 처리]
)

#pagebreak()

== 최예지 정답지 (수정 후)

#figure(
  image("assets/ss_yeji_answer.png", width: 100%),
  caption: [정답표 ①②③④⑤ 표시, 수식 inline, 헤더 중앙 정렬 모두 정상]
)

== 정지효 정답지 (수정 후)

#figure(
  image("assets/ss_jiho_answer.png", width: 100%),
  caption: [제곱근 수식이 inline으로 올바르게 렌더링, 정답 원문자 표시]
)

= 수정된 파일 목록

#table(
  columns: (1fr, 1fr),
  inset: 8pt,
  align: (left, left),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*파일*], [*변경 내용*],
  [`server/routes/pdf.js`], [latexToTypst() text 파트 개행 처리, processedQ 전처리, `\mathrm` / `\mathbf` / `~` 변환 추가],
  [`server/exam_builder.db`], [MC 문제 598건 answer 필드 정규화 (수식 텍스트 → 1~5 숫자)],
  [`scripts/fix-mc-answers.js`], [신규 생성: answer 정규화 스크립트 (재실행 가능)],
)

= 결론

#table(
  columns: (1fr, auto),
  inset: 8pt,
  align: (left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*항목*], [*상태*],
  [MC answer 필드 정규화 (598/600건)], [✅ 완료],
  [ㄱ,ㄴ,ㄷ,ㄹ,ㅁ 보기 항목 개행 처리], [✅ 완료],
  [Typst text 파트 `\n` → line break 변환], [✅ 완료],
  [`\mathrm`, `\mathbf`, `~` LaTeX 명령어 추가 지원], [✅ 완료],
  [4개 시험 PDF 컴파일 성공], [✅ 완료],
)

== 권장 후속 작업

1. *`\underbrace{...}` 지원*: 일부 문제에 `\underbrace` LaTeX 명령어 사용 — `latexToTypst()`에 변환 로직 추가 필요
2. *복수 정답 지원*: "(정답 2개)" 유형 문제 answer 필드를 `"2,5"` 형식으로 저장하고 렌더링 처리 개선
3. *import 스크립트 수정*: `extractAnswerNumber()` 함수를 개선하여 향후 재import 시 동일 문제 방지
