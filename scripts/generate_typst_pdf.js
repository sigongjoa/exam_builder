const Database = require('better-sqlite3');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function processContent(text) {
    if (!text) return '';
    return text
        .replace(/\\times/g, " times ")
        .replace(/\\cdot/g, " cdot ")
        .replace(/\\div/g, " div ")
        .replace(/\\pm/g, " plus.minus ")
        .replace(/\\neq/g, " != ")
        .replace(/\\leq/g, " <= ")
        .replace(/\\geq/g, " >= ")
        .replace(/#/g, '\\#');
}

function generateChoicesTypst(choicesJson) {
    try {
        const choices = JSON.parse(choicesJson);
        if (!Array.isArray(choices)) return '';
        const labels = ["①", "②", "③", "④", "⑤"];
        return `\n#v(0.5em)\n` + choices.map((c, idx) => `${labels[idx]} ${processContent(c)}`).join('   ');
    } catch (e) {
        return '';
    }
}

function generateTypstSource(examTitle, problems) {
    let source = `
#set document(title: "${examTitle}")
#set page(
  paper: "a4",
  margin: (x: 1.5cm, y: 2cm),
  numbering: "1",
)
#set text(font: "Noto Sans CJK KR", size: 10pt)
#set heading(numbering: "1.")

#let primary = rgb("#1a237e")

#align(center)[
  #text(size: 20pt, weight: "bold", fill: primary)[${examTitle}]
  #v(1em)
]

#grid(
  columns: (1fr, 1fr),
  column-gap: 20pt,
  row-gap: 15pt,
`;

    problems.forEach((p, i) => {
        const points = p.points || 5;
        // Typst compile command will be run from the root, so use relative path from root
        const relativePath = p.image_path ? `dataset/${p.image_path}`.replace(/\\/g, '/') : null;
        
        source += `
  [
    *${i + 1}.* [${points}점]
    ${processContent(p.question)}
    
    ${relativePath ? `#v(0.5em)\n#image("${relativePath}", width: 90%)\n#v(0.5em)` : ''}
    
    ${p.choices ? generateChoicesTypst(p.choices) : ''}
    
    #v(1fr)
  ],`;
    });

    source += `\n)`;
    return source;
}

async function main() {
    try {
        const db = new Database('server/exam_builder.db');
        const problems = db.prepare('SELECT * FROM problems WHERE image_path IS NOT NULL').all();
        
        if (problems.length === 0) {
            console.log("No problems with images found.");
            return;
        }

        console.log(`Found ${problems.length} problems with images.`);
        const title = "Typst 이미지 시험지 생성 결과";
        const typstSource = generateTypstSource(title, problems);
        
        const sourcePath = 'test_exam.typ';
        const pdfPath = 'test_exam.pdf';
        
        fs.writeFileSync(sourcePath, typstSource);
        console.log(`Typst source written to ${sourcePath}`);

        console.log("Compiling with Typst...");
        execSync(`typst compile "${sourcePath}" "${pdfPath}"`, { stdio: 'inherit' });
        console.log(`Success! PDF generated at ${pdfPath}`);
        
        const stats = fs.statSync(pdfPath);
        console.log(`Final PDF size: ${(stats.size / 1024).toFixed(2)} KB`);
        db.close();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();
