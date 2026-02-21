const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. GET / (= /api/concepts)
// query param: ?search=키워드 (name LIKE %키워드%)
// 전체 concepts 목록 반환 (id, name, description, grade_level, chapter_code, use_count)
// ORDER BY use_count DESC, name ASC
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM concepts';
    const params = [];

    if (search) {
      query += ' WHERE name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY use_count DESC, name ASC';
    const concepts = db.prepare(query).all(...params);
    res.json(concepts);
  } catch (err) {
    console.error('Error fetching concepts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. POST / (= /api/concepts)
// body: { name, description, grade_level, chapter_code }
// name이 없으면 400 에러
// INSERT OR IGNORE INTO concepts, 이미 있으면 기존 항목 반환
// 생성된/기존 concept 반환
router.post('/', (req, res) => {
  try {
    const { name, description, grade_level, chapter_code } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Concept name is required' });
    }

    const insert = db.prepare(`
      INSERT OR IGNORE INTO concepts (name, description, grade_level, chapter_code)
      VALUES (?, ?, ?, ?)
    `);
    insert.run(name, description || null, grade_level || null, chapter_code || null);

    const concept = db.prepare('SELECT * FROM concepts WHERE name = ?').get(name);
    res.json(concept);
  } catch (err) {
    console.error('Error creating concept:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. GET /progress (= /api/concepts/progress)
// 태깅 진행률 반환
// tagged: SELECT COUNT(DISTINCT problem_id) FROM problem_concepts
// total: SELECT COUNT(*) FROM problems
// { tagged, total } 반환
router.get('/progress', (req, res) => {
  try {
    const tagged = db.prepare('SELECT COUNT(DISTINCT problem_id) as count FROM problem_concepts').get().count;
    const total = db.prepare('SELECT COUNT(*) as count FROM problems').get().count;
    res.json({ tagged, total });
  } catch (err) {
    console.error('Error fetching tagging progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. GET /graph (= /api/concepts/graph)
// 개념 그래프 데이터 반환: { nodes, links }
router.get('/graph', (req, res) => {
  try {
    const nodes = db.prepare('SELECT id, name, grade_level, use_count FROM concepts').all();
    
    const links = db.prepare(`
      SELECT pc1.concept_id as source, pc2.concept_id as target, COUNT(*) as value
      FROM problem_concepts pc1
      JOIN problem_concepts pc2 ON pc1.problem_id = pc2.problem_id AND pc1.concept_id < pc2.concept_id
      GROUP BY pc1.concept_id, pc2.concept_id
    `).all();

    res.json({
      nodes: nodes || [],
      links: links || []
    });
  } catch (err) {
    console.error('Error fetching concept graph:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
