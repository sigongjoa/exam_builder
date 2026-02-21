const Database = require('better-sqlite3');
const { execSync } = require('child_process');
const fs = require('fs');

function latexToTypst(text) {
  if (!text) return '';
  // 1. Convert display math to inline math $ ... $
  let result = text.replace(/\\\[([\s\S]+?)\\\]/g, ' $ $1 $ ').replace(/\$\$([\s\S]+?)\$\$/g, ' $ $1 $ ');
  
  // 2. Math mode conversion
  result = result.replace(/\$([\s\S]+?)\$/g, (match, latex) => {
    let m = latex.trim();
    // Common LaTeX -> Typst math translations
    m = m
      .replace(/\\sqrt\{([\s\S]+?)\}/g, ' sqrt($1) ')
      .replace(/\\frac\{([\s\S]+?)\}\{([\s\S]+?)\}/g, ' frac($1, $2) ')
      .replace(/\\times/g, ' times ')
      .replace(/\\cdot/g, ' dot ')
      .replace(/\\div/g, ' div ')
      .replace(/\\dot\{(\d+)\}/g, ' dot($1) ') // 순환소수 도트
      .replace(/\\neq/g, ' != ')
      .replace(/\\leq/g, ' <= ')
      .replace(/\\geq/g, ' >= ')
      .replace(/\\pm/g, ' plus.minus ')
      .replace(/\\approx/g, ' approx ')
      .replace(/\\/g, ''); // 나머지 백슬래시 제거
    return `$ ${m} $`;
  });

  return result.replace(/#/g, '\\#').replace(/\n/g, ' \n ');
}

// ... 나머지 buildExamTypst 코드는 동일하되 choices 중복 방지 로직 추가 ...
function buildExamTypst(exam, problems) {
  const date = '2026. 02. 21.';
  const examTitle = exam.title || '수학 시험지';
  let source = `
#set document(title: "${examTitle}")
#set page(paper: "a4", margin: (x: 1.2cm, y: 1.5cm), footer: align(center, text(8pt, gray)[- #counter(page).display() -]))
#set text(font: "Noto Sans CJK KR", size: 10pt, lang: "ko")
#set par(justify: true, leading: 0.65em)
#let primary = rgb("#1a237e")
#align(center)[ #text(22pt, weight: "bold", fill: primary)[${examTitle}] ]
#v(10pt)
#grid(columns: (1fr, 1fr), column-gap: 25pt, row-gap: 20pt,
`;
  problems.forEach((p, i) => {
    let choicesText = '';
    if (p.choices) {
      const labels = ["①", "②", "③", "④", "⑤"];
      try {
        const cArr = JSON.parse(p.choices);
        choicesText = `\n#v(0.5em)\n` + cArr.map((c, idx) => {
          let cleaned = String(c).trim();
          // 이미 번호가 붙어 있는 경우(예: ① ...) 제거
          labels.forEach(l => { if (cleaned.startsWith(l)) cleaned = cleaned.substring(1).trim(); });
          return `${labels[idx]} ${latexToTypst(cleaned)}`;
        }).join('   ');
      } catch (e) { choicesText = ''; }
    }
    source += `  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[${i + 1}.] ], [${latexToTypst(p.question)}], [${choicesText}]) ],`;
  });
  source += `\n)`;
  return source;
}

const db = new Database('server/exam_builder.db');
const examId = 11;
const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
const problems = db.prepare('SELECT p.* FROM exam_problems ep JOIN problems p ON ep.problem_id = p.id WHERE ep.exam_id = ? ORDER BY ep.sort_order').all(examId);

const typstSource = buildExamTypst(exam, problems);
fs.writeFileSync('debug_artifacts/exam11.typ', typstSource);
execSync('typst compile debug_artifacts/exam11.typ debug_artifacts/exam11_typst.pdf');
db.close();
