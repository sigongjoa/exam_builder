const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api';

async function testBundle() {
    try {
        console.log('--- Testing Exam Bundle ---');
        // Assuming exam ID 1 exists from previous reports
        const examId = 1;
        const response = await axios.get(`${BASE_URL}/pdf/${examId}/bundle`, { responseType: 'arraybuffer' });
        const bundlePath = path.resolve(__dirname, 'test_exam_bundle.zip');
        fs.writeFileSync(bundlePath, response.data);
        console.log(`Saved exam bundle to ${bundlePath}`);

        console.log('\n--- Testing Problems Bundle ---');
        const problemIds = [70, 71, 72]; // Sample IDs from previous reports
        const probResponse = await axios.post(`${BASE_URL}/pdf/problems/bundle`, {
            problemIds,
            title: 'Verification_Test'
        }, { responseType: 'arraybuffer' });
        const probBundlePath = path.resolve(__dirname, 'test_probs_bundle.zip');
        fs.writeFileSync(probBundlePath, probResponse.data);
        console.log(`Saved problems bundle to ${probBundlePath}`);

        console.log('\nVerification Successful!');
    } catch (err) {
        console.error('Verification Failed:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', err.response.data.toString());
        }
    }
}

testBundle();
