const Database = require('better-sqlite3');
const path = require('path');

// 1. DB 연결
const DB_PATH = path.join(__dirname, '..', 'server', 'exam_builder.db');

function run() {
  let db;
  try {
    db = new Database(DB_PATH, { verbose: null });
    console.log(`Connected to database at: ${DB_PATH}`);

    // 2. 검증된 복수 정답 수동 수정
    const HARDCODED_FIXES = [
      { id: 5747, answer: '2,5', reason: '무리수가 아닌 실수 (정답 2개): ②-√1.96=-1.4(유리수), ⑤√(-½)²=½(유리수)' },
      { id: 6695, answer: '2,5', reason: '옳지 않은 것 모두: ②√44=4√11틀림(실제2√11), ⑤-√(30/8)=-5/4틀림(실제-√15/2)' },
    ];

    console.log('\n--- Applying Hardcoded Fixes ---');
    let fixedCount = 0;
    const updateStmt = db.prepare('UPDATE problems SET answer = ? WHERE id = ?');
    const selectStmt = db.prepare('SELECT id, answer FROM problems WHERE id = ?');

    for (const fix of HARDCODED_FIXES) {
      const before = selectStmt.get(fix.id);
      if (before) {
        console.log(`[ID ${fix.id}] Before: "${before.answer}" | Reason: ${fix.reason}`);
        updateStmt.run(fix.answer, fix.id);
        const after = selectStmt.get(fix.id);
        console.log(`[ID ${fix.id}] After : "${after.answer}"`);
        fixedCount++;
      } else {
        console.warn(`[ID ${fix.id}] Problem not found in database.`);
      }
    }

    // 3. '모두 고르면' 패턴 문제 전수 조사
    console.log('\n--- Investigating "Select All" Patterns ---');
    const multiPatternProblems = db.prepare(`
      SELECT id, answer, question 
      FROM problems 
      WHERE (question LIKE '%모두 고르면%' OR question LIKE '%모두 고르시오%' OR question LIKE '%(정답 %개)%')
      AND type = 'multiple_choice'
      ORDER BY id
    `).all();

    multiPatternProblems.forEach(p => {
      const qPreview = p.question.replace(/\n/g, ' ').substring(0, 80);
      console.log(`[ID ${p.id}] Ans: ${p.answer.padEnd(5)} | Q: ${qPreview}...`);
    });

    // 4. answer가 단일 숫자가 아닌(수식/텍스트) MC 문제 조회
    console.log('\n--- Investigating Non-Numeric MC Answers (Formula/Text) ---');
    const allMC = db.prepare("SELECT id, answer, question FROM problems WHERE type = 'multiple_choice' AND answer != '(답 없음)'").all();
    const formulaAnswers = allMC.filter(p => !/^[1-5](,[1-5])*$/.test(p.answer));

    formulaAnswers.slice(0, 20).forEach(p => {
      const qPreview = p.question.replace(/\n/g, ' ').substring(0, 80);
      console.log(`[ID ${p.id}] Raw Ans: ${p.answer.padEnd(10)} | Q: ${qPreview}...`);
    });

    // 5. 실행 요약 출력
    console.log('\n=========================================');
    console.log('Execution Summary:');
    console.log(`- Hardcoded updates applied      : ${fixedCount}`);
    console.log(`- "Select All" pattern problems  : ${multiPatternProblems.length}`);
    console.log(`- Non-standard MC answer strings : ${formulaAnswers.length}`);
    console.log('=========================================');

  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    if (db) db.close();
  }
}

run();
