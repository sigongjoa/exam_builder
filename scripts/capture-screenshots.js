const puppeteer = require('puppeteer');
const path = require('path');

async function capture(url, filename) {
    console.log(`Navigating to ${url}...`);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        // Wait for a bit to ensure React components are rendered
        await new Promise(r => setTimeout(r, 3000));

        const screenshotPath = path.resolve(__dirname, '..', filename);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to ${screenshotPath}`);
    } catch (err) {
        console.error(`Failed to capture ${url}:`, err.message);
    } finally {
        await browser.close();
    }
}

(async () => {
    await capture('http://localhost:5173/exams', 'screenshot_exams.png');
    await capture('http://localhost:5173/problems', 'screenshot_problems.png');
})();
