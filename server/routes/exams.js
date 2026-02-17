const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/exams - list all exams
router.get('/', (req, res) => {
  try {
    const exams = db.prepare(`
      SELECT e.*, s.name as student_name, s.grade as student_grade,
        (SELECT COUNT(*) FROM exam_problems WHERE exam_id = e.id) as problem_count
      FROM exams e
      LEFT JOIN students s ON e.student_id = s.id
      ORDER BY e.created_at DESC
    `).all();
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exams/:id - get exam with problems
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const exam = db.prepare(`
      SELECT e.*, s.name as student_name, s.grade as student_grade
      FROM exams e
      LEFT JOIN students s ON e.student_id = s.id
      WHERE e.id = ?
    `).get(id);

    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const problems = db.prepare(`
      SELECT p.*, ep.sort_order, ep.points as assigned_points
      FROM exam_problems ep
      JOIN problems p ON ep.problem_id = p.id
      WHERE ep.exam_id = ?
      ORDER BY ep.sort_order
    `).all(id);

    // parse choices for each problem
    problems.forEach(p => {
      if (p.choices && typeof p.choices === 'string') {
        try { p.choices = JSON.parse(p.choices); } catch {}
      }
    });

    exam.problems = problems;
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for difficulty mapping
const difficultyMap = {
  'basic': 1,
  'intermediate': 2,
  'advanced': 3,
};

// POST /api/exams/auto - Create an exam automatically based on student profile
router.post('/auto', (req, res) => {
  try {
    const { student_id, count = 20, title, exam_type } = req.body;

    if (!student_id || !title || !exam_type) {
      return res.status(400).json({ error: 'student_id, title, and exam_type are required' });
    }

    // 1. Get student's subject and difficulty_level
    const student = db.prepare('SELECT subject, difficulty_level FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 2. Difficulty level mapping
    const mappedDifficulty = difficultyMap[student.difficulty_level] || 1; // Default to basic if not found

    // 3. Select problems
    const problems = db.prepare(`
      SELECT id, points FROM problems
      WHERE subject = ? AND difficulty <= ? AND status = 'approved'
      ORDER BY RANDOM() LIMIT ?
    `).all(student.subject, mappedDifficulty, count);

    if (problems.length === 0) {
      return res.status(404).json({ message: 'No approved problems found for this student profile.' });
    }

    // 4. Create exam and add problems in a transaction
    const transaction = db.transaction(() => {
      const totalPoints = problems.reduce((sum, p) => sum + (p.points || 5), 0);

      const insertExam = db.prepare(
        'INSERT INTO exams (title, exam_type, student_id, total_points) VALUES (?, ?, ?, ?)'
      );
      const examResult = insertExam.run(title, exam_type, student_id, totalPoints);
      const examId = examResult.lastInsertRowid;

      const insertProblem = db.prepare(
        'INSERT INTO exam_problems (exam_id, problem_id, sort_order, points) VALUES (?, ?, ?, ?)'
      );
      problems.forEach((p, i) => {
        insertProblem.run(examId, p.id, i + 1, p.points || 5);
      });

      return { examId, problem_count: problems.length };
    });

    const { examId, problem_count } = transaction();
    res.status(201).json({ id: examId, message: 'Auto exam created', problem_count });
  } catch (err) {
    console.error('Error creating auto exam:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exams/batch - Create exams for a group of students
router.post('/batch', (req, res) => {
  try {
    const { group_name, count = 20, exam_type, title_prefix } = req.body;

    if (!group_name || !exam_type || !title_prefix) {
      return res.status(400).json({ error: 'group_name, exam_type, and title_prefix are required' });
    }

    // 1. Get students in the group
    const students = db.prepare('SELECT id, name, subject, difficulty_level FROM students WHERE group_name = ?').all(group_name);
    if (students.length === 0) {
      return res.status(404).json({ message: 'No students found in this group.' });
    }

    const createdExams = [];
    const transaction = db.transaction(() => {
      students.forEach(student => {
        // Prepare data for auto exam creation
        const student_id = student.id;
        const title = `${title_prefix} - ${student.name}`;
        
        // 2. Difficulty level mapping
        const mappedDifficulty = difficultyMap[student.difficulty_level] || 1;

        // 3. Select problems
        const problems = db.prepare(`
          SELECT id, points FROM problems
          WHERE subject = ? AND difficulty <= ? AND status = 'approved'
          ORDER BY RANDOM() LIMIT ?
        `).all(student.subject, mappedDifficulty, count);

        if (problems.length === 0) {
          createdExams.push({ student_id: student.id, student_name: student.name, message: `No problems found for student ${student.name}.` });
          return; // Skip this student if no problems
        }

        const totalPoints = problems.reduce((sum, p) => sum + (p.points || 5), 0);

        const insertExam = db.prepare(
          'INSERT INTO exams (title, exam_type, student_id, total_points) VALUES (?, ?, ?, ?)'
        );
        const examResult = insertExam.run(title, exam_type, student_id, totalPoints);
        const examId = examResult.lastInsertRowid;

        const insertProblem = db.prepare(
          'INSERT INTO exam_problems (exam_id, problem_id, sort_order, points) VALUES (?, ?, ?, ?)'
        );
        problems.forEach((p, i) => {
          insertProblem.run(examId, p.id, i + 1, p.points || 5);
        });

        createdExams.push({ student_id: student.id, student_name: student.name, exam_id: examId, problem_count: problems.length });
      });
    });

    transaction(); // Execute the transaction
    res.status(201).json({ message: 'Batch exams created', exams: createdExams });
  } catch (err) {
    console.error('Error creating batch exams:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exams - create exam with problems
router.post('/', (req, res) => {
  try {
    const { title, exam_type, student_id, problems } = req.body;

    if (!title || !exam_type) {
      return res.status(400).json({ error: 'title and exam_type are required' });
    }
    if (!problems || !Array.isArray(problems) || problems.length === 0) {
      return res.status(400).json({ error: 'At least one problem is required' });
    }

    const totalPoints = problems.reduce((sum, p) => sum + (p.points || 5), 0);

    const insertExam = db.prepare(
      'INSERT INTO exams (title, exam_type, student_id, total_points) VALUES (?, ?, ?, ?)'
    );
    const insertProblem = db.prepare(
      'INSERT INTO exam_problems (exam_id, problem_id, sort_order, points) VALUES (?, ?, ?, ?)'
    );

    const transaction = db.transaction(() => {
      const examResult = insertExam.run(title, exam_type, student_id || null, totalPoints);
      const examId = examResult.lastInsertRowid;

      problems.forEach((p, i) => {
        insertProblem.run(examId, p.problem_id, i + 1, p.points || 5);
      });

      return examId;
    });

    const examId = transaction();
    res.status(201).json({ id: examId, message: 'Exam created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM exam_problems WHERE exam_id = ?').run(id);
    const result = db.prepare('DELETE FROM exams WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Exam not found' });
    res.json({ message: 'Exam deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
