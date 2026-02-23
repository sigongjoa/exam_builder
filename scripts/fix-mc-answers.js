const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../server/exam_builder.db');
const db = new Database(dbPath);

const dryRun = process.argv.includes('--dry-run');
if (dryRun) {
  console.log('--- DRY RUN MODE: No changes will be saved to the database ---');
}

const marumMap = { '㉠': '1', '㉡': '2', '㉢': '3', '㉣': '4', '㉤': '5' };
const circleMap = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5' };

// Query all multiple_choice problems where answer is not 1-5
const query = "SELECT id, answer, choices FROM problems WHERE type='multiple_choice' AND answer NOT GLOB '[1-5]'";
const problems = db.prepare(query).all();

console.log(`Found ${problems.length} problems with non-numeric MC answers.`);

let fixedCount = 0;
let noMatchCount = 0;
const unmatchedProblems = [];

const updateStmt = db.prepare('UPDATE problems SET answer = ? WHERE id = ?');

problems.forEach((p, index) => {
  const ansText = String(p.answer || '').trim();
  let newAnswer = null;

  // Case 1: Direct mapping of ㉠~㉤
  if (marumMap[ansText]) {
    newAnswer = marumMap[ansText];
  } 
  // Case 2: Direct mapping or prefix of ①~⑤
  else {
    for (const [c, n] of Object.entries(circleMap)) {
      if (ansText.startsWith(c)) {
        newAnswer = n;
        break;
      }
    }
  }

  // Case 3: Match answer text with choices array
  if (!newAnswer) {
    let choices = p.choices;
    if (choices) {
      if (typeof choices === 'string') {
        try {
          choices = JSON.parse(choices);
        } catch (e) {
          choices = null;
        }
      }
      
      if (Array.isArray(choices)) {
        // Prepare search text
        // Use a more robust split for newlines
        const ansLines = ansText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const mainAns = (ansLines[0] || '').replace(/^[①②③④⑤㉠㉡㉢㉣㉤]\s*/, '').trim();

        if (mainAns) {
          let matchIdx = -1;
          choices.forEach((choice, idx) => {
            const choiceClean = String(choice).replace(/^[①②③④⑤㉠㉡㉢㉣㉤]\s*/, '').trim();
            
            // Check if choice contains answer or answer contains choice (using first 20 chars for robustness)
            const searchLen = 20;
            const subChoice = choiceClean.substring(0, searchLen);
            const subAns = mainAns.substring(0, searchLen);
            
            if (subChoice && subAns && (choiceClean.includes(subAns) || mainAns.includes(subChoice))) {
              if (matchIdx === -1) matchIdx = idx;
            }
          });

          if (matchIdx >= 0) {
            newAnswer = String(matchIdx + 1);
          }
        }
      }
    }
  }

  if (newAnswer) {
    if (!dryRun) {
      updateStmt.run(newAnswer, p.id);
    }
    fixedCount++;
    if (index % 100 === 0 && index > 0) {
      console.log(`Processing... ${index}/${problems.length} (Fixed: ${fixedCount})`);
    }
  } else {
    noMatchCount++;
    unmatchedProblems.push({
      id: p.id,
      answer: p.answer,
      choices: p.choices
    });
  }
});

// Save unmatched results
const reportPath = path.join(__dirname, '../reports/2026-02-23_data-fix-linebreak/assets/unmatched_answers.json');
fs.writeFileSync(reportPath, JSON.stringify(unmatchedProblems, null, 2));

console.log('\n--- Final Statistics ---');
console.log(`Total problems checked: ${problems.length}`);
console.log(`Successfully fixed:     ${fixedCount}`);
console.log(`Could not match:        ${noMatchCount}`);
console.log(`Unmatched list saved to: ${reportPath}`);

if (dryRun) {
  console.log('\nNOTE: This was a DRY RUN. No changes were made to the database.');
} else {
  console.log('\nDatabase update complete.');
}
