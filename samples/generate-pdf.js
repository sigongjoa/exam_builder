const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF(htmlFile, outputFile) {
  console.log(`Generating PDF: ${htmlFile} → ${outputFile}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const htmlPath = path.resolve(__dirname, htmlFile);
  await page.goto(`file://${htmlPath}`, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait for KaTeX to render
  await new Promise(r => setTimeout(r, 2000));

  await page.pdf({
    path: path.resolve(__dirname, outputFile),
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
  });

  await browser.close();
  console.log(`Done: ${outputFile}`);
}

(async () => {
  await generatePDF('exam-sample.html', 'exam-sample.pdf');
  await generatePDF('answer-sample.html', 'answer-sample.pdf');
  await generatePDF('exam-test-sample.html', 'exam-test-sample.pdf');
  await generatePDF('answer-test-sample.html', 'answer-test-sample.pdf');
  console.log('All PDFs generated!');
})();
