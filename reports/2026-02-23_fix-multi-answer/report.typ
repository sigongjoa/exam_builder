#set document(title: "Exam Builder - 복수 정답 지원 수정 리포트")
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
  #text(size: 14pt)[복수 정답 지원 수정 리포트]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-23 | /sc:duo 자동 생성]
]

#line(length: 100%, stroke: 2pt + black)
#v(1em)

= 작업 개요

PDF를 직접 풀어서 정답을 검증한 결과, 두 가지 문제를 발견했다.

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*\#*], [*문제*], [*영향 범위*],
  [1], [복수 정답 누락: "모두 고르면" 문제에서 첫 번째 정답만 저장], [DB 데이터 + PDF 렌더링],
  [2], [복수 정답 렌더링 미지원: answer="2,5" 형식을 "②⑤"로 변환하는 로직 없음], [PDF 렌더링],
)

= 근본 원인 분석

== 데이터 문제: extractAnswerNumber() 단일 정답만 추출

AI-Hub import 시 `extractAnswerNumber()` 함수가 정답 텍스트에서 *첫 번째 원문자만 찾고 즉시 반환*한다:

#block(fill: rgb("#fff3f3"), stroke: (left: 3pt + red), inset: 8pt, width: 100%)[
```js
function extractAnswerNumber(answerTexts) {
  for (const text of answerTexts) {
    for (const [circle, num] of Object.entries(circleNums)) {
      if (text.startsWith(circle)) return num;  // ② 찾으면 즉시 return!
    }
  }
  return answerTexts.join('\n');
}
```
]

AI-Hub 원본에 `"②, ⑤"` 형태로 저장된 복수 정답이 있어도, `②`만 추출하고 `⑤`는 버려진다.

== 렌더링 문제: 단일 숫자 형식만 지원

기존 정답 렌더링 코드:

#block(fill: rgb("#fff3f3"), stroke: (left: 3pt + red), inset: 8pt, width: 100%)[
```js
// AS-IS: 단일 숫자만 처리
const n = parseInt(p.answer);
ans = (!isNaN(n) && n >= 1 && n <= 5) ? circles[n-1]
    : latexToTypst(String(p.answer), true);
// "2,5" → parseInt("2,5") = 2 → ② (⑤ 누락!)
```
]

`parseInt("2,5")`는 `2`를 반환하므로 ②만 표시되고 ⑤가 누락된다.

== 검증된 오류 문제

#table(
  columns: (auto, auto, 1fr, auto, auto),
  inset: 8pt,
  align: (center, center, left, center, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*시험*], [*번호*], [*문제 내용*], [*저장값*], [*실제 정답*],
  [정지효], [2번], [다음 중 옳지 않은 것을 *모두* 고르면?], [`"2"`], [`②⑤`],
  [정지효], [5번], [무리수가 아닌 실수를 *모두* 고르면? *(정답 2개)*], [`"2"`], [`②⑤`],
)

*검증 근거:*
- 5번 ②: $-sqrt(1.96) = -1.4$ (유리수) ✓, ⑤: $sqrt((-1/2)^2) = 1/2$ (유리수) ✓
- 2번 ②: $sqrt(44) = 4sqrt(11)$ → 틀림 (실제 $2sqrt(11)$), ⑤: $-sqrt(30/8) = -5/4$ → 틀림 (실제 $-sqrt(15)/2$)

= 수정 내용

== 수정 1: formatAnswer() 헬퍼 함수 추가 (`server/routes/pdf.js`)

#block(fill: rgb("#f3fff3"), stroke: (left: 3pt + green), inset: 8pt, width: 100%)[
```js
// TO-BE: 복수 정답 "2,5" → "②⑤" 변환
function formatAnswer(answer, type, circles) {
  if (type !== 'multiple_choice') return latexToTypst(String(answer), true);
  const str = String(answer).trim();
  // 복수 정답: '2,5' → '②⑤'
  if (str.includes(',')) {
    return str.split(',')
      .map(s => s.trim())
      .filter(s => /^[1-5]$/.test(s))
      .map(s => circles[parseInt(s) - 1])
      .join('');
  }
  // 단일 정답: '2' → '②'
  const n = parseInt(str);
  if (!isNaN(n) && n >= 1 && n <= 5) return circles[n - 1];
  return latexToTypst(str, true);  // fallback
}
```
]

