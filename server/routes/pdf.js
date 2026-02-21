const express = require('express');
const router = express.Router();
const db = require('../db');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * LaTeX -> Typst math syntax converter (Advanced)
 */
function latexToTypst(text) {
  if (!text) return '';
  let result = text;

  // Handle LaTeX math delimiters
  result = result.replace(/\\\[([\s\S]+?)\\\]/g, '$$$1$$');
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, '$$$1$$');

  let parts = result.split('$');
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Text mode
      parts[i] = parts[i].replace(/_/g, '\\_').replace(/\*/g, '\\*').replace(/#/g, '\\#');
    } else {
      // Math mode
      let m = parts[i].trim();
      // Strip aligned environments (keep content, remove markers)
      m = m.replace(/\\begin\{aligned\}/g, '').replace(/\\end\{aligned\}/g, '');
      m = m.replace(/\\begin\{array\}\{[^}]*\}/g, '').replace(/\\end\{array\}/g, '');
      m = m.replace(/&\s*=\s*/g, '= ').replace(/&/g, '');
      m = m.replace(/\\\\\s*/g, ' ');  // line breaks in aligned → space
      // \text{한국어} → "한국어" (Typst math mode uses double quotes for text)
      m = m.replace(/\\text\s*\{([^}]*)\}/g, '"$1"');
      m = m.replace(/\\mbox\s*\{([^}]*)\}/g, '"$1"');
      // Strip \left \right (Typst handles stretchy delimiters automatically)
      m = m.replace(/\\left\s*\(/g, '(').replace(/\\right\s*\)/g, ')');
      m = m.replace(/\\left\s*\[/g, '[').replace(/\\right\s*\]/g, ']');
      m = m.replace(/\\left\s*\\\{/g, '(').replace(/\\right\s*\\\}/g, ')');
      m = m.replace(/\\left\s*\|/g, '|').replace(/\\right\s*\|/g, '|');
      m = m.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');
      // Commands conversion (order matters: ^ and _ before \sqrt/\frac to handle nested cases)
      m = m.replace(/\^\{([\s\S]*?)\}/g, '^($1)')
        .replace(/_\{([\s\S]*?)\}/g, '_($1)')
        .replace(/\\frac\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/g, ' frac($1, $2) ')
        .replace(/\\sqrt\s*\{([\s\S]*?)\}/g, ' sqrt($1) ')
        .replace(/\\dot\s*\{(\d+)\}/g, ' dot($1) ')
        .replace(/\\overline\s*\{([\s\S]*?)\}/g, ' overline($1) ')
        .replace(/\\vec\s*\{([\s\S]*?)\}/g, ' arrow($1) ')
        .replace(/\\times/g, ' times ')
        .replace(/\\cdot/g, ' dot.op ')
        .replace(/\\div/g, ' / ')
        .replace(/\\neq/g, ' != ')
        .replace(/\\leq/g, ' <= ')
        .replace(/\\geq/g, ' >= ')
        .replace(/\\pm/g, ' plus.minus ')
        .replace(/\\approx/g, ' approx ')
        .replace(/\\infty/g, ' infinity ')
        .replace(/\\degree/g, ' degree ')
        .replace(/\\pi/g, ' pi ')
        .replace(/\\alpha/g, ' alpha ')
        .replace(/\\beta/g, ' beta ')
        .replace(/\\gamma/g, ' gamma ')
        .replace(/\\theta/g, ' theta ')
        .replace(/\\sigma/g, ' sigma ')
        .replace(/\\mu/g, ' mu ')
        .replace(/\\triangle/g, ' triangle ')
        .replace(/\\angle/g, ' angle ')
        .replace(/\\square/g, ' square ')
        .replace(/\\in/g, ' in ')
        .replace(/\\notin/g, ' in.not ')
        .replace(/\\subset/g, ' subset ')
        .replace(/\\cup/g, ' union ')
        .replace(/\\cap/g, ' sect ')
        .replace(/\\emptyset/g, ' nothing ')
        .replace(/\\ldots/g, ' ... ')
        .replace(/\\cdots/g, ' dots.h ')
        .replace(/\\therefore/g, ' therefore ')
        .replace(/\\because/g, ' because ')
        .replace(/\\/g, '')
        .replace(/\{/g, '(').replace(/\}/g, ')');
      parts[i] = m;
    }
  }

  // Typst inline math: '$content$' (no spaces inside) vs display: '$ content $' (spaces inside)
  // inline=true: trim math parts so '$formula$' → Typst inline mode
  // inline=false (default): keep spaces so '$ formula $' → Typst display mode
  if (arguments[1] === true) {
    return parts.map((p, i) => i % 2 === 1 ? p.trim() : p).join('$').replace(/\n/g, ' ');
  }
  return parts.join(' $ ').replace(/\n/g, ' ');
}

