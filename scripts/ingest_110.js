const Database = require('better-sqlite3');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../server/dataset_110.db');
const db = new Database(DB_PATH);

// Dataset 110 Specific Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    grade TEXT,
    subject TEXT,
    question_type TEXT,
    question_text TEXT,
    answer_text TEXT,
    solution_text TEXT,
    difficulty TEXT,
    achievement_standard TEXT,
    raw_metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_grade_subject ON problems(grade, subject);
`);

const DATA_DIR = path.join(__dirname, '../dataset/110.수학 과목 자동 풀이 데이터/3.개방데이터/1.데이터/Training/02.라벨링데이터');

function ingest110() {
    if (!fs.existsSync(DATA_DIR)) {
        console.error(`Directory not found: ${DATA_DIR}`);
        return;
    }

    const zipFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.zip'));
    const insertStmt = db.prepare(`
        INSERT INTO problems (file_name, grade, subject, question_type, question_text, answer_text, solution_text, difficulty, achievement_standard, raw_metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    console.log(`Starting full ingestion for Dataset 110 from ${zipFiles.length} zip files...`);

    for (const zipFile of zipFiles) {
        console.log(`Processing ${zipFile}...`);
        try {
            const zip = new AdmZip(path.join(DATA_DIR, zipFile));
            const entries = zip.getEntries();
            
            db.transaction(() => {
                for (const entry of entries) {
                    if (!entry.entryName.endsWith('.json')) continue;
                    
                    try {
                        const content = entry.getData().toString('utf8');
                        const json = JSON.parse(content);
                        
                        // Mapping based on typical AI-Hub Math 110 schema
                        const qInfo = json.question_info || {};
                        const ocrInfo = json.OCR_info?.[0] || {};
                        const solInfo = json.solution_info?.[0] || {};
                        
                        insertStmt.run(
                            entry.name,
                            qInfo.grade || '',
                            qInfo.subject || '수학',
                            qInfo.question_type || '',
                            ocrInfo.question_text || '',
                            solInfo.answer_text || '',
                            solInfo.solution_text || '',
                            qInfo.difficulty || '',
                            qInfo.achievement_standard || '',
                            content
                        );
                    } catch (e) {
                        // Skip individual file errors
                    }
                }
            })();
            console.log(`  Done: ${zipFile}`);
        } catch (e) {
            console.error(`  Error processing zip ${zipFile}:`, e.message);
        }
    }
    console.log('Ingestion for Dataset 110 complete.');
}

ingest110();
