const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper function for building WHERE clauses
const buildWhereClause = (params) => {
    const conditions = [];
    const values = [];

    if (params.subject) {
        conditions.push('subject = ?');
        values.push(params.subject);
    }
    if (params.chapter_code) {
        conditions.push('chapter_code = ?');
        values.push(params.chapter_code);
    }
    // Multi chapter_codes filter: ?chapter_codes=1-1-3,1-1-4,2-1-1
    if (params.chapter_codes) {
        const codes = params.chapter_codes.split(',').map(c => c.trim()).filter(Boolean);
        if (codes.length > 0) {
            conditions.push(`chapter_code IN (${codes.map(() => '?').join(',')})`);
            values.push(...codes);
        }
    }
    if (params.status) {
        conditions.push('status = ?');
        values.push(params.status);
    }
    if (params.difficulty) {
        conditions.push('difficulty = ?');
        values.push(params.difficulty);
    }
    if (params.type) {
        conditions.push('type = ?');
        values.push(params.type);
    }
    // Keyword search in question text
    if (params.search) {
        conditions.push('question LIKE ?');
        values.push(`%${params.search}%`);
    }

    return {
        where: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
        values: values
    };
};

// GET /api/problems - Get all problems with optional filters
router.get('/', (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { where, values } = buildWhereClause(req.query);

        // Get total count
        const totalProblemsQuery = db.prepare(`SELECT COUNT(*) as total FROM problems ${where}`);
        const total = totalProblemsQuery.get(values).total;

        // Get problems for the current page
        const problemsQuery = db.prepare(`SELECT * FROM problems ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`);
        const problems = problemsQuery.all([...values, parseInt(limit), offset]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            problems,
            total,
            page: parseInt(page),
            totalPages
        });
    } catch (err) {
        console.error('Error fetching problems:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/problems/:id - Get a single problem by ID
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(id);

        if (problem) {
            // Parse choices if it's a multiple_choice problem
            if (problem.type === 'multiple_choice' && problem.choices) {
                try {
                    problem.choices = JSON.parse(problem.choices);
                } catch (e) {
                    console.warn(`Could not parse choices for problem ${id}:`, e);
                    // Keep choices as string if parsing fails
                }
            }
            // Parse solution_steps if it's a descriptive problem and solution is JSON
            if (problem.type === 'descriptive' && problem.solution && problem.solution.startsWith('[')) {
                try {
                    problem.solution_steps = JSON.parse(problem.solution);
                } catch (e) {
                    console.warn(`Could not parse solution_steps for problem ${id}:`, e);
                    // Keep solution as string if parsing fails
                }
            }
            res.json(problem);
        } else {
            res.status(404).json({ message: 'Problem not found' });
        }
    } catch (err) {
        console.error('Error fetching problem by ID:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/problems - Create a new problem
router.post('/', (req, res) => {
    const {
        type, subject, chapter_code, pattern_type, pattern_name,
        difficulty, question, choices, answer, solution, status, source, ai_model, points
    } = req.body;

    // Basic validation
    if (!type || !subject || !chapter_code || !question || !answer) {
        return res.status(400).json({ message: 'Missing required fields: type, subject, chapter_code, question, answer' });
    }
    if (!['multiple_choice', 'descriptive'].includes(type)) {
        return res.status(400).json({ message: 'Invalid problem type. Must be "multiple_choice" or "descriptive".' });
    }
    try {
        // choices can be array or JSON string
        let choicesStr = null;
        if (type === 'multiple_choice' && choices) {
            choicesStr = typeof choices === 'string' ? choices : JSON.stringify(choices);
        }

        const stmt = db.prepare(`
            INSERT INTO problems (
                type, subject, chapter_code, pattern_type, pattern_name,
                difficulty, question, choices, answer, solution, status, source, ai_model, points
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            type, subject, chapter_code, pattern_type, pattern_name,
            difficulty || 2, question, choicesStr,
            answer, solution, status || 'draft', source || 'manual', ai_model || null, points || 5
        );
        res.status(201).json({ message: 'Problem created successfully', id: result.lastInsertRowid });
    } catch (err) {
        console.error('Error creating problem:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/problems/:id - Update an existing problem
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const {
        type, subject, chapter_code, pattern_type, pattern_name,
        difficulty, question, choices, answer, solution, status, source, ai_model, points
    } = req.body;

    // Basic validation (only for fields that should exist)
    if (!type || !subject || !chapter_code || !question || !answer) {
        return res.status(400).json({ message: 'Missing required fields: type, subject, chapter_code, question, answer' });
    }
    if (!['multiple_choice', 'descriptive'].includes(type)) {
        return res.status(400).json({ message: 'Invalid problem type. Must be "multiple_choice" or "descriptive".' });
    }
    try {
        let choicesStr = null;
        if (type === 'multiple_choice' && choices) {
            choicesStr = typeof choices === 'string' ? choices : JSON.stringify(choices);
        }

        const stmt = db.prepare(`
            UPDATE problems SET
                type = ?, subject = ?, chapter_code = ?, pattern_type = ?, pattern_name = ?,
                difficulty = ?, question = ?, choices = ?, answer = ?, solution = ?,
                status = ?, source = ?, ai_model = ?, points = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        const result = stmt.run(
            type, subject, chapter_code, pattern_type, pattern_name,
            difficulty || 2, question, choicesStr,
            answer, solution, status || 'draft', source || 'manual', ai_model || null, points || 5,
            id
        );

        if (result.changes > 0) {
            res.json({ message: 'Problem updated successfully' });
        } else {
            res.status(404).json({ message: 'Problem not found or no changes made' });
        }
    } catch (err) {
        console.error('Error updating problem:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/problems/:id - Delete a problem
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const stmt = db.prepare('DELETE FROM problems WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes > 0) {
            res.json({ message: 'Problem deleted successfully' });
        } else {
            res.status(404).json({ message: 'Problem not found' });
        }
    } catch (err) {
        console.error('Error deleting problem:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/problems/:id/status - Update problem status
router.put('/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'approved', 'reviewed', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be "draft", "approved", "reviewed", or "rejected".' });
    }

    try {
        const stmt = db.prepare('UPDATE problems SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const result = stmt.run(status, id);

        if (result.changes > 0) {
            res.json({ message: `Problem status updated to ${status}` });
        } else {
            res.status(404).json({ message: 'Problem not found or status already set' });
        }
    } catch (err) {
        console.error('Error updating problem status:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
