const express = require('express');
const router = express.Router();
const db = require('../db');
const puppeteer = require('puppeteer');

function renderLatexHTML(text) {
  if (!text) return '';
  // Escape HTML first, then handle LaTeX
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  return html;
}

function buildExamHTML(exam, problems, options = {}) {
  const { showAnswers = false, showSolutions = false } = options;
  const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  let mcProblems = problems.filter(p => p.type === 'multiple_choice');
  let descProblems = problems.filter(p => p.type === 'descriptive');

  let problemsHTML = '';
  let num = 1;

  // Multiple choice
  mcProblems.forEach(p => {
    let choices = p.choices;
    if (typeof choices === 'string') {
      try { choices = JSON.parse(choices); } catch { choices = []; }
    }
    const choiceLabels = ['①', '②', '③', '④', '⑤'];
    const choicesHTML = (choices || []).map((c, i) => {
      const isAnswer = showAnswers && String(p.answer) === String(i + 1);
      return `<span class="choice${isAnswer ? ' correct' : ''}">${choiceLabels[i]} ${c}</span>`;
    }).join(' ');

    problemsHTML += `
      <div class="problem">
        <div class="problem-header">
          <span class="problem-num">${num}.</span>
          <span class="problem-points">[${p.assigned_points || p.points || 5}점]</span>
        </div>
        <div class="problem-question">${renderLatexHTML(p.question)}</div>
        <div class="choices">${choicesHTML}</div>
        ${showSolutions && p.solution ? `<div class="solution"><strong>풀이:</strong> ${renderLatexHTML(p.solution)}</div>` : ''}
      </div>
    `;
    num++;
  });

  // Descriptive
  descProblems.forEach(p => {
    problemsHTML += `
      <div class="problem">
        <div class="problem-header">
          <span class="problem-num">${num}.</span>
          <span class="problem-points">[${p.assigned_points || p.points || 5}점]</span>
        </div>
        <div class="problem-question">${renderLatexHTML(p.question)}</div>
        ${!showAnswers ? '<div class="answer-space"></div>' : ''}
        ${showAnswers ? `<div class="solution"><strong>정답:</strong> ${renderLatexHTML(p.answer)}</div>` : ''}
        ${showSolutions && p.solution ? `<div class="solution"><strong>풀이:</strong> ${renderLatexHTML(p.solution)}</div>` : ''}
      </div>
    `;
    num++;
  });

  // Answer grid for answer sheet
  let answerGridHTML = '';
  if (showAnswers && !showSolutions) {
    let gridRows = '';
    let gridNum = 1;
    mcProblems.forEach(p => {
      gridRows += `<tr><td class="num">${gridNum}</td><td>${p.answer}</td></tr>`;
      gridNum++;
    });
    descProblems.forEach(p => {
      gridRows += `<tr><td class="num">${gridNum}</td><td>${p.answer}</td></tr>`;
      gridNum++;
    });
    answerGridHTML = `
      <div class="answer-grid">
        <h3>정답표</h3>
        <table><thead><tr><th>번호</th><th>정답</th></tr></thead><tbody>${gridRows}</tbody></table>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<style>
  @page { size: A4; margin: 15mm 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; }
  .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 20pt; margin-bottom: 4px; }
  .header .meta { font-size: 9pt; color: #666; }
  .student-info { display: flex; justify-content: space-between; border: 1px solid #ccc; padding: 8px 16px; margin-bottom: 16px; font-size: 10pt; }
  .student-info span { margin-right: 24px; }
  .problem { margin-bottom: 16px; page-break-inside: avoid; }
  .problem-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  .problem-num { font-weight: bold; font-size: 12pt; }
  .problem-points { font-size: 9pt; color: #888; }
  .problem-question { margin-left: 20px; margin-bottom: 8px; }
  .choices { margin-left: 20px; display: flex; flex-wrap: wrap; gap: 8px 24px; }
  .choice { font-size: 10.5pt; }
  .choice.correct { color: #dc2626; font-weight: bold; }
  .answer-space { margin-left: 20px; border: 1px dashed #ccc; min-height: 80px; margin-top: 8px; }
  .solution { margin-left: 20px; margin-top: 8px; padding: 8px 12px; background: #f8f8f8; border-left: 3px solid #4f46e5; font-size: 10pt; }
  .answer-grid { margin-top: 24px; }
  .answer-grid h3 { margin-bottom: 8px; }
  .answer-grid table { border-collapse: collapse; width: 50%; }
  .answer-grid th, .answer-grid td { border: 1px solid #ccc; padding: 4px 12px; text-align: center; font-size: 10pt; }
  .answer-grid .num { font-weight: bold; }
  .footer { text-align: center; font-size: 8pt; color: #999; margin-top: 24px; border-top: 1px solid #ddd; padding-top: 8px; }
  ${showSolutions ? '.title-tag::after { content: " [해설지]"; color: #4f46e5; }' : ''}
  ${showAnswers && !showSolutions ? '.title-tag::after { content: " [답안지]"; color: #dc2626; }' : ''}
</style>
</head>
<body>
  <div class="header">
    <h1 class="title-tag">${exam.title}</h1>
    <div class="meta">${exam.exam_type === 'monthly' ? '월말고사' : exam.exam_type === 'daily' ? '일일 테스트' : exam.exam_type} | ${date} | 총 ${exam.total_points}점</div>
  </div>
  <div class="student-info">
    <span><strong>이름:</strong> ${exam.student_name || '________________'}</span>
    <span><strong>학년:</strong> ${exam.student_grade || '________'}</span>
    <span><strong>점수:</strong> ______ / ${exam.total_points}</span>
  </div>
  ${problemsHTML}
  ${answerGridHTML}
  <div class="footer">Exam Builder | Auto-generated</div>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false}
        ],
        throwOnError: false
      });
    });
  </script>
</body>
</html>`;
}

// GET /api/pdf/:examId - generate PDF for exam
router.get('/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const { type = 'exam' } = req.query; // exam | answer | solution

    const exam = db.prepare(`
      SELECT e.*, s.name as student_name, s.grade as student_grade
      FROM exams e LEFT JOIN students s ON e.student_id = s.id
      WHERE e.id = ?
    `).get(examId);

    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const problems = db.prepare(`
      SELECT p.*, ep.sort_order, ep.points as assigned_points
      FROM exam_problems ep JOIN problems p ON ep.problem_id = p.id
      WHERE ep.exam_id = ? ORDER BY ep.sort_order
    `).all(examId);

    problems.forEach(p => {
      if (p.choices && typeof p.choices === 'string') {
        try { p.choices = JSON.parse(p.choices); } catch {}
      }
    });

    const options = {
      showAnswers: type === 'answer' || type === 'solution',
      showSolutions: type === 'solution'
    };

    const html = buildExamHTML(exam, problems, options);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500)); // wait for KaTeX rendering

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' }
    });

    await browser.close();

    const filename = `${exam.title.replace(/[^가-힣a-zA-Z0-9]/g, '_')}_${type}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