/**
 * Builds the high-fidelity Typst source code to match the original HTML design.
 */
function buildExamTypst(exam, problems, options = {}) {
  const { showAnswers = false, showSolutions = false } = options;
  const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '. ');
  const examTitle = (exam.title || '수학 시험지').replace(/"/g, '\\"').replace(/_/g, '\\_').replace(/\*/g, '\\*').replace(/#/g, '\\#');

  const typeLabel = exam.exam_type === 'monthly' ? '월말고사' :
    exam.exam_type === 'daily' ? '일일 테스트' :
      exam.exam_type === 'midterm' ? '중간고사' :
        exam.exam_type === 'final' ? '기말고사' :
          exam.exam_type === 'practice' ? '연습 문제지' : exam.exam_type;

  const mcProblems = problems.filter(p => p.type === 'multiple_choice');
  const descProblems = problems.filter(p => p.type === 'descriptive');

  let sheetTagText = '';
  let sheetTagColor = 'black';
  if (showSolutions) { sheetTagText = '해설지'; sheetTagColor = 'rgb("#4f46e5")'; }
  else if (showAnswers) { sheetTagText = '답안지'; sheetTagColor = 'rgb("#c62828")'; }

  let source = `
#set document(title: "${examTitle}")
#set page(
  paper: "a4",
  margin: (x: 11mm, y: 12mm),
  header: align(right, text(7.5pt, gray)[${examTitle} | ${date}]),
  footer: align(center, text(8pt, gray)[- #counter(page).display() -]),
)
#set text(font: "Noto Sans CJK KR", size: 9.5pt, lang: "ko")
#set par(justify: true, leading: 0.55em)

// --- Custom Components ---
#let prob_num(n) = {
  box(
    circle(radius: 8pt, fill: black, stroke: none,
      align(center + horizon, text(fill: white, weight: 900, size: 10pt)[#n])
    )
  )
}

// --- Header Section ---
#block(width: 100%, stroke: (top: 4pt + black, bottom: 2pt + black), inset: (y: 8pt))[
  #stack(dir: ltr, spacing: 1fr,
    [
      #if "${sheetTagText}" != "" {
        box(fill: ${sheetTagColor}, radius: 3pt, inset: 4pt, 
          text(white, weight: 900, size: 10pt)[${sheetTagText}]
        )
      }
    ],
    [
      #align(center)[
        #text(9pt, gray, tracking: 3pt)[${typeLabel}] \
        #v(-4pt)
        #text(21pt, weight: 900, tracking: 4pt)[${examTitle}] \
        #v(-4pt)
        #text(9pt, gray)[${date}]
      ]
    ],
    [
      #align(right + horizon)[
        #text(9pt)[총 *${problems.length}*문제] \
        #text(11pt)[*${exam.total_points || 0}*점]
      ]
    ]
  )
]

// --- Student Info Table ---
#v(1pt)
#table(
  columns: (35pt, 1fr, 25pt, 1fr, 32pt, 1fr, 35pt, 1fr, 45pt, 100pt),
  stroke: (x, y) => if x == 9 { 0.5pt + black } else { none }, // Only right vertical border for score
  inset: 5pt,
  align: center + horizon,
  fill: (x, y) => if calc.even(x) and x < 8 { gray.lighten(90%) },
  [학년], [#text(weight: "bold")[${exam.student_grade || ""}]], 
  [반], [], 
  [번호], [], 
  [이름], [#text(weight: "bold")[${exam.student_name || ""}]],
  [점수], [ \\/ ${exam.total_points || 0}]
)
#v(-11pt)
#line(length: 100%, stroke: 2pt + black)

// --- Notice Bar ---
#v(2pt)
#block(width: 100%, fill: gray.lighten(95%), stroke: (bottom: 1pt + gray.lighten(50%)), inset: 4pt)[
  #text(8pt, gray)[
    *객관식* ${mcProblems.length}문제 #if ${descProblems.length} > 0 [ | *서술형* ${descProblems.length}문제 ] | *총 ${exam.total_points}점* 
    #h(1fr)
    ※ 객관식 문제는 가장 적절한 것을 하나만 고르시오.
  ]
]

#v(8pt)

// --- Problems Rendering ---
#grid(
  columns: (1fr, 1fr),
  gutter: 22pt,
`;

  problems.forEach((p, i) => {
    const points = p.assigned_points || p.points || 5;
    const isDesc = p.type === 'descriptive';

    let imageCmd = '';
    if (p.image_path) {
      const absImagePath = path.resolve(__dirname, '../../dataset', p.image_path).replace(/\\/g, '/');
      if (fs.existsSync(absImagePath)) {
        imageCmd = `#v(4pt)\n#align(center)[#image("${absImagePath}", width: 85%)]\n#v(4pt)`;
      }
    }

    let choicesText = '';
    if (!isDesc && p.choices) {
      let choices = p.choices;
      if (typeof choices === 'string') {
        try { choices = JSON.parse(choices); } catch { choices = []; }
      }
      const labels = ["①", "②", "③", "④", "⑤"];
      choicesText = `\n#v(4pt)\n#line(length: 100%, stroke: (dash: "dashed", paint: gray.lighten(50%)))\n#v(2pt)\n` +
        choices.map((c, idx) => {
          let cleaned = String(c).trim();
          labels.forEach(l => { if (cleaned.startsWith(l)) cleaned = cleaned.substring(1).trim(); });
          // Use inline=true + #h() to force Typst inline math mode (not display/block)
          return `${labels[idx]}#h(0.3em)${latexToTypst(cleaned, true)}`;
        }).join('#h(0.8em)');
    }

    let answerArea = '';
    if (isDesc && !showAnswers && !showSolutions) {
      answerArea = `\n#v(6pt)\n#block(width: 100%, height: 100pt, stroke: 0.5pt + gray, inset: 5pt)[
        #text(7.5pt, gray)[풀이 및 정답]
        #v(1fr)
        #repeat[#line(length: 100%, stroke: (dash: "dashed", paint: gray.lighten(70%))) #v(18pt)]
      ]`;
    }

    let resultText = '';
    if (showAnswers) {
      resultText += `\n#v(4pt)\n#block(width: 100%, fill: rgb("#fffbee"), stroke: (left: 3pt + orange), inset: 5pt)[*정답:* ${latexToTypst(String(p.answer))}]`;
    }
    if (showSolutions && p.solution) {
      resultText += `\n#v(4pt)\n#block(width: 100%, fill: rgb("#f5f3ff"), stroke: (left: 3pt + purple), inset: 5pt)[*풀이:* ${latexToTypst(p.solution)}]`;
    }

    source += `
  [
    #stack(dir: ttb, spacing: 4pt,
      [#prob_num("${i + 1}") #h(4pt) #text(size: 8pt, gray)[[${points}점]] ${isDesc ? '#box(fill: red, radius: 2pt, inset: 2pt, text(white, size: 7pt, weight: "bold")[서술형])' : ''}],
      [#text(size: 9.5pt)[${latexToTypst(p.question)}]],
      ${imageCmd ? `[${imageCmd}]` : '[]'},
      [${choicesText}],
      [${answerArea}],
      [${resultText}]
    )
    #v(10pt)
  ],`;
  });

  source += `\n)`;

  // Descriptive Section Header (only if we have descriptive problems and want a separate block)
  // For simplicity, we keep them in the grid for now as per original 2-column request.

  if (showAnswers && !showSolutions) {
    source += `
#v(1fr)
#align(center)[
  #block(stroke: 1.5pt + black, inset: 12pt, width: 85%)[
    #text(12pt, weight: 900, tracking: 3pt)[◆ 정 답 표 ◆]
    #v(8pt)
    #table(
      columns: (35pt, 1fr, 35pt, 1fr, 35pt, 1fr),
      align: center + horizon,
      stroke: 0.5pt + black,
      fill: (x, y) => if y == 0 { gray.lighten(90%) },
      [*번호*], [*정답*], [*번호*], [*정답*], [*번호*], [*정답*],
      ${problems.map((p, i) => `[${i + 1}], [${latexToTypst(String(p.answer))}]`).join(', ')}
    )
  ]
]`;
  }

  return source;
}

