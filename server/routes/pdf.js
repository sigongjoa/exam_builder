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
  const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '. ');

  const mcProblems = problems.filter(p => p.type === 'multiple_choice');
  const descProblems = problems.filter(p => p.type === 'descriptive');

  // Build all problems in order (mc first, then descriptive)
  const allProblems = [...mcProblems, ...descProblems];
  let num = 1;

  const circledNums = ['①', '②', '③', '④', '⑤'];
  const choiceLabels = ['①', '②', '③', '④', '⑤'];

  function buildProblemHTML(p) {
    const currentNum = num++;
    const points = p.assigned_points || p.points || 5;
    const isDesc = p.type === 'descriptive';

    let choicesHTML = '';
    if (!isDesc) {
      let choices = p.choices;
      if (typeof choices === 'string') {
        try { choices = JSON.parse(choices); } catch { choices = []; }
      }
      choicesHTML = '<div class="choices">' + (choices || []).map((c, i) => {
        const isAnswer = showAnswers && String(p.answer) === String(i + 1);
        const hasLabel = circledNums.some(n => String(c).trimStart().startsWith(n));
        const label = hasLabel ? '' : choiceLabels[i] + ' ';
        return `<span class="choice${isAnswer ? ' correct' : ''}">${label}${c}</span>`;
      }).join('') + '</div>';
    }

    let answerArea = '';
    if (isDesc && !showAnswers && !showSolutions) {
      const lines = Array(6).fill('<div class="line"></div>').join('');
      answerArea = `<div class="descriptive-area"><span class="da-label">풀이</span><div class="lines">${lines}</div></div>`;
    }
    if (isDesc && showAnswers) {
      answerArea = `<div class="solution"><strong>정답:</strong> ${renderLatexHTML(p.answer)}</div>`;
    }

    let solutionHTML = '';
    if (showSolutions && p.solution) {
      solutionHTML = `<div class="solution"><strong>풀이:</strong> ${renderLatexHTML(p.solution)}</div>`;
    }

    return `<div class="problem">
      <div class="problem-header">
        <span class="problem-number">${currentNum}.</span>
        ${isDesc ? '<span class="descriptive-mark">서술형</span>' : ''}
        <span class="points">[${points}점]</span>
      </div>
      <div class="problem-text">${renderLatexHTML(p.question)}</div>
      ${choicesHTML}
      ${answerArea}
      ${solutionHTML}
    </div>`;
  }

  // Build problem HTMLs
  const problemHTMLs = allProblems.map(p => buildProblemHTML(p));

  // Split into two columns (roughly half)
  const mid = Math.ceil(problemHTMLs.length / 2);
  const leftHTML = problemHTMLs.slice(0, mid).join('\n');
  const rightHTML = problemHTMLs.slice(mid).join('\n');

  // Exam type labels
  const typeLabel = exam.exam_type === 'monthly' ? '월말고사' : exam.exam_type === 'daily' ? '일일 테스트' : exam.exam_type === 'midterm' ? '중간고사' : exam.exam_type === 'final' ? '기말고사' : exam.exam_type;

  // Title tag for answer/solution sheets
  let titleSuffix = '';
  if (showSolutions) titleSuffix = ' <span style="color:#4f46e5;">[해설지]</span>';
  else if (showAnswers) titleSuffix = ' <span style="color:#c62828;">[답안지]</span>';

  // Answer grid for answer sheet
  let answerGridHTML = '';
  if (showAnswers && !showSolutions) {
    let gridRows = '';
    let gridNum = 1;
    allProblems.forEach(p => {
      gridRows += `<tr><td class="ag-num">${gridNum}</td><td>${p.answer}</td></tr>`;
      gridNum++;
    });
    answerGridHTML = `
      <div style="padding:12px 16px;">
        <div class="section-divider">정답표</div>
        <table class="answer-table"><thead><tr><th>번호</th><th>정답</th><th>번호</th><th>정답</th></tr></thead><tbody>`;
    // Two-column answer grid
    const half = Math.ceil(allProblems.length / 2);
    for (let i = 0; i < half; i++) {
      const left = allProblems[i];
      const right = allProblems[i + half];
      answerGridHTML += `<tr><td class="ag-num">${i + 1}</td><td>${left ? left.answer : ''}</td>`;
      answerGridHTML += `<td class="ag-num">${right ? i + half + 1 : ''}</td><td>${right ? right.answer : ''}</td></tr>`;
    }
    answerGridHTML += '</tbody></table></div>';
  }

  // Notice text
  const noticeText = `<b>총 ${allProblems.length}문제</b> (객관식 ${mcProblems.length}문제${descProblems.length > 0 ? ' + 서술형 ' + descProblems.length + '문제' : ''})`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<style>
  @page { size: A4; margin: 12mm 10mm 15mm 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 10pt; line-height: 1.5; color: #222; background: white; }

  /* Header */
  .exam-header { border-bottom: 3px solid #1a237e; padding: 12px 16px 10px; }
  .exam-header .top-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
  .exam-title { font-size: 20pt; font-weight: 900; color: #1a237e; letter-spacing: 2px; }
  .exam-subtitle { font-size: 11pt; color: #555; margin-top: 2px; }
  .exam-meta { text-align: right; font-size: 9pt; color: #666; }
  .exam-meta .date { font-size: 10pt; font-weight: 700; color: #333; }

  /* Student info */
  .student-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #f5f5f5; border-bottom: 1px solid #ddd; }
  .student-row .fields { display: flex; gap: 24px; font-size: 10pt; }
  .student-row .field-label { color: #888; font-size: 9pt; }
  .student-row .field-value { font-weight: 700; border-bottom: 1px solid #333; min-width: 70px; display: inline-block; text-align: center; padding-bottom: 1px; }
  .student-row .score-box { border: 2px solid #1a237e; border-radius: 4px; padding: 4px 14px; font-size: 10pt; font-weight: 700; color: #1a237e; }

  /* Notice */
  .notice { padding: 6px 16px; font-size: 8pt; color: #888; border-bottom: 1px solid #eee; display: flex; gap: 20px; }
  .notice b { color: #555; }

  /* 2-column layout */
  .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .column { min-width: 0; padding: 8px 12px; }
  .column:first-child { border-right: 1px solid #ddd; }

  /* Problems */
  .problem { margin-bottom: 14px; }
  .problem-header { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
  .problem-number { font-weight: 900; font-size: 11pt; color: #1a237e; min-width: 20px; }
  .points { font-size: 8pt; color: #999; }
  .problem-text { font-size: 10pt; line-height: 1.65; margin-bottom: 6px; padding-left: 2px; }

  /* Choices */
  .choices { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; padding-left: 4px; font-size: 9.5pt; }
  .choices.single-col { grid-template-columns: 1fr; }
  .choice { padding: 1px 0; }
  .choice.correct { color: #c62828; font-weight: bold; }

  /* Descriptive */
  .descriptive-mark { display: inline-block; background: #c62828; color: white; font-size: 7.5pt; padding: 1px 5px; border-radius: 3px; font-weight: 700; }
  .descriptive-area { border: 1px solid #ccc; min-height: 80px; margin-top: 6px; border-radius: 4px; padding: 6px; position: relative; }
  .descriptive-area .da-label { font-size: 8pt; color: #999; position: absolute; top: 4px; left: 8px; }
  .descriptive-area .lines { margin-top: 14px; }
  .descriptive-area .line { border-bottom: 1px dotted #ddd; height: 22px; }

  /* Solution (for answer/solution sheets) */
  .solution { margin-top: 6px; padding: 6px 10px; background: #f8f8ff; border-left: 3px solid #4f46e5; font-size: 9pt; line-height: 1.6; }

  /* Section divider */
  .section-divider { border-top: 2px solid #1a237e; margin: 10px 0 8px; padding-top: 6px; font-size: 10pt; font-weight: 700; color: #1a237e; }

  /* Answer table */
  .answer-table { border-collapse: collapse; width: 60%; margin: 8px auto; }
  .answer-table th, .answer-table td { border: 1px solid #999; padding: 4px 10px; font-size: 9pt; text-align: center; }
  .answer-table th { background: #f0f0f0; font-weight: 700; }
  .answer-table .ag-num { font-weight: 700; color: #1a237e; }

  /* Footer */
  .page-footer { text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding: 6px 16px 0; margin-top: 12px; }

  .katex { font-size: 1em; }
  .problem-text .katex { font-size: 1.05em; }
</style>
</head>
<body>

  <div class="exam-header">
    <div class="top-row">
      <div>
        <div class="exam-title">${exam.title}${titleSuffix}</div>
        <div class="exam-subtitle">${typeLabel}</div>
      </div>
      <div class="exam-meta">
        <div class="date">${date}</div>
        <div>총 ${exam.total_points}점</div>
      </div>
    </div>
  </div>

  <div class="student-row">
    <div class="fields">
      <span><span class="field-label">학년 </span><span class="field-value">${exam.student_grade || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span></span>
      <span><span class="field-label">이름 </span><span class="field-value">${exam.student_name || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span></span>
    </div>
    <div class="score-box">
      <span class="field-label">점수</span>
      &nbsp;&nbsp;&nbsp;&nbsp;/ ${exam.total_points}
    </div>
  </div>

  <div class="notice">
    ${noticeText}
    <span>총 ${exam.total_points}점 배점</span>
  </div>

  <div class="two-column">
    <div class="column">${leftHTML}</div>
    <div class="column">${rightHTML}</div>
  </div>

  ${answerGridHTML}

  <div class="page-footer">
    Exam Builder | ${typeLabel}
  </div>

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

    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' }
    });

    await browser.close();

    const pdfBuffer = Buffer.from(pdfData);
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