개별 정답 박스 및 정답표 모두 `formatAnswer()` 호출로 교체.

== 수정 2: DB 데이터 수정 (`scripts/fix-multi-answer.js`)

- id:5747 (정지효 5번): `"2"` → `"2,5"` 수정
- id:6695 (정지효 2번): `"2"` → `"2,5"` 수정
- "모두 고르면" 패턴 전수 조사: *195개* 문제 발견 (추가 검토 필요)
- 수식 잔류 answer: *0개* (이미 이전 fix에서 모두 정규화됨)

= 테스트 결과

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*\#*], [*테스트 항목*], [*결과*],
  [1], [`formatAnswer("2", "multiple_choice")` → `②`], [✅ PASS],
  [2], [`formatAnswer("2,5", "multiple_choice")` → `②⑤`], [✅ PASS],
  [3], [`formatAnswer("1,3,5", "multiple_choice")` → `①③⑤`], [✅ PASS],
  [4], [`formatAnswer("(답 없음)", "multiple_choice")` → `(답 없음)`], [✅ PASS],
  [5], [DB 수정: id:5747 answer `"2"` → `"2,5"`], [✅ PASS],
  [6], [DB 수정: id:6695 answer `"2"` → `"2,5"`], [✅ PASS],
  [7], [정지효 정답지 PDF 생성 (1,376 KB)], [✅ PASS],
  [8], [최예지 정답지 PDF 생성 (1,394 KB)], [✅ PASS],
  [9], [정답표: 정지효 2번 `②⑤` 표시 확인], [✅ PASS],
  [10], [정답표: 정지효 5번 `②⑤` 표시 확인], [✅ PASS],
)

= 시각 결과

== 정지효 정답지 (수정 후) — 2번·5번 복수 정답

#figure(
  image("assets/jiho_answer-1.png", width: 100%),
  caption: [정지효 2번(②⑤)·5번(②⑤) 복수 정답 표시 — 각 문제 정답 박스에 두 원문자 나란히 표시]
)

#pagebreak()

== 정지효 정답표 (수정 후)

#figure(
  image("assets/jiho_answer_p2-2.png", width: 100%),
  caption: [정답표: 2번=②⑤, 5번=②⑤ 정상 표시. 나머지 단일 정답도 원문자로 정상 출력]
)

= 수정된 파일 목록

#table(
  columns: (1fr, 1fr),
  inset: 8pt,
  align: (left, left),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*파일*], [*변경 내용*],
  [`server/routes/pdf.js`], [`formatAnswer()` 헬퍼 함수 추가, 복수 정답 `"2,5"` → `"②⑤"` 렌더링],
  [`server/exam_builder.db`], [id:5747, id:6695 answer 필드 `"2"` → `"2,5"` 수정],
  [`scripts/fix-multi-answer.js`], [신규 생성: 복수 정답 DB 수정 스크립트 + 전수 조사],
)

= 결론

#table(
  columns: (1fr, auto),
  inset: 8pt,
  align: (left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*항목*], [*상태*],
  [복수 정답 렌더링 (`"2,5"` → `"②⑤"`) 지원], [✅ 완료],
  [정지효 5번 answer 수정 (2 → 2,5)], [✅ 완료],
  [정지효 2번 answer 수정 (2 → 2,5)], [✅ 완료],
  [PDF 정답지 정상 생성 (2개 시험)], [✅ 완료],
)

== 권장 후속 작업

1. *"모두 고르면" 195개 문제 전수 검토*: AI-Hub 원본 데이터 재조회로 복수 정답 여부 확인 필요
2. *import 스크립트 수정*: `extractAnswerNumber()`를 `"2,5"` 형식 반환 지원으로 개선
3. *그림 참조 문제*: "오른쪽 그림"을 참조하지만 실제 그림이 없는 문제들 별도 처리 필요
