const puppeteer = require('/mnt/d/progress/mathesis/node20_Exam Builder/node_modules/puppeteer');
const fs = require('fs');

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const html = `<!DOCTYPE html><html><head>
    <link rel="stylesheet" href="file:///mnt/d/progress/mathesis/node20_Exam Builder/client/node_modules/katex/dist/katex.min.css">
    <style>body { font-size: 9.5pt; padding: 50px; background: white; }</style>
    </head><body><div id="target" style="display:inline-block; padding:10px; border:1px solid #ccc;">
      ① <span class="katex"><span class="katex-mathml"><math><semantics><mrow><mo>−</mo><msqrt><mn>9</mn></msqrt></mrow></semantics></math></span><span class="katex-html"><span class="base"><span class="mord">−</span><span class="mord sqrt"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height:0.9072em;"><span class="svg-align" style="top:-3em;"><span class="pstrut" style="height:3em;"></span><span class="mord" style="padding-left:0.833em;"><span class="mord">9</span></span></span><span style="top:-2.8672em;"><span class="pstrut" style="height:3em;"></span><span class="hide-tail" style="min-width:0.853em;height:1.08em;"><svg width="400em" height="1.08em" viewBox="0 0 400000 1080" preserveAspectRatio="xMinYMin slice"><path d="M95,702 c-2.7,0,-7.17,-2.7,-13.5,-8c-5.8,-5.3,-9.5,-10,-9.5,-14 c0,-2,0.3,-3.3,1,-4c1.3,-2.7,23.83,-20.7,67.5,-54 c44.2,-33.3,65.8,-50.3,66.5,-51c1.3,-1.3,3,-2,5,-2c4.7,0,8.7,3.3,12,10 s173,378,173,378c0.7,0,35.3,-71,104,-213c68.7,-142,137.5,-285,206.5,-429 c69,-144,104.5,-217.7,106.5,-221 l0 -0 c5.3,-9.3,12,-14,20,-14 H400000v40H845.2724 s-225.272,467,-225.272,467s-235,486,-235,486c-2.7,4.7,-9,7,-19,7 c-6,0,-10,-1,-12,-3s-194,-422,-194,-422s-65,47,-65,47z M834 80h400000v40h-400000z"/></svg></span></span></span><span class="vlist-s">​</span></span><span class="vlist-r"><span class="vlist" style="height:0.1328em;"><span></span></span></span></span></span></span></span></span>
    </div></body></html>`;
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const element = await page.$('#target');
  const box = await element.boundingBox();
  await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 }); // 고해상도 캡처
  await page.screenshot({ path: 'debug_artifacts/zoom_proof.png', clip: box });
  console.log('Proof saved.');
  await browser.close();
}
main();
