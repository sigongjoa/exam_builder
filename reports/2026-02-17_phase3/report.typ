#set document(title: "Exam Builder - Phase 3 문제 은행 Import 리포트")
#set page(margin: 2cm, numbering: "1")
#set text(font: "Noto Sans CJK KR", size: 10pt)
#set heading(numbering: "1.1")

#align(center)[
  #text(size: 20pt, weight: "bold")[Exam Builder]
  #v(0.3em)
  #text(size: 14pt)[Phase 3 문제 은행 Import 리포트]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-17 | /sc:duo 자동 생성]
]

#line(length: 100%)

= 작업 요약

Phase 3는 외부 데이터 소스를 조사하고, 실제 문제 데이터를 Exam Builder DB에 import하는 단계이다.

- *3.1 리서치*: 온라인 수학 문제 소스 15개 조사 → 3개 최우선 소스 선정
- *3.2 데이터 Import*: AI-Hub 71859 "수학 교과 문제 풀이과정 데이터" 9,933건 import 완료

=== 데이터 소스: AI-Hub 71859

#table(
  columns: (auto, 1fr),
  inset: 8pt,
  [*항목*], [*내용*],
  [데이터셋], [수학 교과 문제 풀이과정 데이터 (AI-Hub #71859)],
  [구축년도], [2024 (갱신: 2026-01)],
  [원 규모], [20,319건 (초3~고1)],
  [Import 대상], [중1~고1 (10,228건)],
  [실제 Import], [9,933건 (매핑 실패 293건, 에러 2건)],
  [데이터 형식], [JSON + LaTeX 수식 (text_description 필드에 LaTeX 내장!)],
  [핵심 발견], [OCR 불필요 — 텍스트가 이미 LaTeX로 제공됨],
)

= Import 결과

=== 과목별 분포

#table(
  columns: (auto, auto, auto, auto),
  inset: 8pt,
  align: (left, center, center, center),
  [*과목*], [*문제 수*], [*비율*], [*비고*],
  [중1수학], [3,097], [31.2%], [소인수분해~통계],
  [중2수학], [3,211], [32.3%], [순환소수~확률],
  [중3수학], [2,825], [28.4%], [제곱근~산점도],
  [공통수학1], [422], [4.2%], [다항식~경우의수],
  [공통수학2], [378], [3.8%], [도형~함수],
  [*합계*], [*9,933*], [*100%*], [],
)

=== 유형별 분포

#table(
  columns: (auto, auto, auto),
  inset: 8pt,
  align: (left, center, center),
  [*유형*], [*문제 수*], [*비율*],
  [객관식 (multiple_choice)], [6,998], [70.5%],
  [주관식 (descriptive)], [2,935], [29.5%],
)

=== 난이도별 분포

#table(
  columns: (auto, auto, auto, auto),
  inset: 8pt,
  align: (left, center, center, center),
  [*난이도*], [*문제 수*], [*비율*], [*배점*],
  [하 (1)], [5,191], [52.3%], [3점],
  [중 (2)], [4,146], [41.7%], [5점],
  [상 (3)], [596], [6.0%], [7점],
)

= 기술 구현

=== Import 파이프라인

```
ZIP (라벨링 데이터)
  → adm-zip으로 직접 읽기 (임시 해제 불필요)
  → JSON 파싱
  → 2022 성취기준 코드 → curriculum chapter_code 매핑
  → learning_data_info에서 문항/정답/오답/해설 추출
  → 객관식: ①②③④⑤ 패턴으로 보기 분리 + 정답번호 추출
  → 주관식: 정답 텍스트 직접 저장
  → problems 테이블 INSERT (트랜잭션)
```

=== 핵심 매핑

#table(
  columns: (1fr, auto, 1fr),
  inset: 6pt,
  [*AI-Hub 필드*], [→], [*Exam Builder 필드*],
  [school + grade], [→], [subject (중1수학 등)],
  [2022_achievement_standard], [→], [chapter_code (매핑 테이블)],
  [level_of_difficulty (상/중/하)], [→], [difficulty (3/2/1)],
  [types_of_problems], [→], [type (multiple_choice/descriptive)],
  [문항 text_description], [→], [question (LaTeX 보존)],
  [정답 text_description], [→], [answer],
  [오답 text_description], [→], [choices (JSON array)],
  [해설 text_description], [→], [solution],
)

=== 성취기준 매핑 예시

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt,
  [*성취기준 코드*], [*chapter_code*], [*내용*],
  [`9수01-01`], [`1-1-3` (중1)], [소인수분해],
  [`9수02-13`], [`2-2-1` (중2)], [연립방정식],
  [`9수03-16`], [`5-1-1` (중3)], [삼각비],
  [`10공수1-02-02`], [`2-1-2` (고1)], [이차방정식 판별식],
)

=== 파일 변경사항

#table(
  columns: (1fr, 2fr),
  inset: 6pt,
  [*파일*], [*내용*],
  [`scripts/import-aihub-71859.js`], [AI-Hub 71859 import 스크립트 (신규)],
  [`docs/PHASE3_RESEARCH.md`], [소스 조사 리포트 (신규)],
  [`server/exam_builder.db`], [9,933건 문제 추가],
)

= 테스트 결과

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  [*\#*], [*테스트 항목*], [*결과*],
  [1], [Import 스크립트 실행 (16개 ZIP 처리)], [PASS],
  [2], [총 import 수 확인 (9,933건)], [PASS],
  [3], [과목별 분포 확인 (5개 과목)], [PASS],
  [4], [API 조회 (GET /api/problems?subject=중2수학)], [PASS],
  [5], [LaTeX 수식 보존 확인 ($\\triangle$, $\\times$, $\\frac{}{}$ 등)], [PASS],
  [6], [객관식 보기 파싱 확인 (①~⑤ 분리)], [PASS],
)

*6/6 PASS (100%)*

= 결론 및 다음 단계

Phase 3 문제 은행 구축이 성공적으로 완료되었다.

*구현된 기능:*
- AI-Hub 71859 데이터 자동 import 파이프라인
- 2022 성취기준 → curriculum 매핑 테이블 (54개 코드)
- 객관식 보기 자동 분리 및 정답 번호 추출
- LaTeX 수식 무손실 보존

*현재 문제 은행 규모:*
- 총 9,940건 (기존 7건 + AI-Hub 9,933건)
- 중1~고1 전 범위 커버
- 객관식 70%, 주관식 30%

*다음 단계:*
- 프론트엔드 ProblemBank에서 대량 문제 페이지네이션 구현
- 문제 검색/필터 고도화 (성취기준별, 키워드별)
- AI-Hub 71718 (84,203건) 추가 import 검토
- 학생별 취약 유형 분석 (Phase 4)
