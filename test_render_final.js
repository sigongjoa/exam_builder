const Database = require('better-sqlite3');
const { execSync } = require('child_process');
const fs = require('fs');

function latexToTypst(text) {
  if (!text) return '';
  let result = text.replace(/\\\[([\s\S]+?)\\\]/g, ' $ $1 $ ').replace(/\$\$([\s\S]+?)\$\$/g, ' $ $1 $ ');
  result = result.replace(/\$([\s\S]+?)\$/g, (match, latex) => {
    let m = latex.trim();
    m = m.replace(/\\frac\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/g, ' frac($1, $2) ');
    m = m.replace(/\\sqrt\s*\{([\s\S]*?)\}/g, ' sqrt($1) ');
    m = m.replace(/\\dot\s*\{(\d+)\}/g, ' dot($1) ');
    m = m.replace(/\\times/g, ' times ').replace(/\\cdot/g, ' dot ').replace(/\\div/g, ' div ').replace(/\\neq/g, ' != ')
         .replace(/\\leq/g, ' <= ').replace(/\\geq/g, ' >= ').replace(/\\pm/g, ' plus.minus ');
    m = m.replace(/\^\{([\s\S]*?)\}/g, ' ^($1) ').replace(/_\{([\s\S]*?)\}/g, ' _($1) ');
    m = m.replace(/\\/g, '').replace(/\{/g, '(').replace(/\}/g, ')');
    return `$ ${m} $`;
  });
  return result.replace(/#/g, '\\#').replace(/\n/g, ' \n ');
}

function buildExamTypst(exam, problems) {
  let source = `
#set document(title: "Typst Final Test")
#set page(paper: "a4", margin: (x: 1.2cm, y: 1.5cm))
#set text(font: "Noto Sans CJK KR", size: 10pt, lang: "ko")
#set par(justify: true, leading: 0.65em)
#let primary = rgb("#1a237e")
#align(center)[ #text(22pt, weight: "bold", fill: primary)[${exam.title}] ]
#v(10pt)
#grid(columns: (1fr, 1fr), gutter: 25pt,
`;
  problems.forEach((p, i) => {
    let choicesText = '';
    if (p.choices) {
      const labels = ["①", "②", "③", "④", "⑤"];
      try {
        const cArr = JSON.parse(p.choices);
        choicesText = `\n#v(0.5em)\n` + cArr.map((c, idx) => {
          let cleaned = String(c).trim();
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
fs.writeFileSync('debug_artifacts/exam11_final.typ', typstSource);
execSync('typst compile debug_artifacts/exam11_final.typ debug_artifacts/exam11_final.pdf');
db.close();
