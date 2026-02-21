/**
 * 과목별 샘플 시험지 PDF 생성기
 * 국어, 영어, 과학, 사회 각 과목의 샘플 문제지를 생성합니다.
 *
 * Usage: node scripts/generate-subject-samples.js
 * Output: sample_exams/ 디렉토리에 PDF 파일 생성
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 출력 디렉토리
const OUTPUT_DIR = path.join(__dirname, '..', 'sample_exams');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// 과목별 테마 (컬러 시스템)
// ─────────────────────────────────────────────────────────────────────────────
const THEMES = {
  korean:  { primary: '#B71C1C', secondary: '#D32F2F', light: '#FFEBEE', accent: '#FF8A80', name: '국어' },
  english: { primary: '#0D47A1', secondary: '#1565C0', light: '#E3F2FD', accent: '#82B1FF', name: '영어' },
  science: { primary: '#1B5E20', secondary: '#2E7D32', light: '#E8F5E9', accent: '#69F0AE', name: '과학' },
  social:  { primary: '#E65100', secondary: '#F57C00', light: '#FFF3E0', accent: '#FFD180', name: '사회' },
};

// ─────────────────────────────────────────────────────────────────────────────
// 공통 HTML 빌더
// ─────────────────────────────────────────────────────────────────────────────
function buildExamHTML(examInfo, groups, options = {}) {
  const { showAnswers = false } = options;
  const { title, grade, examType, totalPoints, theme } = examInfo;
  const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const typeLabel = examType === 'monthly' ? '월말고사' : examType === 'midterm' ? '중간고사' : examType === 'final' ? '기말고사' : '단원평가';

  const circledNums = ['①', '②', '③', '④', '⑤'];

  let globalNum = 1;

  // 모든 문제 flat list (정답표용)
  const allProblems = groups.flatMap(g => g.problems);
  const totalCount = allProblems.length;
  const mcCount = allProblems.filter(p => p.type !== 'descriptive').length;
  const descCount = allProblems.filter(p => p.type === 'descriptive').length;

  // ── 지문(Passage) HTML 생성 ──
  function buildPassageHTML(passage, passageNum, fromNum, toNum) {
    const rangeLabel = fromNum === toNum ? `${fromNum}번` : `${fromNum}~${toNum}번`;
    return `
      <div class="passage-block">
        <div class="passage-header">
          <span class="passage-label">[지문 ${passageNum}]</span>
          <span class="passage-range">(${rangeLabel} 문항)</span>
        </div>
        <div class="passage-text">${passage.replace(/\n/g, '<br>')}</div>
      </div>`;
  }

  // ── 문제 HTML 생성 ──
  function buildProblemHTML(p) {
    const currentNum = globalNum++;
    const points = p.points || 5;
    const isDesc = p.type === 'descriptive';

    let choicesHTML = '';
    if (!isDesc && p.choices && p.choices.length > 0) {
      choicesHTML = '<div class="choices">' +
        p.choices.map((c, i) => {
          const isAnswer = showAnswers && String(p.answer) === String(i + 1);
          return `<span class="choice${isAnswer ? ' correct' : ''}">${circledNums[i]} ${c}</span>`;
        }).join('') + '</div>';
    }

    let answerArea = '';
    if (isDesc) {
      if (showAnswers) {
        answerArea = `<div class="solution"><strong>모범 답안:</strong> ${p.modelAnswer || p.answer || ''}</div>`;
      } else {
        const lines = Array(p.lines || 5).fill('<div class="line"></div>').join('');
        answerArea = `<div class="descriptive-area"><span class="da-label">답</span><div class="lines">${lines}</div></div>`;
      }
    }

    return `<div class="problem">
      <div class="problem-header">
        <span class="problem-number">${currentNum}.</span>
        ${isDesc ? '<span class="descriptive-mark">서술형</span>' : ''}
        <span class="points">[${points}점]</span>
      </div>
      <div class="problem-text">${p.question}</div>
      ${choicesHTML}
      ${answerArea}
    </div>`;
  }

  // ── 섹션별 HTML 빌드 ──
  let bodyHTML = '';

  for (const group of groups) {
    const groupProblems = group.problems;
    const startNum = globalNum;
    const problemHTMLs = groupProblems.map(p => buildProblemHTML(p));
    const endNum = globalNum - 1;

    if (group.passage) {
      // 지문이 있는 그룹: 지문 블록(전체 너비) + 2컬럼 문제
      bodyHTML += `<div class="passage-section">`;
      bodyHTML += buildPassageHTML(group.passage, group.passageNum || 1, startNum, endNum);
      const mid = Math.ceil(problemHTMLs.length / 2);
      bodyHTML += `<div class="two-column">
        <div class="column">${problemHTMLs.slice(0, mid).join('\n')}</div>
        <div class="column">${problemHTMLs.slice(mid).join('\n')}</div>
      </div>`;
      bodyHTML += `</div>`;
    } else {
      // 일반 문제: 직접 컬럼에 추가 (나중에 합쳐서 처리)
      group._htmls = problemHTMLs;
    }
  }

  // 지문 없는 그룹들을 모아서 2컬럼 처리
  const standaloneHTMLs = groups.filter(g => !g.passage && g._htmls).flatMap(g => g._htmls);
  if (standaloneHTMLs.length > 0) {
    const mid = Math.ceil(standaloneHTMLs.length / 2);
    bodyHTML += `<div class="two-column">
      <div class="column">${standaloneHTMLs.slice(0, mid).join('\n')}</div>
      <div class="column">${standaloneHTMLs.slice(mid).join('\n')}</div>
    </div>`;
  }

  // ── 정답표 (답안지용) ──
  let answerGridHTML = '';
  if (showAnswers) {
    const half = Math.ceil(allProblems.length / 2);
    let num = 1;
    let rows = '';
    for (let i = 0; i < half; i++) {
      const left = allProblems[i];
      const right = allProblems[i + half];
      const leftAns = left.type === 'descriptive' ? '서술' : left.answer;
      const rightAns = right ? (right.type === 'descriptive' ? '서술' : right.answer) : '';
      rows += `<tr>
        <td class="ag-num">${i + 1}</td><td>${leftAns}</td>
        <td class="ag-num">${right ? i + half + 1 : ''}</td><td>${rightAns}</td>
      </tr>`;
    }
    answerGridHTML = `
      <div style="padding:12px 16px;">
        <div class="section-divider">정답표</div>
        <table class="answer-table">
          <thead><tr><th>번호</th><th>정답</th><th>번호</th><th>정답</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const noticeText = `<b>총 ${totalCount}문제</b> (객관식 ${mcCount}문제${descCount > 0 ? ' + 서술형 ' + descCount + '문제' : ''}) &nbsp;|&nbsp; 총 ${totalPoints}점 배점`;
  const titleSuffix = showAnswers ? ' <span style="color:#c62828">[답안지]</span>' : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 12mm 10mm 15mm 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 10pt; line-height: 1.5; color: #222; background: white; }

  /* Header */
  .exam-header { border-bottom: 3px solid ${theme.primary}; padding: 12px 16px 10px; }
  .exam-header .top-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
  .subject-badge { display: inline-block; background: ${theme.primary}; color: white; font-size: 9pt; font-weight: 900; padding: 2px 10px; border-radius: 12px; margin-bottom: 4px; letter-spacing: 1px; }
  .exam-title { font-size: 20pt; font-weight: 900; color: ${theme.primary}; letter-spacing: 2px; }
  .exam-subtitle { font-size: 11pt; color: #555; margin-top: 2px; }
  .exam-meta { text-align: right; font-size: 9pt; color: #666; }
  .exam-meta .date { font-size: 10pt; font-weight: 700; color: #333; }

  /* Student info */
  .student-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: ${theme.light}; border-bottom: 1px solid #ddd; }
  .student-row .fields { display: flex; gap: 24px; font-size: 10pt; }
  .student-row .field-label { color: #888; font-size: 9pt; }
  .student-row .field-value { font-weight: 700; border-bottom: 1.5px solid ${theme.primary}; min-width: 70px; display: inline-block; text-align: center; padding-bottom: 1px; }
  .student-row .score-box { border: 2px solid ${theme.primary}; border-radius: 4px; padding: 4px 14px; font-size: 10pt; font-weight: 700; color: ${theme.primary}; }

  /* Notice */
  .notice { padding: 6px 16px; font-size: 8pt; color: #888; border-bottom: 1px solid #eee; }
  .notice b { color: #555; }

  /* Passage Block */
  .passage-section { margin-bottom: 4px; }
  .passage-block { margin: 8px 12px; padding: 10px 14px; border: 1.5px solid ${theme.secondary}; border-radius: 6px; background: ${theme.light}; }
  .passage-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; border-bottom: 1px solid ${theme.secondary}; padding-bottom: 4px; }
  .passage-label { font-size: 9.5pt; font-weight: 900; color: ${theme.primary}; }
  .passage-range { font-size: 8pt; color: #777; }
  .passage-text { font-size: 9.5pt; line-height: 1.8; color: #333; }

  /* 2-column layout */
  .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .column { min-width: 0; padding: 8px 12px; }
  .column:first-child { border-right: 1px solid #ddd; }

  /* Problems */
  .problem { margin-bottom: 14px; }
  .problem-header { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
  .problem-number { font-weight: 900; font-size: 11pt; color: ${theme.primary}; min-width: 20px; }
  .points { font-size: 8pt; color: #999; }
  .problem-text { font-size: 10pt; line-height: 1.65; margin-bottom: 6px; padding-left: 2px; }

  /* Choices */
  .choices { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; padding-left: 4px; font-size: 9.5pt; }
  .choice { padding: 1px 0; }
  .choice.correct { color: #c62828; font-weight: bold; }

  /* Descriptive */
  .descriptive-mark { display: inline-block; background: ${theme.primary}; color: white; font-size: 7.5pt; padding: 1px 5px; border-radius: 3px; font-weight: 700; }
  .descriptive-area { border: 1px solid #ccc; min-height: 80px; margin-top: 6px; border-radius: 4px; padding: 6px; position: relative; }
  .descriptive-area .da-label { font-size: 8pt; color: #999; position: absolute; top: 4px; left: 8px; }
  .descriptive-area .lines { margin-top: 14px; }
  .descriptive-area .line { border-bottom: 1px dotted #ddd; height: 22px; }

  /* Solution */
  .solution { margin-top: 6px; padding: 6px 10px; background: #f8f8ff; border-left: 3px solid ${theme.secondary}; font-size: 9pt; line-height: 1.6; }

  /* Section divider */
  .section-divider { border-top: 2px solid ${theme.primary}; margin: 10px 0 8px; padding-top: 6px; font-size: 10pt; font-weight: 700; color: ${theme.primary}; }

  /* Answer table */
  .answer-table { border-collapse: collapse; width: 60%; margin: 8px auto; }
  .answer-table th, .answer-table td { border: 1px solid #999; padding: 4px 10px; font-size: 9pt; text-align: center; }
  .answer-table th { background: ${theme.light}; font-weight: 700; }
  .answer-table .ag-num { font-weight: 700; color: ${theme.primary}; }

  /* Footer */
  .page-footer { text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding: 6px 16px 0; margin-top: 12px; }
</style>
</head>
<body>

  <div class="exam-header">
    <div class="top-row">
      <div>
        <div><span class="subject-badge">${theme.name}</span></div>
        <div class="exam-title">${title}${titleSuffix}</div>
        <div class="exam-subtitle">${typeLabel} · ${grade}</div>
      </div>
      <div class="exam-meta">
        <div class="date">${date}</div>
        <div>총 ${totalPoints}점</div>
      </div>
    </div>
  </div>

  <div class="student-row">
    <div class="fields">
      <span><span class="field-label">학년 </span><span class="field-value">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></span>
      <span><span class="field-label">이름 </span><span class="field-value">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></span>
    </div>
    <div class="score-box">
      <span class="field-label">점수</span>
      &nbsp;&nbsp;&nbsp;&nbsp;/ ${totalPoints}
    </div>
  </div>

  <div class="notice">${noticeText}</div>

  ${bodyHTML}
  ${answerGridHTML}

  <div class="page-footer">Exam Builder | ${theme.name} ${typeLabel} &nbsp;|&nbsp; ${grade}</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF 생성 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
async function generatePDF(browser, html, outputPath) {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));
  const pdfData = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' }
  });
  await page.close();
  fs.writeFileSync(outputPath, Buffer.from(pdfData));
  console.log(`  ✓ ${path.basename(outputPath)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 과목별 샘플 데이터
// ─────────────────────────────────────────────────────────────────────────────

// ── 국어 (중1, 현대소설 단원) ──
const KOREAN_EXAM = {
  examInfo: {
    title: '국어 단원평가',
    grade: '중학교 1학년',
    examType: 'unit',
    totalPoints: 40,
    theme: THEMES.korean,
  },
  groups: [
    {
      passageNum: 1,
      passage: `다음 글을 읽고 물음에 답하시오.\n\n소년은 개울가에서 소녀를 처음 보았다. 소녀는 물가에 쭈그리고 앉아 무엇인가를 들여다보고 있었다. 소년이 가슴이 뛰었다. 소녀는 소년이 개울 둑에 선 것을 알아채고 고개를 들었다. 눈이 마주쳤다. 소녀가 소년에게 눈을 흘기고는 자리에서 일어나 논둑으로 걸어갔다. 소년은 한 걸음도 떼지 못하고 그 자리에 서 있었다. 소녀가 갈꽃 한 가지를 꺾어 들고 길을 걸어가며 이리저리 흔들었다.\n\n- 황순원, 「소나기」에서`,
      problems: [
        {
          type: 'multiple_choice', points: 5,
          question: '이 글에서 소년이 소녀를 처음 만난 장소는 어디입니까?',
          choices: ['산속 오솔길', '개울가', '학교 운동장', '마을 입구', '논밭 사이'],
          answer: '2',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '소년이 소녀를 보았을 때의 심리 상태로 가장 적절한 것은?',
          choices: ['무서움과 두려움', '설렘과 긴장감', '슬픔과 외로움', '분노와 불만', '무관심과 냉담함'],
          answer: '2',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '소녀가 소년에게 한 행동으로 옳은 것은?',
          choices: ['반갑게 인사를 건넸다', '못 본 척 지나쳤다', '눈을 흘기며 자리를 떴다', '소년에게 말을 걸었다', '소년을 향해 손을 흔들었다'],
          answer: '3',
        },
      ],
    },
    {
      problems: [
        {
          type: 'multiple_choice', points: 5,
          question: '다음 중 밑줄 친 단어의 뜻풀이가 바른 것은?\n\n소녀는 물가에 <u>쭈그리고</u> 앉아 있었다.',
          choices: ['몸을 꼿꼿이 세우고', '몸을 잔뜩 웅크리고', '몸을 활짝 펴고', '몸을 옆으로 기울이고', '몸을 앞으로 숙이고'],
          answer: '2',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '다음 중 우리말 맞춤법이 올바른 문장은?',
          choices: [
            '나는 어제 책을 읽었다.',
            '그는 학교에 갔다왔다.',
            '우리 집에 오세여.',
            '빨리 먹어야 됬어.',
            '내일 꼭 와줄께.',
          ],
          answer: '1',
        },
        {
          type: 'descriptive', points: 15, lines: 6,
          question: '이 글의 소년과 소녀가 처음 만나는 장면에서 나타나는 소년의 심리 변화를 글의 내용을 근거로 하여 서술하시오. (3가지 이상)',
          modelAnswer: '소년은 소녀를 보고 가슴이 뛰는 설렘을 느꼈으며, 눈이 마주쳤을 때 어떻게 해야 할지 몰라 당황하였고, 소녀가 자리를 떠나자 한 걸음도 떼지 못할 만큼 얼어붙은 상태가 되었다.',
        },
      ],
    },
  ],
};

// ── 영어 (중1, Reading & Grammar) ──
const ENGLISH_EXAM = {
  examInfo: {
    title: '영어 단원평가',
    grade: '중학교 1학년',
    examType: 'unit',
    totalPoints: 40,
    theme: THEMES.english,
  },
  groups: [
    {
      passageNum: 1,
      passage: `[Read the passage and answer the questions.]\n\nMy name is Jinho. I am a middle school student. I have a best friend. His name is Minsu. We go to school together every day. We also eat lunch together in the cafeteria. After school, we play soccer in the park. I like soccer very much. On weekends, I help my parents at home. I clean my room and wash the dishes. I am happy because I have a good friend and a warm family.`,
      problems: [
        {
          type: 'multiple_choice', points: 5,
          question: "What sport does Jinho like?",
          choices: ['basketball', 'baseball', 'soccer', 'tennis', 'swimming'],
          answer: '3',
        },
        {
          type: 'multiple_choice', points: 5,
          question: "Where do Jinho and Minsu eat lunch?",
          choices: ['at home', 'in the park', 'in the classroom', 'in the cafeteria', 'at a restaurant'],
          answer: '4',
        },
        {
          type: 'multiple_choice', points: 5,
          question: "본문의 내용과 일치하지 않는 것은?",
          choices: [
            'Jinho and Minsu go to school together.',
            'They play soccer after school.',
            'Jinho has a pet dog.',
            'Jinho helps his parents on weekends.',
            'Jinho cleans his room.',
          ],
          answer: '3',
        },
      ],
    },
    {
      problems: [
        {
          type: 'multiple_choice', points: 5,
          question: '빈칸에 알맞은 단어를 고르시오.\n\n"He ______ soccer with his friends every day."',
          choices: ['play', 'plays', 'playing', 'played', 'to play'],
          answer: '2',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '다음 중 어법상 바른 문장은?',
          choices: [
            'She have a nice bag.',
            'I am go to school.',
            'They are students.',
            'He don\'t like pizza.',
            'We is friends.',
          ],
          answer: '3',
        },
        {
          type: 'descriptive', points: 15, lines: 6,
          question: '진호(Jinho)에 대해 본문에서 알 수 있는 내용을 우리말로 3가지 이상 쓰시오.',
          modelAnswer: '① 진호는 중학생이다. ② 베스트 프렌드는 민수이며 함께 등교한다. ③ 방과 후에 공원에서 축구를 한다. ④ 주말에 방 청소와 설거지를 하며 부모님을 돕는다.',
        },
      ],
    },
  ],
};

// ── 과학 (중1, 생물 — 세포와 광합성) ──
const SCIENCE_EXAM = {
  examInfo: {
    title: '과학 단원평가',
    grade: '중학교 1학년',
    examType: 'unit',
    totalPoints: 40,
    theme: THEMES.science,
  },
  groups: [
    {
      problems: [
        {
          type: 'multiple_choice', points: 5,
          question: '생물체를 이루는 기본 단위는 무엇인가?',
          choices: ['조직', '기관', '세포', '개체', '세포막'],
          answer: '3',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '광합성이 일어나는 세포 소기관으로 옳은 것은?',
          choices: ['미토콘드리아', '리보솜', '핵', '엽록체', '세포막'],
          answer: '4',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '식물 세포에만 있는 구조물을 바르게 짝지은 것은?',
          choices: [
            '핵, 세포막',
            '엽록체, 세포벽',
            '미토콘드리아, 리보솜',
            '세포막, 핵',
            '리보솜, 미토콘드리아',
          ],
          answer: '2',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '광합성의 산물로 옳게 짝지어진 것은?',
          choices: [
            '이산화탄소, 물',
            '산소, 이산화탄소',
            '포도당, 산소',
            '물, 포도당',
            '산소, 이산화탄소, 물',
          ],
          answer: '3',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '세포 호흡에 대한 설명으로 옳은 것은?',
          choices: [
            '엽록체에서 일어난다.',
            '빛이 있을 때만 일어난다.',
            '이산화탄소를 흡수하고 산소를 방출한다.',
            '유기물을 분해하여 생명 활동에 필요한 에너지를 얻는다.',
            '광합성과 동일한 과정이다.',
          ],
          answer: '4',
        },
        {
          type: 'descriptive', points: 15, lines: 7,
          question: '광합성이 일어나기 위한 조건(재료)과 광합성의 결과물(산물)을 각각 구분하여 서술하고, 광합성이 일어나는 세포 소기관의 이름을 쓰시오.',
          modelAnswer: '재료: 빛에너지, 이산화탄소(CO₂), 물(H₂O) / 산물: 포도당(C₆H₁₂O₆), 산소(O₂) / 세포 소기관: 엽록체',
        },
      ],
    },
  ],
};

// ── 사회 (중1, 역사 — 선사시대 ~ 삼국시대) ──
const SOCIAL_EXAM = {
  examInfo: {
    title: '사회 단원평가',
    grade: '중학교 1학년',
    examType: 'unit',
    totalPoints: 40,
    theme: THEMES.social,
  },
  groups: [
    {
      problems: [
        {
          type: 'multiple_choice', points: 5,
          question: '우리나라 최초의 국가로 기원전 2333년에 건국된 것은?',
          choices: ['고구려', '백제', '신라', '고조선', '가야'],
          answer: '4',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '고조선을 건국한 사람은 누구인가?',
          choices: ['박혁거세', '주몽', '단군왕검', '온조', '김수로'],
          answer: '3',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '삼국 시대의 세 나라가 바르게 짝지어진 것은?',
          choices: [
            '고조선, 부여, 가야',
            '고구려, 백제, 신라',
            '가야, 신라, 발해',
            '발해, 고려, 조선',
            '고구려, 고려, 조선',
          ],
          answer: '2',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '신라가 삼국을 통일한 세기는?',
          choices: ['4세기', '5세기', '6세기', '7세기', '8세기'],
          answer: '4',
        },
        {
          type: 'multiple_choice', points: 5,
          question: '고조선의 8조법에 대한 설명으로 옳지 않은 것은?',
          choices: [
            '사람을 죽인 자는 사형에 처한다.',
            '남에게 상해를 입힌 자는 곡식으로 갚는다.',
            '도둑질한 자는 노비로 삼는다.',
            '법이 매우 관대하여 형벌이 없었다.',
            '사유 재산을 중시하는 사회였음을 알 수 있다.',
          ],
          answer: '4',
        },
        {
          type: 'descriptive', points: 15, lines: 7,
          question: '고조선의 8조법 중 현재 전해지는 3가지 조항을 쓰고, 이를 통해 알 수 있는 고조선 사회의 특징을 2가지 이상 서술하시오.',
          modelAnswer: '조항: ① 사람을 죽인 자는 죽인다. ② 남을 다치게 한 자는 곡식으로 갚는다. ③ 남의 물건을 훔친 자는 노비로 삼거나 50만 전으로 배상한다.\n사회 특징: 생명과 노동력을 중시하였고, 사유재산을 보호하는 사회였으며, 신분 제도(노비)가 존재하였다.',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 메인 실행
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📄 과목별 샘플 시험지 PDF 생성 시작...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const subjects = [
    { key: 'korean',  data: KOREAN_EXAM,  label: '국어' },
    { key: 'english', data: ENGLISH_EXAM, label: '영어' },
    { key: 'science', data: SCIENCE_EXAM, label: '과학' },
    { key: 'social',  data: SOCIAL_EXAM,  label: '사회' },
  ];

  for (const { key, data, label } of subjects) {
    console.log(`[${label}] 생성 중...`);
    const { examInfo, groups } = data;

    // 시험지
    const examHTML = buildExamHTML(examInfo, groups, { showAnswers: false });
    await generatePDF(browser, examHTML, path.join(OUTPUT_DIR, `sample_${key}_exam.pdf`));

    // 답안지
    const ansHTML = buildExamHTML(examInfo, groups, { showAnswers: true });
    await generatePDF(browser, ansHTML, path.join(OUTPUT_DIR, `sample_${key}_answer.pdf`));
  }

  await browser.close();

  console.log(`\n✅ 완료! 생성된 파일: ${OUTPUT_DIR}`);
  console.log('파일 목록:');
  fs.readdirSync(OUTPUT_DIR).forEach(f => console.log(`  - ${f}`));
}

main().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
