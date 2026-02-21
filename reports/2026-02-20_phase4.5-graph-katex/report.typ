#set document(title: "Exam Builder - Phase 4.5 개념 그래프 + KaTeX 수식 수정")
#set page(margin: 2cm, numbering: "1")
#set text(font: "Noto Sans CJK KR", size: 10pt)
#set heading(numbering: "1.1")

#align(center)[
  #text(size: 20pt, weight: "bold")[Exam Builder]
  #v(0.3em)
  #text(size: 14pt)[Phase 4.5 — 개념 그래프 시각화 + KaTeX 수식 렌더링 수정]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-20 | /sc:duo (Claude 설계 + Gemini 구현)]
]

#line(length: 100%)
#v(0.5em)

= 작업 개요

Phase 4에서 구현한 개념 원자화 태깅 시스템에 두 가지 주요 기능을 추가한다.

*1. 개념 연결 그래프 시각화* — D3.js force-directed graph로 원자 개념 간 공출현 관계를 인터랙티브하게 표시한다. 같은 문제에서 함께 사용된 개념들을 노드-엣지로 연결하여 "어떤 개념들이 자주 함께 등장하는가"를 직관적으로 파악할 수 있다.

*2. KaTeX \$...\$ 수식 렌더링 수정* — DB의 AI-Hub 문제 데이터는 인라인 수식을 `\$...\$` 형식으로 저장하고 있었으나, 기존 `renderKaTeX` 함수는 이를 처리하지 못해 raw 텍스트로 표시되었다. 이를 수정하여 수식이 올바르게 렌더링된다.

= 구현 내용

== 신규 파일

#table(
  columns: (2.5fr, 3fr),
  inset: 8pt,
  align: (left, left),
  [*파일*], [*역할*],
  [`client/src/pages/ConceptGraph.jsx`], [D3.js force-directed 그래프 페이지],
)

== 수정 파일

#table(
  columns: (2.5fr, 3fr),
  inset: 8pt,
  align: (left, left),
  [*파일*], [*변경 내용*],
  [`server/routes/concepts.js`], [`GET /graph` 엔드포인트 추가 (nodes + links)],
  [`client/src/pages/ConceptTagger.jsx`], [`renderKaTeX` \$...\$ 패턴 처리 추가],
  [`client/src/pages/ProblemBank.jsx`], [`renderKaTeX` \$...\$ 패턴 처리 추가],
  [`client/src/App.jsx`], [`/concept-graph` 라우트 등록],
  [`client/src/components/Layout.jsx`], [사이드바 메뉴 항목 추가],
)

== 그래프 API 스펙

```
GET /api/concepts/graph
→ {
    nodes: [{ id, name, grade_level, use_count }],
    links: [{ source, target, value }]  // value = 공출현 문제 수
  }

SQL (links):
SELECT pc1.concept_id as source, pc2.concept_id as target, COUNT(*) as value
FROM problem_concepts pc1
JOIN problem_concepts pc2
  ON pc1.problem_id = pc2.problem_id
  AND pc1.concept_id < pc2.concept_id
GROUP BY pc1.concept_id, pc2.concept_id
```

== KaTeX 수정 내용

```js
// 기존 (단일 달러 처리 없음)
text.split(/(\\\(.+?\\\)|\\\[...\\\]|\$\$.+?\$\$)/gs)

// 수정 후 (|\$[^\$\n]+?\$ 추가)
text.split(/(\\\(.+?\\\)|\\\[...\\\]|\$\$.+?\$\$|\$[^\$\n]+?\$)/gs)

// 처리 조건 추가
else if (part.startsWith('$') && part.endsWith('$') && !part.startsWith('$$')) {
  return <span dangerouslySetInnerHTML={{
    __html: katex.renderToString(part.slice(1, -1), { throwOnError: false })
  }} />;
}
```

= 테스트 결과

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  [*\#*], [*테스트 항목*], [*결과*],
  [T1], [`GET /api/concepts/graph` → `{nodes:[],links:[]}` (초기)], [#text(fill: green)[PASS]],
  [T2], [개념 6개 + 태깅 후 그래프 → nodes:6, links:8], [#text(fill: green)[PASS]],
  [T3], [D3.js 그래프 렌더링 (force-directed)], [#text(fill: green)[PASS]],
  [T4], [노드 클릭 → 사이드바에 이름/학년/사용횟수/연결개념 표시], [#text(fill: green)[PASS]],
  [T5], [드래그/줌 인터랙션], [#text(fill: green)[PASS]],
  [T6], [학년별 노드 색상 구분 (중1:남색, 중2:청색, 중3:초록, 고1:황색)], [#text(fill: green)[PASS]],
  [T7], [KaTeX `\$...\$` 인라인 수식 렌더링], [#text(fill: green)[PASS]],
  [T8], [문제 목록 카드 - LaTeX 제거 후 순수 텍스트 미리보기], [#text(fill: green)[PASS]],
)

*8/8 PASS*

= 시각화 결과

== 개념 연결 그래프 (전체)

#figure(
  image("assets/graph_empty_state.png", width: 95%),
  caption: [개념 연결 그래프 — 6개 노드, 8개 엣지. 초록색(중3) 노드인 √x²=|x| 변환 규칙이 중심 허브 역할]
)

== 노드 선택 시 상세 정보

#figure(
  image("assets/graph_node_selected.png", width: 95%),
  caption: [√x² = |x| 변환 규칙 노드 클릭 → 좌측 패널에 학년(중3), 사용횟수(2회), 연결된 개념 3개 표시]
)

== KaTeX 수식 렌더링 수정 결과

#figure(
  image("assets/katex_fixed.png", width: 95%),
  caption: [수식 렌더링 수정 후 — 문제와 풀이의 \$...\$ 수식이 KaTeX로 올바르게 렌더링됨. 좌측 카드 미리보기도 수식 제거 후 순수 텍스트로 표시]
)

= 결론 및 다음 단계

== 완료된 것
- D3.js force-directed 개념 그래프 시각화 완성
- 노드 크기: use_count 반영 (많이 사용된 개념이 더 큰 원)
- 엣지 굵기: 공출현 빈도 반영 (자주 같이 나오면 굵은 선)
- KaTeX `\$...\$` 인라인 수식 렌더링 수정 완료

== 다음 단계 (Phase 5)
1. *학생 오답 추적* — 학생이 틀린 문제의 개념을 집계하여 취약점 분석
2. *맞춤 문제 추천* — "이 개념이 약한 학생" → 해당 개념이 태깅된 문제 추천
3. *그래프 확장* — 더 많은 태깅이 쌓이면 진정한 지식 맵 완성

#v(1em)
#line(length: 100%)
#align(center)[
  #text(size: 8pt, fill: gray)[/sc:duo | Claude Sonnet 4.6 설계 + Gemini 2.5 Pro 구현 | 2026-02-20]
]
