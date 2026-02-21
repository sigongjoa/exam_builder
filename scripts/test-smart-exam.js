const puppeteer = require('puppeteer');

async function testSmartExam() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
        // 1. 새 시험지 만들기 페이지
        console.log('1. 시험지 만들기 페이지 로드...');
        await page.goto('http://localhost:5173/exams/new', { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: 'test_01_new_exam.png', fullPage: true });

        // 2. 스마트 출제 탭 클릭
        console.log('2. 스마트 출제 탭 클릭...');
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const b of buttons) {
                if (b.textContent.includes('스마트')) { b.click(); break; }
            }
        });
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'test_02_smart_tab.png', fullPage: true });

        // 3. 과목 선택 (중1수학)
        console.log('3. 과목 선택...');
        const subjectSelects = await page.$$('select');
        console.log(`  select 개수: ${subjectSelects.length}`);

        // 과목 선택 - 두번째 select가 보통 과목 select
        for (const sel of subjectSelects) {
            const options = await sel.$$eval('option', opts => opts.map(o => o.value));
            if (options.includes('중1수학')) {
                await sel.select('중1수학');
                console.log('  중1수학 선택됨');
                break;
            }
        }
        await new Promise(r => setTimeout(r, 1500));
        await page.screenshot({ path: 'test_03_subject_selected.png', fullPage: true });

        // 4. 단원 트리 확인 및 여러 단원 선택
        console.log('4. 단원 트리 확인...');
        const checkboxes = await page.$$('input[type="checkbox"]');
        console.log(`  체크박스 수: ${checkboxes.length}`);

        // 첫번째 level1 토글 버튼 클릭 (expand)
        const expandBtns = await page.$$('button');
        let expandClicked = 0;
        for (const btn of expandBtns) {
            const text = await btn.evaluate(el => el.textContent);
            if (text.trim() === '▶') {
                await btn.click();
                expandClicked++;
                await new Promise(r => setTimeout(r, 300));
                if (expandClicked >= 1) break;
            }
        }
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: 'test_04_tree_expanded.png', fullPage: true });

        // 5. 체크박스 여러 개 선택
        console.log('5. 단원 체크박스 여러 개 선택...');
        const allCheckboxes = await page.$$('input[type="checkbox"]');
        console.log(`  현재 체크박스 수: ${allCheckboxes.length}`);

        let checked = 0;
        for (const cb of allCheckboxes) {
            if (checked >= 3) break;
            const isChecked = await cb.evaluate(el => el.checked);
            if (!isChecked) {
                await cb.click();
                checked++;
                await new Promise(r => setTimeout(r, 200));
            }
        }
        console.log(`  ${checked}개 체크박스 선택됨`);
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: 'test_05_chapters_selected.png', fullPage: true });

        // 6. 선택된 chapter_codes 확인 (React state 직접 확인은 불가하므로 UI로 확인)
        const selectionText = await page.evaluate(() => {
            const el = document.querySelector('[class*="text-sm font-medium text-gray-700"]');
            return el ? el.textContent : '못찾음';
        });
        console.log(`  단원 선택 텍스트: ${selectionText}`);

        // 7. 제목 입력
        console.log('6. 제목 입력...');
        const titleInput = await page.$('input[placeholder*="월말고사"]');
        if (titleInput) {
            await titleInput.click({ clickCount: 3 });
            await titleInput.type('다단원 테스트 시험지');
        }
        await page.screenshot({ path: 'test_06_ready_to_create.png', fullPage: true });

        console.log('\n=== 테스트 완료 ===');
        console.log('스크린샷 파일들:');
        console.log('  test_01_new_exam.png');
        console.log('  test_02_smart_tab.png');
        console.log('  test_03_subject_selected.png');
        console.log('  test_04_tree_expanded.png');
        console.log('  test_05_chapters_selected.png');
        console.log('  test_06_ready_to_create.png');

    } catch (err) {
        console.error('오류:', err.message);
        await page.screenshot({ path: 'test_error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testSmartExam().catch(console.error);
