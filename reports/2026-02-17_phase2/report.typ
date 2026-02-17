#set document(title: "Exam Builder - Phase 2 문제 은행 & 자동화 테스트 리포트")
#set page(margin: 2cm, numbering: "1")
#set text(font: "Noto Sans CJK KR", size: 10pt)
#set heading(numbering: "1.1")

#align(center)[
  #text(size: 20pt, weight: "bold")[Exam Builder]
  #v(0.3em)
  #text(size: 14pt)[Phase 2 문제 은행 & 자동화 테스트 리포트]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[2026-02-17 | /sc:duo 자동 생성]
]

#line(length: 100%)

= 작업 요약

Phase 2는 Phase 1 MVP의 수동 시험지 생성 기능을 *자동화*하는 단계이다.

- *2.1 문제 변형 생성*: 기존 문제의 숫자만 바꿔 쌍둥이 문제 자동 생성 (Ollama 연동)
- *2.2 시험지 자동 구성*: 학생 프로필 기반 문제 자동 추천 + 그룹 일괄 시험지 생성

=== 구현 범위

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  align: (center, left, center),
  [*Phase*], [*내용*], [*상태*],
  [2.1a], [문제 변형 API (POST /api/generate/variant) - Ollama 쌍둥이 문제 생성], [완료],
  [2.1b], [ProblemBank UI에 "변형 생성" 버튼 추가], [완료],
  [2.2a], [자동 추천 API (POST /api/exams/auto) - 학생 프로필 기반], [완료],
  [2.2b], [그룹 일괄 생성 API (POST /api/exams/batch) - 같은 그룹 학생 일괄], [완료],
  [2.2c], [ExamCreate UI 개선 - 수동/자동/그룹 3가지 모드 탭], [완료],
)

= 테스트 결과

#table(
  columns: (auto, 1fr, auto, auto),
  inset: 8pt,
  align: (center, left, center, center),
  [*\#*], [*테스트 항목*], [*결과*], [*비고*],
  [1], [POST /api/generate/variant (엔드포인트 존재)], [PASS], [Ollama 필요],
  [2], [POST /api/exams/auto (학생 자동 시험지)], [PASS], [3문제 자동 선별],
  [3], [POST /api/exams/batch (그룹 일괄 생성)], [PASS], [2명 일괄 생성],
  [4], [GET /api/exams (목록에 auto/batch 결과 포함)], [PASS], [],
  [5], [Frontend Vite Build], [PASS], [5.21s],
)

*5/5 PASS (100%)*

=== 상세 테스트 결과

==== POST /api/exams/auto

요청:
```json
{"student_id": 4, "count": 3, "title": "2월 자동 시험지 - 김지후", "exam_type": "monthly"}
```

응답:
```json
{"id": 5, "message": "Auto exam created", "problem_count": 3}
```

로직: 학생의 subject(중1수학) + difficulty_level(basic→1) 기준으로 approved 문제에서 랜덤 3개 선택.

==== POST /api/exams/batch

요청:
```json
{"group_name": "중1반", "count": 3, "exam_type": "monthly", "title_prefix": "2월 월말고사"}
```

응답:
```json
{
  "message": "Batch exams created",
  "exams": [
    {"student_id": 4, "student_name": "김지후", "exam_id": 3, "problem_count": 3},
    {"student_id": 5, "student_name": "이서연", "exam_id": 4, "problem_count": 3}
  ]
}
```

로직: "중1반" 그룹의 모든 학생(2명)에 대해 각각의 프로필에 맞는 시험지를 트랜잭션으로 일괄 생성.

= 구현 파일 변경사항

#table(
  columns: (1fr, 2fr),
  inset: 6pt,
  [*파일*], [*변경 내용*],
  [`server/routes/generate.js`], [POST /variant 엔드포인트 추가 (쌍둥이 문제 생성)],
  [`server/routes/exams.js`], [POST /auto, POST /batch 엔드포인트 추가 + difficultyMap],
  [`client/src/pages/ProblemBank.jsx`], ["변형 생성" 버튼 추가 (카드 하단)],
  [`client/src/pages/ExamCreate.jsx`], [수동/자동/그룹 3가지 모드 탭 UI 추가],
)

= /sc:duo 워크플로우 실행 요약

#table(
  columns: (auto, 1fr, auto, auto),
  inset: 6pt,
  [*단계*], [*실행 내용*], [*실행자*], [*재시도*],
  [PLAN], [Phase 2 서브태스크 5개 분해], [Claude], [-],
  [IMPLEMENT 2.1a], [variant 엔드포인트 추가], [Gemini], [0],
  [IMPLEMENT 2.2a/b], [auto + batch 엔드포인트 추가], [Gemini], [0],
  [VERIFY], [exams.js reduce 문법 오류 수정], [Claude], [Gemini→Claude],
  [IMPLEMENT 2.1b], [ProblemBank "변형 생성" 버튼], [Claude 직접], [-],
  [IMPLEMENT 2.2c], [ExamCreate 3모드 탭 UI], [Claude 직접], [-],
  [TEST], [5개 API + 빌드 테스트], [Claude], [-],
)

=== Gemini 실패 및 Claude 수정 사항

- `exams.js` line 196: `problems.reduce((sum, p => ...)` → `(sum, p) => ...` 문법 오류 수정 [Claude 직접 수정]
- Gemini rate limit 발생 (exhausted capacity) → 자동 재시도로 복구

= 새로 추가된 기능 상세

=== 문제 변형 생성 (쌍둥이 문제)

원본 문제의 숫자만 변경하여 같은 유형의 변형 문제를 생성한다.
- Ollama에 원본 문제를 전달하고 "숫자만 바꿔라" 프롬프트로 요청
- 생성된 문제는 `source='ai_variant'`로 저장
- 원본과 같은 subject, chapter_code, difficulty 유지
- ProblemBank UI에서 카드별 "변형 생성" 버튼으로 호출 가능

=== 자동 추천 시험지

학생의 과목과 난이도에 맞는 승인된 문제를 자동으로 선별하여 시험지를 생성한다.
- difficulty_level 매핑: basic→1, intermediate→2, advanced→3
- `difficulty <= mappedDifficulty` 조건으로 필터 (기본 학생도 하 문제만 풀도록)
- `ORDER BY RANDOM()` 으로 매번 다른 문제 조합
- ExamCreate UI에서 "자동 추천" 탭으로 접근

=== 그룹 일괄 생성

같은 그룹의 모든 학생에게 각자의 프로필에 맞는 개별 시험지를 한번에 생성한다.
- 그룹 내 학생 목록 조회 → 각 학생별 auto 로직 적용
- 전체 트랜잭션으로 원자성 보장
- title = title_prefix + " - " + student.name
- ExamCreate UI에서 "그룹 일괄" 탭으로 접근, 대상 학생 미리보기 제공

= 결론 및 다음 단계

Phase 2 문제 은행 & 자동화가 성공적으로 완료됨.

*구현된 기능:*
- 쌍둥이 문제 변형 생성 (Ollama 연동)
- 학생 프로필 기반 자동 시험지 생성
- 그룹별 일괄 시험지 생성 (트랜잭션)
- ExamCreate UI 3모드 (수동/자동/그룹 일괄)
- ProblemBank "변형 생성" 버튼

*다음 단계 (Phase 3):*
- 학생별 취약 유형 분석
- 진도 추적 & 다음 단원 추천
- 오답 기반 유사 문제 추천
- PDF 문제지 텍스트 추출 (OCR)
