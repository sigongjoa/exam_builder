#!/usr/bin/env node
/**
 * AI-Hub 71859 "수학 교과 문제 풀이과정 데이터" Import Script
 *
 * 중1~고1 라벨링 데이터(JSON)를 Exam Builder problems 테이블에 import한다.
 * - 객관식/주관식 모두 지원
 * - LaTeX 수식 그대로 보존
 * - 2022 성취기준 코드 → curriculum chapter_code 매핑
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');

// === Configuration ===
const DATA_ROOT = path.join(__dirname, '..', '30.수학 교과 문제 풀이과정 데이터', '3.개방데이터', '1.데이터');
const DB_PATH = path.join(__dirname, '..', 'server', 'exam_builder.db');

// === 2022 성취기준 → chapter_code 매핑 ===
// [9수XX-YY] → 중학수학, [10공수N-XX-YY] → 공통수학N
const STANDARD_TO_CHAPTER = {
  // ── 중1수학 ──
  '9수01-01': '1-1-3',   // 소인수분해
  '9수01-02': '1-1-4',   // 최대공약수/최소공배수
  '9수01-03': '1-2-1',   // 양수와 음수, 정수
  '9수01-04': '1-2-3',   // 대소관계
  '9수01-05': '1-2-4',   // 사칙계산
  '9수02-01': '2-1-1',   // 문자의 사용과 식의 값
  '9수02-02': '2-1-2',   // 일차식의 계산
  '9수02-03': '2-1-3',   // 일차방정식의 풀이
  '9수02-04': '2-1-4',   // 일차방정식의 활용
  '9수02-05': '2-2-1',   // 순서쌍과 좌표평면
  '9수02-06': '2-2-1',   // 그래프 (좌표평면과 그래프)
  '9수02-07': '2-2-2',   // 정비례와 반비례
  '9수03-01': '3-1-1',   // 점, 선, 면, 각
  '9수03-02': '3-1-2',   // 위치 관계
  '9수03-03': '3-1-3',   // 평행선의 성질
  '9수03-04': '3-1-4',   // 작도와 합동
  '9수03-05': '3-2-1',   // 다각형의 성질
  '9수03-06': '3-2-2',   // 원과 부채꼴
  '9수03-07': '3-3-1',   // 다면체와 회전체
  '9수03-08': '3-3-2',   // 겉넓이와 부피
  '9수04-01': '4-1-1',   // 대푯값
  '9수04-02': '4-1-2',   // 도수분포표와 그래프
  '9수04-03': '4-1-3',   // 상대도수

  // ── 중2수학 ──
  '9수01-06': '1-1-1',   // 순환소수
  '9수02-08': '1-2-1',   // 지수법칙
  '9수02-09': '1-2-3',   // 다항식의 계산
  '9수02-10': '1-2-2',   // 단항식의 곱셈과 나눗셈
  '9수02-11': '2-1-1',   // 부등식의 성질과 풀이
  '9수02-12': '2-1-2',   // 일차부등식의 활용
  '9수02-13': '2-2-1',   // 연립방정식의 풀이
  '9수02-14': '3-1-1',   // 일차함수의 뜻
  '9수02-15': '3-1-1',   // 일차함수의 그래프
  '9수02-16': '3-1-2',   // 일차함수의 식 구하기
  '9수02-17': '3-1-3',   // 일차함수와 일차방정식
  '9수02-18': '3-1-3',   // 두 일차함수 그래프와 연립방정식
  '9수03-09': '4-1-1',   // 이등변삼각형
  '9수03-10': '4-1-3',   // 외심과 내심
  '9수03-11': '4-2-1',   // 사각형의 성질
  '9수03-12': '5-1-1',   // 닮음의 뜻과 성질
  '9수03-13': '5-1-2',   // 삼각형의 닮음 조건
  '9수03-14': '5-1-3',   // 평행선과 선분의 비
  '9수03-15': '5-1-4',   // 중점연결정리와 무게중심
  '9수04-04': '7-1-1',   // 경우의 수
  '9수04-05': '7-1-2',   // 확률의 뜻
  '9수04-06': '7-1-3',   // 확률의 계산

  // ── 중3수학 ──
  '9수01-07': '1-1-1',   // 제곱근
  '9수01-08': '1-1-2',   // 무리수와 실수
  '9수01-09': '1-1-2',   // 실수의 대소관계
  '9수01-10': '1-1-3',   // 근호 포함 식의 사칙계산
  '9수02-19': '2-1-1',   // 다항식의 곱셈과 인수분해
  '9수02-20': '3-1-1',   // 이차방정식
  '9수02-21': '4-1-1',   // 이차함수의 개념
  '9수02-22': '4-1-1',   // 이차함수의 그래프
  '9수03-16': '5-1-1',   // 삼각비
  '9수03-17': '5-1-3',   // 삼각비의 활용
  '9수03-18': '6-1-1',   // 원과 직선
  '9수03-19': '6-1-2',   // 원주각
  '9수04-07': '7-1-2',   // 분산과 표준편차
  '9수04-08': '7-1-3',   // 산점도와 상관관계

  // ── 공통수학1 (고1) ──
  '10공수1-01-01': '1-1-1', // 다항식의 사칙연산
  '10공수1-01-02': '1-2-1', // 항등식과 나머지정리
  '10공수1-01-03': '1-3-1', // 인수분해
  '10공수1-02-01': '2-1-1', // 복소수
  '10공수1-02-02': '2-1-2', // 이차방정식 판별식
  '10공수1-02-03': '2-1-3', // 근과 계수의 관계
  '10공수1-02-04': '2-2-1', // 이차방정식과 이차함수
  '10공수1-02-05': '2-3-1', // 고차방정식
  '10공수1-02-06': '2-2-1', // 이차함수 최대최소
  '10공수1-03-01': '3-1-1', // 합의 법칙과 곱의 법칙
  '10공수1-03-02': '3-1-2', // 순열
  '10공수1-03-03': '3-1-3', // 조합

  // ── 공통수학2 (고1) ──
  '10공수2-01-01': '1-1-1', // 두 점 사이의 거리
  '10공수2-01-02': '1-2-1', // 직선의 방정식
  '10공수2-01-03': '1-3-1', // 원의 방정식
  '10공수2-01-04': '1-4-1', // 평행이동
  '10공수2-02-01': '2-1-1', // 집합
  '10공수2-02-02': '2-2-1', // 명제
  '10공수2-03-01': '3-1-1', // 함수
  '10공수2-03-02': '3-1-2', // 합성함수와 역함수
  '10공수2-03-03': '3-1-2', // 합성함수와 역함수
  '10공수2-03-04': '3-1-3', // 유리함수
  '10공수2-03-05': '3-1-4', // 무리함수
};

// 학년→subject 매핑
const GRADE_SUBJECT = {
  '중학교_1학년': '중1수학',
  '중학교_2학년': '중2수학',
  '중학교_3학년': '중3수학',
};

// 고1은 성취기준으로 구분
function getSubject(grade, standardCode) {
  if (grade !== '고등학교_1학년') {
    return GRADE_SUBJECT[grade] || null;
  }
  if (standardCode.startsWith('10공수2')) return '공통수학2';
  return '공통수학1';
}

// 난이도 매핑
const DIFFICULTY_MAP = { '하': 1, '중': 2, '상': 3 };

// === JSON 파싱 로직 ===
function parseQuestion(learningData) {
  const parts = { question: [], answer: [], wrongAnswers: [], solution: [] };

  for (const item of learningData) {
    const cls = item.class_name;
    const texts = (item.class_info_list || [])
      .map(info => info.text_description)
      .filter(t => t && t.trim());

    if (cls.startsWith('문항')) {
      parts.question.push(...texts);
    } else if (cls.startsWith('정답')) {
      parts.answer.push(...texts);
    } else if (cls.startsWith('오답')) {
      parts.wrongAnswers.push(...texts);
    } else if (cls.startsWith('해설')) {
      parts.solution.push(...texts);
    }
  }

  return parts;
}

// 객관식 보기 조립
function buildChoices(answerTexts, wrongTexts) {
  // 오답 텍스트에서 ①②③④⑤ 패턴으로 분리
  const allChoices = [];
  const circleNums = ['①', '②', '③', '④', '⑤'];

  // 오답 텍스트를 개별 보기로 분리
  for (const text of wrongTexts) {
    // ① ② 등으로 시작하는 패턴 분리
    const splits = text.split(/(?=[①②③④⑤])/).filter(s => s.trim());
    allChoices.push(...splits.map(s => s.trim()));
  }

  // 정답 텍스트 추가
  for (const text of answerTexts) {
    const splits = text.split(/(?=[①②③④⑤])/).filter(s => s.trim());
    allChoices.push(...splits.map(s => s.trim()));
  }

  // 번호순 정렬
  allChoices.sort((a, b) => {
    const aIdx = circleNums.findIndex(c => a.startsWith(c));
    const bIdx = circleNums.findIndex(c => b.startsWith(c));
    return aIdx - bIdx;
  });

  // 중복 제거
  const unique = [...new Set(allChoices)];
  return unique.length > 0 ? unique : null;
}

// 정답 번호 추출 (객관식)
function extractAnswerNumber(answerTexts) {
  const circleNums = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5' };
  for (const text of answerTexts) {
    for (const [circle, num] of Object.entries(circleNums)) {
      if (text.startsWith(circle)) return num;
    }
  }
  return answerTexts.join('\n');
}

// === Main Import ===
async function main() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, subject TEXT NOT NULL, chapter_code TEXT NOT NULL,
      pattern_type TEXT, pattern_name TEXT, difficulty INTEGER DEFAULT 2,
      question TEXT NOT NULL, choices TEXT, answer TEXT NOT NULL,
      solution TEXT, status TEXT DEFAULT 'draft', source TEXT DEFAULT 'ai',
      ai_model TEXT, points INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const insertStmt = db.prepare(`
    INSERT INTO problems (type, subject, chapter_code, pattern_type, pattern_name,
      difficulty, question, choices, answer, solution, status, source, points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Zip file patterns: TL_05~08 (Training), VL_05~08 (Validation)
  const zipConfigs = [
    { prefix: 'TL_05', grade: '중학교_1학년' },
    { prefix: 'TL_06', grade: '중학교_2학년' },
    { prefix: 'TL_07', grade: '중학교_3학년' },
    { prefix: 'TL_08', grade: '고등학교_1학년' },
    { prefix: 'VL_05', grade: '중학교_1학년' },
    { prefix: 'VL_06', grade: '중학교_2학년' },
    { prefix: 'VL_07', grade: '중학교_3학년' },
    { prefix: 'VL_08', grade: '고등학교_1학년' },
  ];

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const stats = {};

  const insertAll = db.transaction((records) => {
    for (const r of records) {
      insertStmt.run(
        r.type, r.subject, r.chapter_code, r.pattern_type, r.pattern_name,
        r.difficulty, r.question, r.choices, r.answer, r.solution,
        r.status, r.source, r.points
      );
    }
  });

  for (const split of ['Training', 'Validation']) {
    const labelDir = path.join(DATA_ROOT, split, '02.라벨링데이터');
    if (!fs.existsSync(labelDir)) continue;

    const zipFiles = fs.readdirSync(labelDir).filter(f => f.endsWith('.zip'));

    for (const zipFile of zipFiles) {
      // Match only grades we care about
      const config = zipConfigs.find(c => zipFile.startsWith(c.prefix));
      if (!config) continue;

      const isMultipleChoice = zipFile.includes('객관식');
      const zipPath = path.join(labelDir, zipFile);

      console.log(`\nProcessing: ${zipFile}`);

      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries().filter(e => e.entryName.endsWith('.json'));
      const records = [];

      for (const entry of entries) {
        try {
          const jsonStr = entry.getData().toString('utf-8');
          const data = JSON.parse(jsonStr);

          const sourceInfo = data.source_data_info;
          const rawInfo = data.raw_data_info;

          // Get achievement standard code
          const standards2022 = sourceInfo['2022_achievement_standard'] || [];
          let standardCode = '';
          let standardText = '';
          for (const s of standards2022) {
            const match = s.match(/\[([^\]]+)\]/);
            if (match) {
              standardCode = match[1];
              standardText = s;
              break;
            }
          }

          if (!standardCode) {
            totalSkipped++;
            continue;
          }

          // Map to our chapter_code
          const chapterCode = STANDARD_TO_CHAPTER[standardCode];
          if (!chapterCode) {
            totalSkipped++;
            continue;
          }

          const subject = getSubject(config.grade, standardCode);
          if (!subject) {
            totalSkipped++;
            continue;
          }

          const difficulty = DIFFICULTY_MAP[sourceInfo.level_of_difficulty] || 2;
          const parts = parseQuestion(data.learning_data_info);

          if (parts.question.length === 0) {
            totalSkipped++;
            continue;
          }

          const questionText = parts.question.join('\n\n');
          let answer, choices;

          if (isMultipleChoice) {
            answer = extractAnswerNumber(parts.answer);
            const choicesList = buildChoices(parts.answer, parts.wrongAnswers);
            choices = choicesList ? JSON.stringify(choicesList) : null;
          } else {
            answer = parts.answer.join('\n');
            choices = null;
          }

          const solution = parts.solution.length > 0 ? parts.solution.join('\n') : null;

          // Determine pattern from achievement standard text
          const patternName = standardText.replace(/\[[^\]]+\]\s*/, '').substring(0, 50);

          records.push({
            type: isMultipleChoice ? 'multiple_choice' : 'descriptive',
            subject,
            chapter_code: chapterCode,
            pattern_type: standardCode,
            pattern_name: patternName,
            difficulty,
            question: questionText,
            choices,
            answer: answer || '(답 없음)',
            solution,
            status: 'approved',  // AI-Hub 검증 데이터이므로 approved
            source: 'aihub_71859',
            points: difficulty <= 1 ? 3 : difficulty === 2 ? 5 : 7,
          });

          // Stats
          const key = `${subject}`;
          stats[key] = (stats[key] || 0) + 1;

        } catch (err) {
          totalErrors++;
        }
      }

      // Batch insert
      if (records.length > 0) {
        insertAll(records);
        totalImported += records.length;
        console.log(`  → ${records.length} problems imported`);
      }
    }
  }

  db.close();

  console.log('\n========================================');
  console.log('Import Complete!');
  console.log(`  Total imported: ${totalImported}`);
  console.log(`  Skipped (no mapping): ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log('\nBy subject:');
  for (const [subj, count] of Object.entries(stats).sort()) {
    console.log(`  ${subj}: ${count}건`);
  }
  console.log('========================================');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
