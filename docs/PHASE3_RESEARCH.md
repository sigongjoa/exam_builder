# Phase 3 리서치: 온라인 수학 문제 소스 조사 보고서

> 2026-02-17 | Exam Builder 문제 은행 확장을 위한 외부 데이터 소스 조사

---

## 1. 조사 요약

### 핵심 발견
총 **15개 소스**를 조사하여 **3개 최우선 소스**를 선정했다:

| 순위 | 소스 | 문제 수 | 형식 | 우리 시스템 호환성 | 추천도 |
|------|------|---------|------|-------------------|--------|
| **1** | AI-Hub 수학 교과 문제 풀이과정 (71859) | 20,319건 | JSON+이미지 | ★★★★☆ | **최우선** |
| **2** | AI-Hub 수학 과목 문제 생성 (71718) | 84,203건 | JSON+이미지 | ★★★☆☆ | **우선** |
| **3** | HuggingFace ko-math-500 | 500건 | JSON (LaTeX) | ★★★★★ | **즉시 사용** |

---

## 2. 소스별 상세 분석

### 2.1 공식 기출문제 소스

#### EBSi (수능/평가원/교육청)
- **URL**: https://www.ebsi.co.kr/
- **문제 수**: 수만~수십만 (역대 수능 + 모의고사)
- **형식**: PDF (HWP 원본)
- **난이도**: 중하~최상
- **접근성**: 무료 (회원가입 필요)
- **크롤링 가능성**: ★★★☆☆ (PDF에서 텍스트 추출 필요, 수식은 이미지)
- **법적**: 평가원 기출은 비영리 교육 목적 사용 가능

#### 한국교육과정평가원 (KICE)
- **URL**: https://www.kice.re.kr/
- **문제 수**: 수능 + 모의평가 전체
- **형식**: PDF
- **난이도**: 수능 수준
- **접근성**: 무료 공개
- **크롤링 가능성**: ★★☆☆☆ (PDF 파싱 복잡)

#### 레전드스터디닷컴
- **URL**: https://legendstudy.com/
- **문제 수**: 수천 (역대 수능 기출)
- **형식**: 웹페이지 + PDF + 이미지
- **난이도**: 중~최상
- **접근성**: 무료
- **크롤링 가능성**: ★★★☆☆

### 2.2 AI-Hub 데이터셋 (★ 최우선)

#### [1순위] 수학 교과 문제 풀이과정 데이터 (71859)
- **URL**: https://www.aihub.or.kr/aihubdata/data/view.do?aihubDataSe=data&dataSetSn=71859
- **구축년도**: 2024 (갱신: 2026-01)
- **규모**: 20,319건

**학년별 분포**:
| 학년 | 건수 | 비율 |
|------|------|------|
| 초3~6 | 8,951 | 44% |
| **중1** | **3,444** | **17%** |
| **중2** | **3,569** | **17.6%** |
| **중3** | **3,164** | **15.6%** |
| **고1** | **1,191** | **5.9%** |

**난이도**: 상 814건 / 중 6,606건 / 하 12,899건
**유형**: 객관식 13,875건 (68%) / 주관식 6,444건 (32%)

**JSON 구조**:
```json
{
  "raw_data_info": {
    "publisher": "교학사/대교",
    "school": "중학",
    "grade": "2",
    "semester": "1학기",
    "subject": "수학",
    "revision_year": "2022"
  },
  "source_data_info": {
    "2022_achievement_standard": "성취기준 코드",
    "level_of_difficulty": "중",
    "types_of_problems": "객관식"
  },
  "learning_data_info": {
    "class_name": "문항(텍스트)/정답/해설",
    "text_description": "문제 텍스트 내용"
  }
}
```

**Exam Builder 매핑**:
| AI-Hub 필드 | → | Exam Builder 필드 |
|------------|---|-------------------|
| school + grade | → | subject (중2수학) |
| 2022_achievement_standard | → | chapter_code (매핑 테이블 필요) |
| level_of_difficulty (상/중/하) | → | difficulty (3/2/1) |
| types_of_problems | → | type (multiple_choice/descriptive) |
| text_description (문항) | → | question |
| text_description (정답) | → | answer |
| text_description (해설) | → | solution |

**제약**: 이미지 기반 (PNG + 바운딩박스), OCR 텍스트 추출 필요. 내국인만 다운로드.

---

#### [2순위] 수학 과목 문제 생성 데이터 (71718)
- **URL**: https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=71718
- **구축년도**: 2023 (갱신: 2024-12)
- **규모**: 84,203건 (원천데이터)

**학년별 분포**: 초3~6 43,584건 / 중1~3 33,046건 / 고등 6,573건
**난이도**: 상 19.1% / 중 52.5% / 하 28.4%

**JSON 필드**:
```
question_grade, question_term, question_unit, question_topic,
question_topic_name, question_type1, question_type2,
question_difficulty, question_contents, question_text,
answer_text
```

**장점**:
- question_unit, question_topic으로 단원 분류가 잘 되어있음
- question_difficulty 포함
- 규모가 84,203건으로 대량

**단점**: 이미지 기반 (PNG), OCR 변환 필요

---

### 2.3 HuggingFace 데이터셋

#### [3순위] davidkim205/ko-math-500
- **URL**: https://huggingface.co/datasets/davidkim205/ko-math-500
- **규모**: 500건
- **형식**: JSON (LaTeX 수식 포함!)

