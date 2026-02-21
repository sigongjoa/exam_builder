const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');

// 4. GET /:id/concepts (= /api/problems/:id/concepts)
// 해당 문제에 태깅된 개념 목록 반환
// problem_concepts 테이블과 concepts 테이블 JOIN
// { id, name, description, grade_level, chapter_code, ai_suggested, confirmed } 반환
router.get('/:id/concepts', (req, res) => {
  try {
    const { id } = req.params;
    const concepts = db.prepare(`
      SELECT c.*, pc.ai_suggested, pc.confirmed
      FROM concepts c
      JOIN problem_concepts pc ON c.id = pc.concept_id
      WHERE pc.problem_id = ?
    `).all(id);
    res.json(concepts);
  } catch (err) {
    console.error('Error fetching problem concepts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. POST /:id/concepts/analyze (= /api/problems/:id/concepts/analyze)
// 해당 문제의 solution 텍스트를 Ollama에 보내서 사용된 수학 개념/성질 추출
router.post('/:id/concepts/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    const problem = db.prepare('SELECT solution FROM problems WHERE id = ?').get(id);

    if (!problem || !problem.solution) {
      return res.json({ suggestions: [], message: 'No solution text available for analysis' });
    }

    const prompt = `다음 수학 풀이에서 사용된 수학적 개념, 성질, 공식을 JSON 배열로 추출해줘.
각 항목은 { name: '개념명', confidence: 0.0~1.0 } 형식이어야 해.
개념명은 '√x² = |x| 변환 규칙', '피타고라스 정리', '인수분해 합차공식' 같이 구체적으로 써줘.
반드시 JSON 배열만 반환하고 다른 설명은 쓰지 마.

풀이: ${problem.solution}`;

    try {
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'qwen2.5:14b',
        prompt: prompt,
        stream: false
      });

      let responseText = response.data.response;
      // Remove markdown code blocks if present
      responseText = responseText.replace(/```json|```/g, '').trim();

      try {
        const suggestions = JSON.parse(responseText);
        res.json({ suggestions });
      } catch (parseError) {
        console.error('Failed to parse Ollama response:', responseText);
        res.json({ suggestions: [], error: '파싱 실패' });
      }
    } catch (ollamaError) {
      console.error('Ollama API error:', ollamaError.message);
      res.status(503).json({ error: 'Ollama service unavailable' });
    }
  } catch (err) {
    console.error('Error analyzing problem concepts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. POST /:id/concepts (= /api/problems/:id/concepts)
// body: { concepts: [{id, name, source, grade_level, isNew}] }
// 트랜잭션으로 처리
router.post('/:id/concepts', (req, res) => {
  const { id: problemId } = req.params;
  const { concepts } = req.body;

  if (!Array.isArray(concepts)) {
    return res.status(400).json({ error: 'Concepts must be an array' });
  }

  const deleteOld = db.prepare('DELETE FROM problem_concepts WHERE problem_id = ?');
  const insertConcept = db.prepare(`
    INSERT OR IGNORE INTO concepts (name, grade_level)
    VALUES (?, ?)
  `);
  const getConceptId = db.prepare('SELECT id FROM concepts WHERE name = ?');
  const insertProblemConcept = db.prepare(`
    INSERT INTO problem_concepts (problem_id, concept_id, confirmed)
    VALUES (?, ?, 1)
  `);
  const updateUseCount = db.prepare(`
    UPDATE concepts SET use_count = (
      SELECT COUNT(*) FROM problem_concepts WHERE concept_id = concepts.id
    )
    WHERE id = ?
  `);

  try {
    const transaction = db.transaction((problemId, conceptList) => {
      // a. 기존 problem_concepts에서 해당 problem_id 삭제
      deleteOld.run(problemId);

      for (const item of conceptList) {
        let conceptId = item.id;

        // b. isNew 또는 id가 없으면: concepts 테이블에 INSERT OR IGNORE
        if (!conceptId || item.isNew) {
          insertConcept.run(item.name, item.grade_level || null);
          const row = getConceptId.get(item.name);
          conceptId = row.id;
        }

        // problem_concepts에 INSERT
        insertProblemConcept.run(problemId, conceptId);

        // concepts의 use_count 업데이트
        updateUseCount.run(conceptId);
      }
      
      return conceptList.length;
    });

    const savedCount = transaction(problemId, concepts);
    res.json({ success: true, saved: savedCount });
  } catch (err) {
    console.error('Error saving problem concepts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
