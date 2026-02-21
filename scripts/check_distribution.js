const Database = require('better-sqlite3');
const db = new Database('server/exam_builder.db');

// 선택한 3개 단원의 난이도별 문제 수 확인
const chapters = ['1-1-1', '1-1-3', '1-2-4'];
console.log('=== 단원별 난이도별 approved 문제 수 ===');
for (const ch of chapters) {
    const rows = db.prepare("SELECT difficulty, COUNT(*) as cnt FROM problems WHERE chapter_code=? AND status='approved' GROUP BY difficulty ORDER BY difficulty").all(ch);
    console.log(`\n${ch}:`);
    rows.forEach(r => console.log(`  난이도 ${r.difficulty}: ${r.cnt}개`));
}

// 현재 시험 8번에 어떤 문제들이 있는지
const examProblems = db.prepare(`
    SELECT p.id, p.chapter_code, p.difficulty, p.type
    FROM exam_problems ep
    JOIN problems p ON ep.problem_id = p.id
    WHERE ep.exam_id = 8
    ORDER BY ep.sort_order
`).all();

console.log('\n=== 시험 #8 문제 목록 ===');
examProblems.forEach((p, i) => {
    console.log(`  ${i+1}. #${p.id} ${p.chapter_code} 난이도:${p.difficulty} ${p.type}`);
});

db.close();
