const Database = require('better-sqlite3');
const db = new Database('server/exam_builder.db');

// 커리큘럼 데이터 확인 (중1수학)
const curr = db.prepare("SELECT chapter_code, level1, level2, level3 FROM curriculum WHERE subject='중1수학' LIMIT 20").all();
console.log('=== 중1수학 커리큘럼 ===');
curr.forEach(r => console.log(r.chapter_code, r.level1, '/', r.level2, '/', r.level3));

// 그 chapter_code들이 problems에 실제로 있는지 확인
const currCodes = curr.map(r => r.chapter_code);
const placeholders = currCodes.map(() => '?').join(',');
const probCheck = db.prepare(`SELECT chapter_code, COUNT(*) as cnt FROM problems WHERE chapter_code IN (${placeholders}) AND status='approved' GROUP BY chapter_code`).all(currCodes);
console.log('\n=== 해당 chapter_code의 approved 문제 수 ===');
probCheck.forEach(r => console.log(r.chapter_code, r.cnt));

// 모든 과목의 커리큘럼 수
const allSubjects = db.prepare("SELECT subject, COUNT(*) as cnt FROM curriculum GROUP BY subject").all();
console.log('\n=== 과목별 커리큘럼 단원 수 ===');
allSubjects.forEach(r => console.log(r.subject, r.cnt));

db.close();