**JSON 구조**:
```json
{
  "problem": "직교 좌표 $(0,3)$를 극 좌표로 변환하시오.",
  "solution": "주어진 점 $(0,3)$에 대해 $r$은 다음과 같이 계산된다: $r = \\sqrt{0^2 + 3^2} = 3$...",
  "answer": "\\left( 3, \\frac{\\pi}{2} \\right)",
  "subject": "미적분학 준비",
  "level": 2,
  "id": "test/precalculus/807.json"
}
```

**Exam Builder 매핑**:
| HuggingFace 필드 | → | Exam Builder 필드 |
|-----------------|---|-------------------|
| problem | → | question (LaTeX 그대로 사용!) |
| answer | → | answer |
| solution | → | solution |
| subject | → | subject (영어→한국어 매핑 필요) |
| level (1~5) | → | difficulty (매핑: 1-2→1, 3→2, 4-5→3) |

**장점**: LaTeX 포함! 즉시 import 가능, KaTeX 렌더링과 완벽 호환
**단점**: 500건으로 소량, 한국 교육과정 단원 분류 없음

#### ChuGyouk/CSAT-Math-Test
- **URL**: https://huggingface.co/datasets/ChuGyouk/CSAT-Math-Test
- **규모**: < 1K (2023/2024 수능)
- **라이선스**: Other (공유 제한)
- **형식**: JSON (개방형 질문으로 변환됨)

#### ChuGyouk Korean Math Dataset Collection
- **URL**: https://huggingface.co/collections/ChuGyouk/korean-math-dataset
- 여러 데이터셋 모음, 수천~수만건
- 일부 라이선스 제약

---

### 2.4 GitHub 데이터셋

#### tunib-ai/KMWP (Korean Math Word Problems)
- **URL**: https://github.com/tunib-ai/KMWP
- **규모**: 수천건 (8가지 유형)
- **형식**: JSON (서술형 문제)
- **활용**: NLP 기반 자동 풀이 연구용
- **호환성**: ★★★☆☆ (서술형만, 단원 분류 부족)

#### jkc-ai/mwp-korean-data-2021
- **URL**: https://github.com/jkc-ai/mwp-korean-data-2021
- **규모**: 3,000건
- **형식**: JSON
- **호환성**: ★★★☆☆ (초등 수준, 단원 분류 부족)

### 2.5 크롤링 가능한 사이트

| 사이트 | 무료 | 크롤링 난이도 | 법적 리스크 |
|--------|------|-------------|-----------|
| 칸아카데미 | 무료 | 중 | 낮음 (CC 라이선스) |
| 모두매쓰 | 무료 (일일제한) | 중 | 중 |
| 메가스터디 | 부분유료 | 어려움 | 높음 |
| 족보닷컴 | 유료 | 매우 어려움 | 매우 높음 |

---

## 3. 추천 실행 계획

### 3.1 즉시 실행 (1주차)
1. **HuggingFace ko-math-500 import** - 500건, JSON→DB 직접 변환 스크립트
2. **GitHub KMWP/mwp-korean-data-2021 import** - 수천건 추가

### 3.2 단기 (2~3주차)
3. **AI-Hub 71859 다운로드 신청** - 20,319건, OCR 텍스트 추출 파이프라인
4. **AI-Hub 71718 다운로드 신청** - 84,203건, 대량 데이터

### 3.3 중기 (4~6주차)
5. **EBSi 수능 기출 PDF 파싱** - PDF→텍스트→JSON 변환기
6. **레전드스터디 크롤링** - 무료 기출문제 수집

### 3.4 데이터 품질 등급

| 소스 | 수량 | 퀄리티 | 단원분류 | LaTeX | 총점 |
|------|------|--------|---------|-------|------|
| ko-math-500 | ★☆☆ | ★★★★★ | ★★☆☆☆ | ★★★★★ | 13/25 |
| AI-Hub 71859 | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★☆☆☆☆ | 14/25 |
| AI-Hub 71718 | ★★★★★ | ★★★☆☆ | ★★★★★ | ★☆☆☆☆ | 14/25 |
| KMWP | ★★☆☆☆ | ★★★☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | 7/25 |
| EBSi 기출 | ★★★★★ | ★★★★★ | ★★★☆☆ | ★☆☆☆☆ | 14/25 |

---

## 4. 참고 소스

- [AI-Hub 수학 교과 문제 풀이과정 (71859)](https://www.aihub.or.kr/aihubdata/data/view.do?aihubDataSe=data&dataSetSn=71859)
- [AI-Hub 수학 과목 문제 생성 (71718)](https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=71718)
- [HuggingFace ko-math-500](https://huggingface.co/datasets/davidkim205/ko-math-500)
- [HuggingFace CSAT-Math-Test](https://huggingface.co/datasets/ChuGyouk/CSAT-Math-Test)
- [GitHub tunib-ai/KMWP](https://github.com/tunib-ai/KMWP)
- [GitHub jkc-ai/mwp-korean-data-2021](https://github.com/jkc-ai/mwp-korean-data-2021)
- [EBSi](https://www.ebsi.co.kr/)
- [레전드스터디](https://legendstudy.com/)
- [KICE 학생평가지원포탈](https://stas.moe.go.kr/)
