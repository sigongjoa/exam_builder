const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../aihub_datasets.db');
const db = new Database(DB_PATH);

// Get all datasets
router.get('/datasets', (req, res) => {
    const datasets = db.prepare('SELECT * FROM datasets').all();
    res.json(datasets);
});

// Get items for a specific dataset
router.get('/datasets/:id/items', (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const items = db.prepare(`
    SELECT id, grade, subject, content_text 
    FROM items 
    WHERE dataset_id = ? 
    LIMIT ? OFFSET ?
  `).all(id, limit, offset);

    const total = db.prepare('SELECT count(*) as count FROM items WHERE dataset_id = ?').get(id).count;

    res.json({
        items,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
});

// Get stats for a specific dataset
router.get('/datasets/:id/stats', (req, res) => {
    const { id } = req.params;

    const gradeDistribution = db.prepare(`
    SELECT grade, count(*) as count 
    FROM items 
    WHERE dataset_id = ? 
    GROUP BY grade
  `).all(id);

    const subjectDistribution = db.prepare(`
    SELECT subject, count(*) as count 
    FROM items 
    WHERE dataset_id = ? 
    GROUP BY subject
  `).all(id);

    res.json({
        gradeDistribution,
        subjectDistribution
    });
});

module.exports = router;
