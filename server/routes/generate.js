const express = require('express');
const router = express.Router();
const db = require('../db');

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'qwen2.5:14b'; // Specify the Ollama model

// Prompt templates
const PROMPT_TEMPLATES = {
    multiple_choice: (subject, chapter_code, chapter_name, pattern_name, difficulty) => `
너는 ${subject} ${chapter_name} (${chapter_code}) 단원의 전문 교사이다.
학생들을 위한 고품질의 ${difficulty === 1 ? '쉬운' : difficulty === 2 ? '보통 난이도' : '어려운'} ${pattern_name ? pattern_name + ' 유형의 ' : ''}객관식 수학 문제 1개를 생성해 줘.
문제는 반드시 5지선다 형태로 출제해야 하며, 각 보기는 JSON 배열로 제공되어야 해.
정답은 1에서 5 사이의 숫자로 명시해야 하며, 자세한 풀이 과정을 포함해야 해.
모든 내용은 JSON 형식으로 응답해 줘.

예시 JSON 형식:
{
  "question": "문제 내용 (수식은 KaTeX 형식으로)",
  "choices": ["보기 1 (수식 포함)", "보기 2 (수식 포함)", "보기 3 (수식 포함)", "보기 4 (수식 포함)", "보기 5 (수식 포함)"],
  "answer": "1",
  "solution": "자세한 풀이 내용 (수식은 KaTeX 형식으로)"
}
`,
    descriptive: (subject, chapter_code, chapter_name, pattern_name, difficulty) => `
너는 ${subject} ${chapter_name} (${chapter_code}) 단원의 전문 교사이다.
학생들을 위한 고품질의 ${difficulty === 1 ? '쉬운' : difficulty === 2 ? '보통 난이도' : '어려운'} ${pattern_name ? pattern_name + ' 유형의 ' : ''}서술형 수학 문제 1개를 생성해 줘.
문제에 대한 정확한 정답과 단계별 풀이 과정을 반드시 포함해야 해.
모든 내용은 JSON 형식으로 응답해 줘.

예시 JSON 형식:
{
  "question": "문제 내용 (수식은 KaTeX 형식으로)",
  "answer": "정답 (수식 포함)",
  "solution_steps": ["풀이 1단계 (수식 포함)", "풀이 2단계 (수식 포함)", "풀이 3단계 (수식 포함)"],
  "solution": "전체 풀이 내용 (solution_steps가 있다면 solution은 종합 요약)"
}
`
};

// Function to call Ollama API
async function callOllama(prompt) {
    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
            }),
            timeout: 120000 // 2 minutes timeout
        });

        if (!response.ok) {
            console.error(`Ollama API error: ${response.status} - ${response.statusText}`);
            let errorText = await response.text();
            try {
              const errorJson = JSON.parse(errorText);
              errorText = errorJson.error || errorText;
            } catch (e) {
              // Not a JSON error, use plain text
            }
            throw new Error(`Ollama API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        // Ollama's /api/generate returns { response: '...' }
        return data.response;
    } catch (error) {
        console.error('Failed to connect to Ollama or receive valid response:', error);
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
          throw new Error('Ollama server is not running or accessible at ' + OLLAMA_API_URL);
        }
        throw new Error('Ollama generation failed: ' + error.message);
    }
}

// POST /api/generate endpoint
router.post('/', async (req, res) => {
    const { subject, chapter_code, chapter_name, pattern_name, difficulty, type, count = 1 } = req.body;

    // Input validation
    if (!subject || !chapter_code || !chapter_name || !difficulty || !type) {
        return res.status(400).json({ message: 'Missing required parameters: subject, chapter_code, chapter_name, difficulty, type' });
    }
    if (!['multiple_choice', 'descriptive'].includes(type)) {
        return res.status(400).json({ message: 'Invalid problem type. Must be "multiple_choice" or "descriptive".' });
    }
    if (count < 1 || count > 5) { // Limiting count for now
        return res.status(400).json({ message: 'Count must be between 1 and 5.' });
    }
    if (difficulty < 1 || difficulty > 3) {
        return res.status(400).json({ message: 'Difficulty must be between 1 and 3.' });
    }

    const generatedProblemIds = [];
    let problemCounter = 0;

    for (let i = 0; i < count; i++) {
        const prompt = PROMPT_TEMPLATES[type](subject, chapter_code, chapter_name, pattern_name, difficulty);
        let ollamaResponseText;
        let parsedProblem;
        let retries = 0;
        const MAX_RETRIES = 1; // 1 retry after initial failure

        while (retries <= MAX_RETRIES) {
            try {
                ollamaResponseText = await callOllama(prompt);
                parsedProblem = JSON.parse(ollamaResponseText);
                break; // Successfully parsed, exit retry loop
            } catch (parseError) {
                console.warn(`Failed to parse Ollama response (attempt ${retries + 1}):`, parseError);
                if (retries < MAX_RETRIES) {
                    console.log('Retrying Ollama generation...');
                    retries++;
                } else {
                    console.error('Max retries reached for JSON parsing. Returning raw response for debugging.');
                    return res.status(500).json({
                        message: 'Failed to generate and parse problem after multiple attempts.',
                        error: parseError.message,
                        rawOllamaResponse: ollamaResponseText
                    });
                }
            }
        }

        // Validate parsed problem structure
        if (!parsedProblem || !parsedProblem.question || !parsedProblem.answer) {
            console.error('Ollama returned an invalid problem structure:', parsedProblem);
            return res.status(500).json({
                message: 'Ollama generated an invalid problem structure.',
                rawOllamaResponse: ollamaResponseText
            });
        }

        try {
            const stmt = db.prepare(`
                INSERT INTO problems (
                    type, subject, chapter_code, pattern_name, difficulty,
                    question, choices, answer, solution, status, source, ai_model
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                type,
                subject,
                chapter_code,
                pattern_name,
                difficulty,
                parsedProblem.question,
                type === 'multiple_choice' ? JSON.stringify(parsedProblem.choices) : null,
                parsedProblem.answer,
                parsedProblem.solution || JSON.stringify(parsedProblem.solution_steps), // Store solution_steps for descriptive
                'draft',
                'ai',
                OLLAMA_MODEL
            );
            generatedProblemIds.push(result.lastInsertRowid);
            problemCounter++;
        } catch (dbError) {
            console.error('Failed to save problem to database:', dbError);
            return res.status(500).json({ message: 'Failed to save generated problem to database.', error: dbError.message });
        }
    }

    res.status(201).json({ message: `${problemCounter} problems generated and saved successfully.`, problemIds: generatedProblemIds });
});

