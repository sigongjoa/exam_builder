#set document(title: "Exam Builder - Phase 6: Typst PDF 디자인 복원 리포트")
#set page(
  paper: "a4",
  margin: (x: 2cm, y: 2cm),
  numbering: "1",
  footer: align(center, text(8pt, gray)[Exam Builder · /sc:duo 자동 생성 · 2026-02-21]),
)
#set text(font: "Noto Sans CJK KR", size: 10pt, lang: "ko")
#set heading(numbering: "1.")
#set par(leading: 0.65em)

// Title
#align(center)[
  #text(size: 20pt, weight: "bold")[Exam Builder]
  #v(0.3em)
  #text(size: 14pt)[Phase 6: Typst PDF 디자인 복원 리포트]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-21 | /sc:duo 자동 생성]
]

#line(length: 100%, stroke: 2pt + black)
#v(1em)

= 작업 개요

== 배경

원래 시스템은 *Puppeteer (HTML + KaTeX)* 기반으로 PDF를 생성했다. 사용자가 이를 *Typst* 방식으로 전환하고, 수식 렌더링을 KaTeX에서 LaTeX(Typst math) 방식으로 변경하는 과정에서 다음 문제가 발생했다:

1. `\left`, `\right` 등 일부 LaTeX 명령어가 Typst로 변환되지 않아 *컴파일 오류* 발생
2. 수식이 inline math 대신 display math로 렌더링되어 *선택지 레이아웃 붕괴*
3. 학생 정보 테이블의 "번호" 열 너비 부족
4. `\text{한국어}` 명령어가 `text(한국어)`로 잘못 변환되어 해설지 컴파일 오류 발생

== 수행 작업

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*\#*], [*작업 내용*], [*결과*],
  [1], [`\left`, `\right` LaTeX 명령어 처리 추가], [✅ PASS],
  [2], [`\begin{aligned}`, `\\\\`, `&` 환경 처리 추가], [✅ PASS],
  [3], [`latexToTypst()` 인라인 모드(inline=true) 구현], [✅ PASS],
  [4], [선택지 렌더링: `#h()` 활용 인라인 수식 강제], [✅ PASS],
  [5], [수식 내용 trim으로 `$formula$` 인라인 판별 보장], [✅ PASS],
  [6], [학생 정보 테이블 "번호" 열 너비 25pt → 32pt], [✅ PASS],
  [7], [정답/해설 텍스트에도 `latexToTypst()` 적용], [✅ PASS],
  [8], [정답 표의 `p.answer` LaTeX 변환 적용], [✅ PASS],
  [9], [`\text{한국어}` → `"한국어"` 변환 추가 (해설지 오류 수정)], [✅ PASS],
  [10], [해설지(solution) API 엔드포인트 실제 동작 확인], [✅ PASS],
)

= 핵심 버그 분석

== 버그 1: `\left`, `\right` 변환 누락

기존 `latexToTypst()` 함수는 `\frac`, `\sqrt`, `^{...}` 등만 처리했고 `\left`, `\right` 명령어는 처리하지 않았다. LaTeX에서 `\left(`, `\right)`는 크기 자동조절 괄호인데, Typst는 이를 자동으로 처리하므로 단순 제거가 필요하다.

#block(fill: gray.lighten(90%), inset: 10pt, radius: 4pt)[
  #text(size: 9pt)[
  *수정 전 (오류 발생):*\
  `\left(\frac{x^2}{y^2}\right)^2` → 컴파일 오류: `unknown variable: left`

  *수정 후 (정상):*\
  `\left(\frac{x^2}{y^2}\right)^2` → `(frac(x^2, y^2))^2` → 정상 렌더링
  ]
]

== 버그 2: 선택지가 display math로 렌더링됨

Typst에서 수식 모드 판별 규칙:
- `$formula$` (달러 기호 내부에 공백 없음) → *inline math* (인라인, 소형)
- `$ formula $` (달러 기호 내부에 공백 있음) → *display math* (블록, 대형, 별도 줄)

기존 코드는 `parts.join(' $ ')`로 수식을 연결해 항상 display math가 되어, 선택지 5개가 각각 별도 줄을 차지했다.

#block(fill: gray.lighten(90%), inset: 10pt, radius: 4pt)[
  #text(size: 9pt)[
  *수정 전:* `① $ frac(18, 3^3 times 5) $` → 각 선택지가 별도 줄 (5줄 차지)

  *수정 후:* `①#h(0.3em)$frac(18, 3^3 times 5)$` → 한 줄에 5개 선택지 인라인 표시
  ]
]

= 테스트 결과

== 컴파일 테스트

#table(
  columns: (1fr, auto, auto),
  inset: 8pt,
  align: (left, center, center),
  fill: (x, y) => if y == 0 { gray.lighten(80%) },
  stroke: 0.5pt + black,
  [*테스트 항목*], [*결과*], [*비고*],
  [시험지 (exam) PDF 컴파일], [✅ PASS], [15문제, 3페이지],
  [답안지 (answer) PDF 컴파일], [✅ PASS], [정답 표 포함],
  [`\sqrt{(-3)^{2}}` 변환], [✅ PASS], [`sqrt((-3)^(2))`],
  [`\sqrt{\frac{16}{25}}` 변환], [✅ PASS], [`sqrt(frac(16, 25))`],
  [`\left(\frac{x}{y}\right)^2` 변환], [✅ PASS], [`(frac(x, y))^2`],
  [`\begin{aligned}...\end{aligned}` 처리], [✅ PASS], [환경 마커 제거],
  [`\text{이므로}` 변환], [✅ PASS], [`"이므로"` (Typst 텍스트 모드)],
  [해설지 PDF 컴파일 (type=solution)], [✅ PASS], [HTTP 200, 1.4MB],
)

