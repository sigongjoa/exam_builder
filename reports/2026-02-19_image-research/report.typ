#set document(title: "Exam Builder - 시험지 이미지/도표 조달 방안 리서치")
#set page(margin: 2cm, numbering: "1")
#set text(font: "Noto Sans CJK KR", size: 10pt)
#set heading(numbering: "1.1")

// 컬러 정의
#let primary = rgb("#1a237e")
#let accent = rgb("#c62828")
#let ok = rgb("#2e7d32")
#let warn = rgb("#e65100")
#let muted = rgb("#757575")

#align(center)[
  #text(size: 20pt, weight: "bold", fill: primary)[Exam Builder]
  #v(0.3em)
  #text(size: 14pt)[시험지 이미지·도표 조달 방안 리서치]
  #v(0.3em)
  #text(size: 10pt, fill: muted)[2026-02-19 | /sc:research 기반 조사]
]

#line(length: 100%)
#v(0.5em)

= 조사 배경 및 목적

현재 Exam Builder 시스템은 텍스트와 LaTeX 수식 기반의 수학 시험지 생성을 지원한다.
그러나 실제 학교·학원 시험지에는 *과학(세포 구조도, 실험 장치)*, *사회(역사 지도, 연표)*, *수학(좌표계, 도형)* 등
다양한 이미지·도표가 필수적으로 포함된다.

본 리서치는 다음 세 가지 질문에 답하는 것을 목표로 한다.

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  [
    *Q1.* 한국 교사들은 현재 시험지 이미지를 어떻게 조달하는가?\
    *Q2.* 이미지가 포함된 공개 문제은행 API나 데이터셋이 존재하는가?\
    *Q3.* Exam Builder에 적용 가능한 현실적 방안은 무엇인가?
  ]
)

= 현재 교사들의 이미지 조달 실태

== 교과서 출판사 교사 포털 (주 루트)

한국 교사들이 이미지가 포함된 문제를 가장 많이 가져오는 경로는 교과서 출판사가 운영하는
*무료 교사 지원 포털*이다. 등록 교사에 한해 전 과목 문제와 이미지 자료를 한 세트로 제공한다.

#table(
  columns: (1fr, 1fr, auto, auto),
  inset: 8pt,
  align: (left, left, center, center),
  table.header(
    [*플랫폼*], [*운영사*], [*문항 수*], [*비용*]
  ),
  [비바샘 (vivasam.com)], [비상교육], [16만+], [무료],
  [T셀파 (tsherpa.co.kr)], [천재교육], [16만+], [무료],
  [STAS (stas.moe.go.kr)], [교육부/KICE], [미공개], [무료],
  [족보닷컴 (zocbo.com)], [독립], [기출 포함], [유료],
  [기출로 (gichulro.com)], [천재교육], [기출 AI], [일부 유료],
)

#v(0.3em)
#text(fill: accent)[
  ⚠ 중요: 위 플랫폼들은 *공개 API가 없다.* 교사가 웹 포털에서 직접 다운로드하는 방식으로만 제공된다.
]

== 기출 문제에서 직접 발췌

교사들이 두 번째로 많이 사용하는 방법은 *수능·학력평가·모의고사* 기출 문제의
그림·도표를 스캔 또는 캡처하여 재사용하는 것이다.

이는 저작권법상 허용된다(아래 법적 근거 참조).

== 직접 제작 도구

과목별로 교사들이 직접 도표를 만드는 데 활용하는 주요 도구는 다음과 같다.

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (left, left, center),
  table.header([*과목*], [*도구*], [*비용*]),
  [수학], [GeoGebra — 도형·좌표계·함수 그래프 → SVG/PNG 내보내기], [무료],
  [수학], [Mathcha.io — WYSIWYG 수식+도형 편집, TikZ/SVG 내보내기], [무료],
  [수학], [한글/Word 수식 편집기], [유료(한글)],
  [과학], [교과서 이미지 스캔 후 볼펜으로 외곽선 강조], [-],
  [사회], [교과서 지도 캡처 후 단순화], [-],
)

