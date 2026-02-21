const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'exam_builder.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const createTables = () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS curriculum (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      chapter_code TEXT NOT NULL,
      level1 TEXT NOT NULL,
      level2 TEXT NOT NULL,
      level3 TEXT NOT NULL,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      subject TEXT NOT NULL,
      current_chapter TEXT,
      difficulty_level TEXT DEFAULT 'basic',
      group_name TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      condition_type TEXT NOT NULL,
      condition_value TEXT,
      description TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      chapter_code TEXT NOT NULL,
      pattern_type TEXT,
      pattern_name TEXT,
      difficulty INTEGER DEFAULT 2,
      question TEXT NOT NULL,
      choices TEXT,
      answer TEXT NOT NULL,
      solution TEXT,
      status TEXT DEFAULT 'draft',
      source TEXT DEFAULT 'ai',
      ai_model TEXT,
      points INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS problem_tags (
      problem_id INTEGER,
      tag TEXT NOT NULL,
      PRIMARY KEY (problem_id, tag),
      FOREIGN KEY (problem_id) REFERENCES problems(id)
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      student_id INTEGER,
      total_points INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS exam_problems (
      exam_id INTEGER,
      problem_id INTEGER,
      sort_order INTEGER,
      points INTEGER,
      PRIMARY KEY (exam_id, problem_id),
      FOREIGN KEY (exam_id) REFERENCES exams(id),
      FOREIGN KEY (problem_id) REFERENCES problems(id)
    );

    CREATE TABLE IF NOT EXISTS concepts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      grade_level TEXT,
      chapter_code TEXT,
      use_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS problem_concepts (
      problem_id INTEGER NOT NULL,
      concept_id INTEGER NOT NULL,
      ai_suggested INTEGER DEFAULT 0,
      confirmed INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (problem_id, concept_id),
      FOREIGN KEY (problem_id) REFERENCES problems(id),
      FOREIGN KEY (concept_id) REFERENCES concepts(id)
    );
  `;

  db.exec(schema);
  console.log('Database tables created or already exist.');
};

// Call createTables when db.js is imported
createTables();

module.exports = db;