= 시각적 검증

== 수정 전 — 선택지 display math (비교용)

선택지가 각 별도 줄에 대형으로 표시되어 2열 레이아웃에서 공간을 과도하게 차지했다.

#figure(
  image("assets/broken_before.png", width: 90%),
  caption: [수정 전: 선택지가 display math로 렌더링 (각 줄 차지)]
)

#pagebreak()

== 수정 후 — 시험지 1페이지

헤더, 학생 정보 테이블, 2열 그리드, 인라인 선택지가 올바르게 렌더링된다.

#figure(
  image("assets/exam_page1.png", width: 90%),
  caption: [수정 후: 시험지 1페이지 — 2열 레이아웃, 인라인 선택지]
)

#pagebreak()

== 수정 후 — 시험지 2페이지

분수 선택지도 인라인 분수로 한 줄에 표시된다. (문제 11: ① 18/(3³×5) ② ...)

#figure(
  image("assets/exam_page2.png", width: 90%),
  caption: [수정 후: 시험지 2페이지 — 인라인 분수 선택지]
)

#pagebreak()

== 수정 후 — 답안지 마지막 페이지

각 문제 아래 정답이 강조 박스로 표시되고, 페이지 하단에 정답 표가 생성된다.

#figure(
  image("assets/answer_page3.png", width: 90%),
  caption: [수정 후: 답안지 — 문제별 정답 표시 + 정답 표]
)

= 코드 변경 내역

== `server/routes/pdf.js` 주요 변경

#block(fill: gray.lighten(90%), inset: 10pt, radius: 4pt)[
  #text(size: 8pt)[
  *1. `\left`/`\right` 처리 추가 (latexToTypst 함수):*\
  `m = m.replace(/\\left\s*\(/g, '(').replace(/\\right\s*\)/g, ')')`\
  `m = m.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '')`

  *2. 환경 처리 추가:*\
  `m = m.replace(/\\begin\{aligned\}/g, '').replace(/\\end\{aligned\}/g, '')`\
  `m = m.replace(/\\\\\\\\\s*/g, ' ')  // aligned 줄바꿈 제거`

  *3. 인라인 모드 구현:*\
  기존: `parts.join(' $ ')` → display math\
  수정: `inline=true` 시 `parts.map(...trim...).join('$')` → inline math

  *4. 선택지 렌더링 수정:*\
  기존: `\${labels[idx]} \${latexToTypst(cleaned)}`\
  수정: `\${labels[idx]}#h(0.3em)\${latexToTypst(cleaned, true)}`\
  구분자: `'   '` → `'#h(0.8em)'`

  *5. 정답 LaTeX 변환:*\
  기존: `p.answer` (raw LaTeX)\
  수정: `latexToTypst(String(p.answer))` (변환 적용)
  ]
]

= 해설지(Solution) 검증

== 해설지 1페이지 — `\text{}` 한국어 수식 텍스트

`\text{이므로}`, `\text{이다.}` 등 수식 내 한국어 텍스트가 `"이므로"` 형식으로 올바르게 렌더링된다.

#figure(
  image("assets/solution_page1.png", width: 90%),
  caption: [해설지 1페이지 — 정답 박스(노란색) + 풀이 박스(보라색), 수식 내 한국어 정상 표시]
)

#pagebreak()

== 해설지 2페이지 — 복합 수식 + 한국어 혼합

`이므로`, `이다`, `자연수이므로` 등 한국어 텍스트와 수식이 한 줄에 자연스럽게 혼합된다.

#figure(
  image("assets/solution_page2.png", width: 90%),
  caption: [해설지 2페이지 — 복합 수식과 한국어 텍스트 혼합 렌더링]
)

= 결론 및 다음 단계

== 결론

Puppeteer/KaTeX → Typst 전환 시 발생한 *4가지 핵심 버그*를 모두 수정했다:

1. ✅ LaTeX 명령어 누락 (`\left`, `\right`, aligned 환경) → 추가 처리
2. ✅ 선택지 display math 문제 → `inline=true` + `#h()` 방식으로 해결
3. ✅ 정답 필드 LaTeX 미변환 → `latexToTypst()` 적용
4. ✅ `\text{한국어}` 변환 오류 → `"한국어"` (Typst math text) 방식으로 해결

시험지, 답안지, 해설지 *3종 PDF 모두 정상 생성* 확인 완료.

== 다음 단계 (권장)

+ *서버 재시작 후 API 엔드포인트 테스트* — `/api/pdf/:examId` 실제 동작 확인
+ *해설지(solution) PDF 테스트* — `showSolutions: true` 옵션 검증
+ *다양한 문제 유형 테스트* — 서술형 문제, 이미지 포함 문제
+ *Phase 5: 학생 취약점 분석* — 다음 개발 단계

#v(1em)
#line(length: 100%)
#align(right)[#text(size: 8pt, fill: gray)[생성 시각: 2026-02-21 | Claude Sonnet 4.6 via /sc:duo]]