#block(
  fill: rgb("#fff3e0"),
  inset: 10pt,
  radius: 4pt,
  [
    *현장 목소리 (다음 카페 교사 커뮤니티):*\
    "화학은 저작권이 무서워서 직접 그려요"\
    "교과서 홈페이지에서 수업자료 받으시면 평가용 이미지 파일이 들어있어요"\
    "등사기로 인쇄하면 그림이 흐려져서 볼펜으로 외곽선을 다시 그려줘야 해요"
  ]
)

= 저작권 법적 근거

== 시험 목적 복제 — 저작권법 제25조

#block(
  fill: rgb("#e8eaf6"),
  inset: 10pt,
  radius: 4pt,
  [
    *저작권법 제25조 (학교교육 목적 등에의 이용):*\
    "학교의 입학시험, 그 밖에 학식 및 기능에 관한 시험 또는 검정을 위하여 필요한 경우에는
    그 목적을 위하여 정당한 범위 안에서 공표된 저작물을 이용할 수 있다."
  ]
)

이를 요약하면:

#table(
  columns: (1fr, auto),
  inset: 8pt,
  align: (left, center),
  table.header([*행위*], [*허용 여부*]),
  [교과서 이미지를 시험 문제에 복제·사용], [#text(fill: ok)[✅ 허용]],
  [기출 문제 그림을 자체 시험지에 재사용], [#text(fill: ok)[✅ 허용]],
  [CC/공유마당 이미지 교육 목적 사용], [#text(fill: ok)[✅ 허용]],
  [시험 문제지를 상업용 문제집으로 판매], [#text(fill: accent)[❌ 불허]],
  [기출 이미지를 학원 교재로 출판], [#text(fill: accent)[❌ 불허]],
)

= 공개 데이터셋 및 API 현황

== AI-Hub 교육 데이터셋

#table(
  columns: (auto, 1fr, auto, auto),
  inset: 8pt,
  align: (left, left, center, center),
  table.header([*번호*], [*데이터셋*], [*이미지*], [*적용 현황*]),
  [71859], [수학 교과 문제 풀이과정 데이터 (9,933건)], [LaTeX만], [✅ 이미 import됨],
  [71716], [수학 과목 자동 풀이 데이터 (20,319건)], [이미지 포함], [미적용],
  [27752], [수학분야 학습자 역량 측정 (33,000건)], [손글씨 이미지], [미적용],
)

== 공개 이미지 소스 (CC 라이선스)

#table(
  columns: (1fr, 1fr, auto),
  inset: 8pt,
  align: (left, left, center),
  table.header([*소스*], [*특징*], [*API*]),
  [Wikimedia Commons], [과학·역사 도표, 지도, 생물 세포도 등 수백만 장], [✅ 있음],
  [공유마당 (gongu.copyright.or.kr)], [한국저작권위원회 운영, 교육 이미지 포함], [제한적],
  [NASA Image Gallery], [우주·지구과학 고품질 이미지], [✅ 있음],
  [PhET Interactive Simulations], [과학 실험 시뮬레이션, 정적 이미지 내보내기], [없음],
)

*Wikimedia Commons API 활용 가능성:*
REST API를 통해 키워드 검색 → CC 이미지 URL 반환 → PDF에 inline 삽입이 기술적으로 가능하다.
단, 검색 결과의 품질 필터링(교육 적합성)이 추가로 필요하다.

= Exam Builder 적용 방안

== 방안 비교

#table(
  columns: (auto, 1fr, auto, auto, auto),
  inset: 8pt,
  align: (left, left, center, center, center),
  table.header(
    [*방안*], [*설명*], [*난이도*], [*품질*], [*범용성*]
  ),
  [A. SVG 프로그래밍], [수학 도형·좌표계·과학 기본 다이어그램을 코드로 생성], [중간], [★★★★★], [수학/과학 한정],
  [B. 이미지 URL 삽입], [교사가 외부 소스 URL을 직접 입력 → PDF에 렌더링], [낮음], [★★★★☆], [전 과목],
  [C. 파일 업로드], [교사가 캡처한 이미지를 base64로 DB 저장], [낮음], [★★★★☆], [전 과목],
  [D. Wikimedia API 연동], [키워드 검색 → CC 이미지 자동 삽입], [높음], [★★★☆☆], [과학/사회],
)

== 권고: 단계별 구현 로드맵

*1단계 — 즉시 구현 가능 (이미지 URL + 업로드)*

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  [
    - problems 테이블에 `image_url TEXT` 컬럼 추가\
    - 문제 편집기(ProblemEditor.jsx)에 이미지 URL 입력 필드 추가\
    - PDF 렌더링 시 `<img>` 태그로 삽입 → Puppeteer가 자동 렌더링\
    - 교사는 Wikimedia Commons / 교과서 스캔 이미지 URL을 직접 입력
  ]
)

