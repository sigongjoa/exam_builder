const Database = require('better-sqlite3');
const db = new Database('server/exam_builder.db');

// 스마트 출제 API와 동일한 쿼리 재현
const chapter_codes = ['1-1-1', '1-1-3', '1-2-4'];
const subject = '중1수학';

for (const difficulty of ['1', '2', '3']) {
    const placeholders = chapter_codes.map(() => '?').join(',');
    let baseQuery = `
        SELECT id, chapter_code, type FROM problems
        WHERE status = 'approved'
        AND difficulty = ?
        AND chapter_code IN (${placeholders})
        AND subject = ?
    `;
    const params = [difficulty, ...chapter_codes, subject];

    // MC 쿼리
    const mcResult = db.prepare(baseQuery + ` AND type = 'multiple_choice' ORDER BY RANDOM() LIMIT 4`).all(...params);
    const descResult = db.prepare(baseQuery + ` AND type = 'descriptive' ORDER BY RANDOM() LIMIT 2`).all(...params);

    console.log(`\n난이도 ${difficulty} - MC:`, mcResult.map(p => `#${p.id}(${p.chapter_code})`).join(', '));
    console.log(`난이도 ${difficulty} - 서술형:`, descResult.map(p => `#${p.id}(${p.chapter_code})`).join(', '));

    // 각 단원별 가용 문제 수
    for (const code of chapter_codes) {
        const count = db.prepare(`SELECT COUNT(*) as cnt FROM problems WHERE chapter_code=? AND difficulty=? AND status='approved'`).get(code, difficulty);
        const mcCount = db.prepare(`SELECT COUNT(*) as cnt FROM problems WHERE chapter_code=? AND difficulty=? AND status='approved' AND type='multiple_choice'`).get(code, difficulty);
        const descCount = db.prepare(`SELECT COUNT(*) as cnt FROM problems WHERE chapter_code=? AND difficulty=? AND status='approved' AND type='descriptive'`).get(code, difficulty);
        console.log(`  ${code} 총:${count.cnt} MC:${mcCount.cnt} 서술:${descCount.cnt}`);
    }
}

db.close();
