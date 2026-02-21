const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../server/aihub_datasets.db');
const db = new Database(DB_PATH);

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER,
    grade TEXT,
    subject TEXT,
    content_text TEXT,
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/**
 * 특정 폴더 내의 모든 JSON 파일을 파싱하는 함수
 * @param {number} datasetId 
 * @param {string} type '110', '111', '30', '25'
 * @param {string} folderPath 
 */
function processFolder(datasetId, type, folderPath) {
  if (!fs.existsSync(folderPath)) {
    console.error(`Directory not found: ${folderPath}`);
    return;
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));
  console.log(`Processing ${files.length} files in ${folderPath}...`);

  const stmt = db.prepare(`
    INSERT INTO items (dataset_id, grade, subject, content_text, metadata_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  let count = 0;
  const transaction = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.datasetId, item.grade, item.subject, item.text, item.content);
    }
  });

  const batch = [];
  for (const file of files) {
    try {
      const filePath = path.join(folderPath, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Strip UTF-8 BOM if present
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      
      const json = JSON.parse(content);
      
      let grade = '', subject = '', text = '';
      if (type === '110' || type === '111') {
        // 수학 자동풀이 & 문제생성
        text = json.OCR_info?.[0]?.question_text || '';
        grade = json.question_info?.grade || '';
        subject = json.question_info?.subject || '수학';
      } else if (type === '30') {
        // 수학 풀이과정
        const learnInfo = json.learning_data_info?.['0'] || json.learning_data_info?.[0];
        text = learnInfo?.question_info?.question_text || '';
        grade = json.source_data_info?.grade || '';
        subject = json.source_data_info?.subject || '수학';
      } else if (type === '25') {
        // 서술형 글쓰기
        text = json.essay_question?.prompt || '';
        grade = json.essay_question?.grade || '';
        subject = json.essay_question?.subject || '국어';
      }

      batch.push({ datasetId, grade, subject, text, content });
      count++;

      if (batch.length >= 500) {
        transaction(batch);
        batch.length = 0;
        process.stdout.write(`.`);
      }
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  }

  if (batch.length > 0) {
    transaction(batch);
  }
  
  console.log(`
Successfully imported ${count} items.`);
}

// CLI arguments handling
const args = process.argv.slice(2);
if (args.length === 3) {
  const [datasetId, type, folderPath] = args;
  processFolder(parseInt(datasetId), type, folderPath);
} else {
  console.log('Usage: node scripts/process_unzipped.js <datasetId> <type> <folderPath>');
  console.log('Example: node scripts/process_unzipped.js 1 110 ./temp_unzip/labels');
}

module.exports = { processFolder };