async function generatePDFBuffer(typstSource) {
  const tmpDir = os.tmpdir();
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  const typFile = path.join(tmpDir, `exam_${id}.typ`);
  const pdfFile = path.join(tmpDir, `exam_${id}.pdf`);
  fs.writeFileSync(typFile, typstSource, 'utf8');
  try {
    execSync(`typst compile --root / "${typFile}" "${pdfFile}"`, { stdio: 'pipe' });
    return fs.readFileSync(pdfFile);
  } catch (err) {
    console.error('Typst compile error:', err.stderr?.toString() || err.message);
    throw new Error('Typst compilation failed: ' + (err.stderr?.toString() || err.message));
  } finally {
    try { fs.unlinkSync(typFile); fs.unlinkSync(pdfFile); } catch (_) { }
  }
}

// Routes remain the same...
router.get('/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const { type = 'exam' } = req.query;
    const exam = db.prepare('SELECT e.*, s.name as student_name, s.grade as student_grade FROM exams e LEFT JOIN students s ON e.student_id = s.id WHERE e.id = ?').get(examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const problems = db.prepare('SELECT p.*, ep.points as assigned_points FROM exam_problems ep JOIN problems p ON ep.problem_id = p.id WHERE ep.exam_id = ? ORDER BY ep.sort_order').all(examId);
    const typstSource = buildExamTypst(exam, problems, { showAnswers: type === 'answer' || type === 'solution', showSolutions: type === 'solution' });
    const buffer = await generatePDFBuffer(typstSource);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(exam.title)}_${type}.pdf"`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Other routes... (omitted for brevity but updated with buildExamTypst)
router.post('/problems/bundle', async (req, res) => {
  try {
    const { problemIds, title = '문제은행_추출' } = req.body;
    if (!problemIds || !Array.isArray(problemIds) || problemIds.length === 0) return res.status(400).json({ error: 'problemIds are required' });
    const problems = db.prepare(`SELECT * FROM problems WHERE id IN (${problemIds.map(() => '?').join(',')})`).all(problemIds);
    const virtualExam = { title, exam_type: 'practice', total_points: problems.reduce((sum, p) => sum + (p.points || 5), 0) };
    const zip = new AdmZip();
    for (const type of ['exam', 'answer', 'solution']) {
      const source = buildExamTypst(virtualExam, problems, { showAnswers: type !== 'exam', showSolutions: type === 'solution' });
      const buffer = await generatePDFBuffer(source);
      zip.addFile(`${title.replace(/[^가-힣a-zA-Z0-9]/g, '_')}_${type}.pdf`, buffer);
    }
    res.setHeader('Content-Type', 'application/zip');
    res.send(zip.toBuffer());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:examId/bundle', async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = db.prepare('SELECT e.*, s.name as student_name, s.grade as student_grade FROM exams e LEFT JOIN students s ON e.student_id = s.id WHERE e.id = ?').get(examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const problems = db.prepare('SELECT p.*, ep.points as assigned_points FROM exam_problems ep JOIN problems p ON ep.problem_id = p.id WHERE ep.exam_id = ? ORDER BY ep.sort_order').all(examId);
    const zip = new AdmZip();
    for (const type of ['exam', 'answer', 'solution']) {
      const source = buildExamTypst(exam, problems, { showAnswers: type !== 'exam', showSolutions: type === 'solution' });
      const buffer = await generatePDFBuffer(source);
      zip.addFile(`${exam.title.replace(/[^가-힣a-zA-Z0-9]/g, '_')}_${type}.pdf`, buffer);
    }
    res.send(zip.toBuffer());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