*2단계 — 수학 SVG 라이브러리 (중기)*

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  [
    - GeoGebra 방식의 SVG 생성 함수 구현\
    - 지원 대상: 좌표계, 삼각형/원/사각형, 함수 그래프, 수직선\
    - 과학: 세포 구조도, 실험 장치도 (단순화된 SVG)\
    - 문제 편집기에 "도형 삽입" 버튼 추가
  ]
)

*3단계 — Wikimedia Commons 연동 (장기)*

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  [
    - Wikimedia Commons REST API 연동\
    - 키워드(예: "세포 구조", "광합성") → CC 이미지 목록 반환\
    - 교사가 후보 이미지 중 선택 → 문제에 삽입\
    - 교육 적합성 필터 (해상도, 내용 관련성) 필요
  ]
)

= 결론

#block(
  fill: rgb("#e8f5e9"),
  inset: 12pt,
  radius: 4pt,
  [
    1. *공개 API 문제은행은 존재하지 않는다.* 비바샘·T셀파 등 주요 문제은행은 교사 포털을 통한
       수동 다운로드만 지원하며, API를 공개하지 않는다.

    2. *교사들은 현재 교과서 포털 + 기출 발췌 + 직접 제작(GeoGebra)* 세 가지 방법을 혼합해서 사용한다.

    3. *생성형 AI 이미지는 교육 신뢰성 문제로 부적합하다.* 세포 구조도 등 사실 정확성이 중요한
       과학 다이어그램을 생성형 AI가 잘못 그릴 경우 학습 오류를 유발할 수 있다.

    4. *현실적 최우선 방안은 이미지 URL 삽입 기능 추가다.* 구현 난이도가 낮고
       (problems 테이블에 컬럼 1개 + PDF 렌더러에 img 태그 추가), 교사가 Wikimedia Commons나
       교과서 스캔 이미지를 자유롭게 활용할 수 있게 된다.

    5. *수학 도형은 SVG 프로그래밍으로 완전 해결 가능하다.* GeoGebra처럼 좌표계·도형을
       코드로 생성하면 인쇄 품질도 보장된다.
  ]
)

= 참고 출처

#set list(marker: [•])

- 비바샘 (비상교육 교사 포털): #link("https://v.vivasam.com/main.do")
- T셀파 (천재교육 교사 포털): #link("https://mh.tsherpa.co.kr/testbank/testbank.html")
- STAS 학생평가지원포탈 (교육부): #link("https://stas.moe.go.kr/")
- 저작권법 제25조 (학교교육 목적 이용): #link("https://lbox.kr/v2/statute/%EC%A0%80%EC%9E%91%EA%B6%8C%EB%B2%95")
- GeoGebra 활용 문항 출제 연구 (KCI): #link("https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001960591")
- 공유마당 (한국저작권위원회): #link("https://gongu.copyright.or.kr/")
- AI-Hub 수학 교과 데이터셋 71859: #link("https://www.aihub.or.kr/aihubdata/data/view.do?aihubDataSe=data&dataSetSn=71859")
- AI-Hub 수학 자동 풀이 데이터셋 71716: #link("https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=71716")
- 교사 커뮤니티 — 그림 처리 방법 (다음 카페): #link("https://m.cafe.daum.net/S2000/63j/87698")
- 시험지 그림 검사 앱 (sciencelove.com): #link("https://sciencelove.com/2264")
- Wikimedia Commons: #link("https://commons.wikimedia.org/")
