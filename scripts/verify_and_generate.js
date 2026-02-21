const Database = require('better-sqlite3');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function main() {
    const db = new Database('server/exam_builder.db');
    
    // 1. Find a sample problem
    const problem = db.prepare('SELECT id, question, subject FROM problems LIMIT 1').get();
    if (!problem) {
        console.log('No problems found in database.');
        return;
    }

    const sampleImagePath = '110.수학 과목 자동 풀이 데이터/3.개방데이터/1.데이터/Training/01.원천데이터/TS_1.문제_고등학교_공통수학/H_1_01_25766_84186.png';
    
    // 2. Assign image and "verify" it
    console.log(`Assigning image ${sampleImagePath} to problem #${problem.id}...`);
    db.prepare('UPDATE problems SET image_path = ?, is_image_verified = 1 WHERE id = ?')
      .run(sampleImagePath, problem.id);
    
    console.log('Verification status updated in DB.');

    // 3. Generate PDF bundle
    console.log('Requesting PDF generation...');
    try {
        const response = await axios.post('http://localhost:3000/api/pdf/problems/bundle', {
            problemIds: [problem.id],
            title: `검증_테스트_${problem.id}`
        }, { responseType: 'arraybuffer' });

        const outputPath = path.join(__dirname, `../test_bundle_${problem.id}.zip`);
        fs.writeFileSync(outputPath, response.data);
        console.log(`Success! PDF bundle saved to ${outputPath}`);
    } catch (err) {
        console.error('PDF generation failed:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data.toString());
        }
    } finally {
        db.close();
    }
}

main();
