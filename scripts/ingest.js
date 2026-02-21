const Database = require('better-sqlite3');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../server/aihub_datasets.db');
const db = new Database(DB_PATH);

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aihub_id TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER,
    grade TEXT,
    subject TEXT,
    content_text TEXT,
    metadata_json TEXT,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
  );

  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER,
    stat_key TEXT,
    stat_value TEXT,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
  );
`);

const DATASET_ROOT = '/mnt/d/progress/mathesis/node20_Exam Builder';

const DATASETS_CONFIG = [
    {
        id: '110',
        name: '수학 과목 자동 풀이 데이터',
        paths: [path.join(DATASET_ROOT, 'dataset/110.수학 과목 자동 풀이 데이터/3.개방데이터/1.데이터/Training/02.라벨링데이터')],
        type: 'math_solve'
    },
    {
        id: '111',
        name: '수학 과목 문제생성 데이터',
        paths: [path.join(DATASET_ROOT, 'dataset/111.수학 과목 문제생성 데이터/3.개방데이터/1.데이터/Training/02.라벨링데이터')],
        type: 'math_gen'
    },
    {
        id: '30',
        name: '수학 교과 문제 풀이과정 데이터',
        paths: [path.join(DATASET_ROOT, '30.수학 교과 문제 풀이과정 데이터/3.개방데이터/1.데이터/Training/02.라벨링데이터')],
        type: 'math_process'
    },
    {
        id: '25',
        name: '서술형 글쓰기 평가 데이터',
        paths: [path.join(DATASET_ROOT, 'dataset/25.서술형 글쓰기 평가 데이터/3.개방데이터/1.데이터/Training/02.라벨링데이터')],
        type: 'writing'
    }
];

const SAMPLE_LIMIT_PER_ZIP = 50;

function ingest() {
    console.log('Starting ingestion...');

    for (const config of DATASETS_CONFIG) {
        console.log(`Processing dataset: ${config.name} (${config.id})`);

        // Upsert dataset
        const dsInsert = db.prepare('INSERT OR IGNORE INTO datasets (aihub_id, name) VALUES (?, ?)');
        dsInsert.run(config.id, config.name);
        const dataset = db.prepare('SELECT id FROM datasets WHERE aihub_id = ?').get(config.id);
        const datasetId = dataset.id;

        for (const dirPath of config.paths) {
            if (!fs.existsSync(dirPath)) {
                console.warn(`Path does not exist: ${dirPath}`);
                continue;
            }

            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.zip'));

            for (const zipFile of files) {
                console.log(`  Reading zip: ${zipFile}`);
                try {
                    const zip = new AdmZip(path.join(dirPath, zipFile));
                    const zipEntries = zip.getEntries();

                    let count = 0;
                    for (const entry of zipEntries) {
                        if (entry.entryName.endsWith('.json') && count < SAMPLE_LIMIT_PER_ZIP) {
                            const content = entry.getData().toString('utf8');
                            try {
                                const json = JSON.parse(content);

                                let grade = '';
                                let subject = '';
                                let text = '';

                                // Generic extraction based on observed schemas
                                if (config.type.startsWith('math')) {
                                    // Math datasets (110, 111, 30)
                                    const info = json.dataset_info || (json.metadata && json.metadata.dataset_info) || {};
                                    grade = info.grade || '';
                                    subject = info.subject || '';

                                    if (json.OCR_info && json.OCR_info[0]) {
                                        text = json.OCR_info[0].question_text || json.OCR_info[0].text || '';
                                    } else if (json.class_info) {
                                        const quest = json.class_info.find(c => c.class_name && c.class_name.includes('문항'));
                                        text = quest ? quest.class_info_list[0].text_description : '';
                                    }
                                } else if (config.type === 'writing') {
                                    // Writing dataset (25)
                                    grade = json.학년 || '';
                                    subject = json.과목 || '';
                                    text = json.원문 || '';
                                }

                                db.prepare(`
                  INSERT INTO items (dataset_id, grade, subject, content_text, metadata_json)
                  VALUES (?, ?, ?, ?, ?)
                `).run(datasetId, grade, subject, text, content);

                                count++;
                            } catch (e) {
                                // Skip invalid JSON
                            }
                        }
                    }
                    console.log(`    Inserted ${count} items from ${zipFile}`);
                } catch (e) {
                    console.error(`Error reading ${zipFile}:`, e.message);
                }
            }
        }
    }

    console.log('Ingestion complete.');
}

ingest();
