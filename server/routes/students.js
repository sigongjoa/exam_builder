const express = require('express');
const router = express.Router();
const db = require('../db');

// Example: Get all students
router.get('/', (req, res) => {
  try {
    const students = db.prepare('SELECT * FROM students').all();
    const getConditions = db.prepare('SELECT id, condition_type, condition_value, description FROM student_conditions WHERE student_id = ?');

    const studentsWithConditions = students.map(student => {
      student.conditions = getConditions.all(student.id);
      return student;
    });

    res.json(studentsWithConditions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const getConditions = db.prepare('SELECT id, condition_type, condition_value, description FROM student_conditions WHERE student_id = ?');
    student.conditions = getConditions.all(id);

    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/', (req, res) => {
  try {
    const { name, grade, subject, current_chapter, difficulty_level, group_name, notes } = req.body;

    // Validate required fields
    if (!name || !grade || !subject) {
      return res.status(400).json({ error: 'Name, grade, and subject are required' });
    }

    const insert = db.prepare(
      'INSERT INTO students (name, grade, subject, current_chapter, difficulty_level, group_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const info = insert.run(name, grade, subject, current_chapter, difficulty_level, group_name, notes);

    res.status(201).json({ id: info.lastInsertRowid, message: 'Student created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, subject, current_chapter, difficulty_level, group_name, notes } = req.body;

    // Check if student exists
    const studentExists = db.prepare('SELECT 1 FROM students WHERE id = ?').get(id);
    if (!studentExists) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Validate required fields if provided
    if ((name && !name.trim()) || (grade && !grade.trim()) || (subject && !subject.trim())) {
      return res.status(400).json({ error: 'Name, grade, and subject cannot be empty if provided' });
    }

    const update = db.prepare(
      `UPDATE students SET
        name = COALESCE(?, name),
        grade = COALESCE(?, grade),
        subject = COALESCE(?, subject),
        current_chapter = COALESCE(?, current_chapter),
        difficulty_level = COALESCE(?, difficulty_level),
        group_name = COALESCE(?, group_name),
        notes = COALESCE(?, notes)
      WHERE id = ?`
    );
    const info = update.run(name, grade, subject, current_chapter, difficulty_level, group_name, notes, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Student not found or no changes made' });
    }

    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const del = db.prepare('DELETE FROM students WHERE id = ?');
    const info = del.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/:id/conditions', (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Check if student exists
    const studentExists = db.prepare('SELECT 1 FROM students WHERE id = ?').get(id);
    if (!studentExists) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const conditions = db.prepare('SELECT id, condition_type, condition_value, description FROM student_conditions WHERE student_id = ?').all(id);
    res.json(conditions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/:id/conditions', (req, res) => {
  try {
    const { id } = req.params;
    const { condition_type, condition_value, description } = req.body;

    // Check if student exists
    const studentExists = db.prepare('SELECT 1 FROM students WHERE id = ?').get(id);
    if (!studentExists) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Validate required fields
    if (!condition_type || !condition_value) {
      return res.status(400).json({ error: 'Condition type and value are required' });
    }

    const insert = db.prepare(
      'INSERT INTO student_conditions (student_id, condition_type, condition_value, description) VALUES (?, ?, ?, ?)'
    );
    const info = insert.run(id, condition_type, condition_value, description);

    res.status(201).json({ id: info.lastInsertRowid, message: 'Condition added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/:id/conditions/:condId', (req, res) => {
  try {
    const { id, condId } = req.params;

    const del = db.prepare('DELETE FROM student_conditions WHERE student_id = ? AND id = ?');
    const info = del.run(id, condId);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Condition not found for this student' });
    }

    res.json({ message: 'Condition deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;