router.post('/variant', async (req, res) => {
  const { problem_id } = req.body;

  if (!problem_id) {
    return res.status(400).json({ message: 'Missing required parameter: problem_id' });
  }

  try {
    const originalProblem = db.prepare('SELECT * FROM problems WHERE id = ?').get(problem_id);

    if (!originalProblem) {
      return res.status(404).json({ message: 'Original problem not found.' });
    }

    const { question, choices, answer, type, subject, chapter_code, difficulty } = originalProblem;

    const variantPrompt = `다음 수학 문제의 숫자만 변경하여 같은 유형의 변형 문제를 만들어줘. 문제 구조와 풀이 방법은 동일하게 유지하고 숫자만 바꿔라. 원본 문제: ${question} 원본 보기: ${choices ? JSON.stringify(choices) : ''} 원본 정답: ${answer}. 반드시 JSON으로 응답: {question, choices, answer, solution}`;

    let ollamaResponseText;
    let parsedVariantProblem;
    let retries = 0;
    const MAX_RETRIES = 1;

    while (retries <= MAX_RETRIES) {
        try {
            ollamaResponseText = await callOllama(variantPrompt);
            parsedVariantProblem = JSON.parse(ollamaResponseText);
            break;
        } catch (parseError) {
            console.warn(`Failed to parse Ollama variant response (attempt ${retries + 1}):`, parseError);
            if (retries < MAX_RETRIES) {
                console.log('Retrying Ollama variant generation...');
                retries++;
            } else {
                console.error('Max retries reached for JSON parsing of variant problem. Returning raw response for debugging.');
                return res.status(500).json({
                    message: 'Failed to generate and parse variant problem after multiple attempts.',
                    error: parseError.message,
                    rawOllamaResponse: ollamaResponseText
                });
            }
        }
    }

    if (!parsedVariantProblem || !parsedVariantProblem.question || !parsedVariantProblem.answer) {
        console.error('Ollama returned an invalid variant problem structure:', parsedVariantProblem);
        return res.status(500).json({
            message: 'Ollama generated an invalid variant problem structure.',
            rawOllamaResponse: ollamaResponseText
        });
    }

    const stmt = db.prepare(`
        INSERT INTO problems (
            type, subject, chapter_code, pattern_type, pattern_name, difficulty,
            question, choices, answer, solution, status, source, ai_model
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        type,
        subject,
        chapter_code,
        originalProblem.pattern_type, // Keep original pattern_type
        originalProblem.pattern_name, // Keep original pattern_name
        difficulty,
        parsedVariantProblem.question,
        type === 'multiple_choice' ? JSON.stringify(parsedVariantProblem.choices) : null,
        parsedVariantProblem.answer,
        parsedVariantProblem.solution || null, // Solution can be directly from variant, or null if not provided
        'draft',
        'ai_variant', // Source for variant problems
        OLLAMA_MODEL
    );

    res.status(201).json({ id: result.lastInsertRowid, message: 'Variant created' });

  } catch (error) {
    console.error('Error generating problem variant:', error);
    res.status(500).json({ message: 'Failed to generate problem variant.', error: error.message });
  }
});

module.exports = router;
