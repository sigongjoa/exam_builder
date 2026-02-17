const express = require('express');
const router = express.Router();
const db = require('../db');

// Example: Get all curriculum entries
router.get('/', (req, res) => {
  try {
    const { subject } = req.query;
    let curriculum;

    if (subject) {
      curriculum = db.prepare('SELECT * FROM curriculum WHERE subject = ? ORDER BY sort_order').all(subject);
    } else {
      curriculum = db.prepare('SELECT * FROM curriculum ORDER BY sort_order').all();
    }
    res.json(curriculum);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/subjects', (req, res) => {
  try {
    const subjects = db.prepare('SELECT DISTINCT subject FROM curriculum').all();
    res.json(subjects.map(row => row.subject));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/tree', (req, res) => {
  try {
    const allCurriculum = db.prepare('SELECT * FROM curriculum ORDER BY subject, level1, level2, level3, sort_order').all();
    const tree = {};

    allCurriculum.forEach(item => {
      if (!tree[item.subject]) {
        tree[item.subject] = {};
      }
      if (!tree[item.subject][item.level1]) {
        tree[item.subject][item.level1] = {};
      }
      if (!tree[item.subject][item.level1][item.level2]) {
        tree[item.subject][item.level1][item.level2] = {};
      }
      if (!tree[item.subject][item.level1][item.level2][item.level3]) {
        tree[item.subject][item.level1][item.level2][item.level3] = [];
      }
      tree[item.subject][item.level1][item.level2][item.level3].push(item);
    });

    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/tree/:subject', (req, res) => {
  try {
    const { subject } = req.params;
    const allCurriculum = db.prepare('SELECT * FROM curriculum WHERE subject = ? ORDER BY level1, level2, level3, sort_order').all(subject);

    if (allCurriculum.length === 0) {
      return res.status(404).json({ error: 'Subject not found or no curriculum data for this subject' });
    }

    const tree = {}; // Will only contain the requested subject
    tree[subject] = {}; // Initialize the subject

    allCurriculum.forEach(item => {
      // Assuming item.subject is already filtered by req.params.subject
      if (!tree[item.subject][item.level1]) {
        tree[item.subject][item.level1] = {};
      }
      if (!tree[item.subject][item.level1][item.level2]) {
        tree[item.subject][item.level1][item.level2] = {};
      }
      if (!tree[item.subject][item.level1][item.level2][item.level3]) {
        tree[item.subject][item.level1][item.level2][item.level3] = [];
      }
      tree[item.subject][item.level1][item.level2][item.level3].push(item);
    });

    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;



