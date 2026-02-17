import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ExamCreate() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [msg, setMsg] = useState(null);
  const [mode, setMode] = useState('manual'); // 'manual' | 'auto' | 'batch' | 'smart'
  const [autoCount, setAutoCount] = useState(20);
  const [batchGroup, setBatchGroup] = useState('');
  const [batchPrefix, setBatchPrefix] = useState('');
  const [groups, setGroups] = useState([]);

  // Exam form
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState('monthly');
  const [studentId, setStudentId] = useState('');

  // Smart mode states
  const [smartSubject, setSmartSubject] = useState('');
  const [curriculumItems, setCurriculumItems] = useState([]);
  const [selectedChapterCodes, setSelectedChapterCodes] = useState(new Set());
  const [expandedLevel1, setExpandedLevel1] = useState(new Set());
  const [expandedLevel2, setExpandedLevel2] = useState(new Set());
  const [smartTotalCount, setSmartTotalCount] = useState(20);
  const [diffRatio, setDiffRatio] = useState({ '1': 40, '2': 40, '3': 20 });
  const [mcRatio, setMcRatio] = useState(70);
  const [smartTitle, setSmartTitle] = useState('');
  const [smartExamType, setSmartExamType] = useState('monthly');
  const [smartStudentId, setSmartStudentId] = useState('');

  // Problem filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterStatus, setFilterStatus] = useState('approved');

  // Selected problems for the exam
  const [selected, setSelected] = useState([]); // [{problem_id, points, problem}]

  useEffect(() => {
    axios.get('/api/students').then(r => {
      setStudents(r.data);
      const uniqueGroups = [...new Set(r.data.map(s => s.group_name).filter(Boolean))];
      setGroups(uniqueGroups);
    });
    axios.get('/api/curriculum/subjects').then(r => setSubjects(r.data));
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [filterSubject, filterDifficulty, filterStatus]);

  // Fetch curriculum when smart subject changes
  useEffect(() => {
    if (smartSubject) {
      axios.get(`/api/curriculum?subject=${encodeURIComponent(smartSubject)}`).then(r => {
        setCurriculumItems(r.data);
        setSelectedChapterCodes(new Set());
        setExpandedLevel1(new Set());
        setExpandedLevel2(new Set());
      });
    } else {
      setCurriculumItems([]);
      setSelectedChapterCodes(new Set());
    }
  }, [smartSubject]);

  const fetchProblems = () => {
    const params = new URLSearchParams();
    if (filterSubject) params.set('subject', filterSubject);
    if (filterDifficulty) params.set('difficulty', filterDifficulty);
    if (filterStatus) params.set('status', filterStatus);
    axios.get(`/api/problems?${params}`).then(r => {
      const data = r.data;
      setAllProblems(data.problems || data);
    });
  };

  const showMsg = (text, ok) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const addProblem = (problem) => {
    if (selected.find(s => s.problem_id === problem.id)) return;
    setSelected([...selected, { problem_id: problem.id, points: problem.points || 5, problem }]);
  };

  const removeProblem = (problemId) => {
    setSelected(selected.filter(s => s.problem_id !== problemId));
  };

  const updatePoints = (problemId, points) => {
    setSelected(selected.map(s => s.problem_id === problemId ? { ...s, points: +points } : s));
  };

  const moveProblem = (index, direction) => {
    const newSelected = [...selected];
    const target = index + direction;
    if (target < 0 || target >= newSelected.length) return;
    [newSelected[index], newSelected[target]] = [newSelected[target], newSelected[index]];
    setSelected(newSelected);
  };

  const totalPoints = selected.reduce((sum, s) => sum + s.points, 0);

  const handleCreate = async () => {
    if (!title.trim()) { showMsg('시험지 제목을 입력하세요', false); return; }
    if (selected.length === 0) { showMsg('문제를 1개 이상 선택하세요', false); return; }

    try {
      await axios.post('/api/exams', {
        title,
        exam_type: examType,
        student_id: studentId || null,
        problems: selected.map(s => ({ problem_id: s.problem_id, points: s.points }))
      });
      showMsg('시험지 생성 완료!', true);
      setTimeout(() => navigate('/exams'), 1000);
    } catch { showMsg('시험지 생성 실패', false); }
  };

  const handleAutoCreate = async () => {
    if (!studentId) { showMsg('학생을 선택하세요', false); return; }
    if (!title.trim()) { showMsg('제목을 입력하세요', false); return; }
    try {
      const res = await axios.post('/api/exams/auto', {
        student_id: +studentId, count: autoCount, title, exam_type: examType
      });
      showMsg(`자동 시험지 생성 완료! (${res.data.problem_count}문제)`, true);
      setTimeout(() => navigate('/exams'), 1000);
    } catch (err) { showMsg(err.response?.data?.message || err.response?.data?.error || '자동 생성 실패', false); }
  };

  const handleBatchCreate = async () => {
    if (!batchGroup) { showMsg('그룹을 선택하세요', false); return; }
    if (!batchPrefix.trim()) { showMsg('제목 접두사를 입력하세요', false); return; }
    try {
      const res = await axios.post('/api/exams/batch', {
        group_name: batchGroup, count: autoCount, exam_type: examType, title_prefix: batchPrefix
      });
      showMsg(`일괄 생성 완료! (${res.data.exams.length}명)`, true);
      setTimeout(() => navigate('/exams'), 1000);
    } catch (err) { showMsg(err.response?.data?.message || err.response?.data?.error || '일괄 생성 실패', false); }
  };

  const handleSmartCreate = async () => {
    if (!smartTitle.trim()) { showMsg('시험지 제목을 입력하세요', false); return; }
    if (!smartSubject) { showMsg('과목을 선택하세요', false); return; }
    if (selectedChapterCodes.size === 0) { showMsg('단원을 1개 이상 선택하세요', false); return; }

    try {
      const res = await axios.post('/api/exams/smart', {
        title: smartTitle,
        exam_type: smartExamType,
        student_id: smartStudentId || null,
        subject: smartSubject,
        chapter_codes: Array.from(selectedChapterCodes),
        total_count: smartTotalCount,
        difficulty_ratio: diffRatio,
        type_ratio: { multiple_choice: mcRatio, descriptive: 100 - mcRatio },
      });
      const { problem_count, distribution } = res.data;
      showMsg(`스마트 시험지 생성 완료! (${problem_count}문제, 하:${distribution['1']||0}/중:${distribution['2']||0}/상:${distribution['3']||0})`, true);
      setTimeout(() => navigate('/exams'), 1000);
    } catch (err) {
      showMsg(err.response?.data?.message || err.response?.data?.error || '스마트 시험지 생성 실패', false);
    }
  };

  // Difficulty slider handler: adjust others proportionally to keep sum=100
  const handleDiffRatioChange = (key, newVal) => {
    newVal = Math.max(0, Math.min(100, newVal));
    const others = ['1', '2', '3'].filter(k => k !== key);
    const remaining = 100 - newVal;
    const otherSum = others.reduce((s, k) => s + diffRatio[k], 0);
    const newRatio = { ...diffRatio, [key]: newVal };
    if (otherSum === 0) {
      newRatio[others[0]] = Math.round(remaining / 2);
      newRatio[others[1]] = remaining - newRatio[others[0]];
    } else {
      newRatio[others[0]] = Math.round((diffRatio[others[0]] / otherSum) * remaining);
      newRatio[others[1]] = remaining - newRatio[others[0]];
    }
    setDiffRatio(newRatio);
  };

  // Build curriculum tree structure from flat items
  const buildCurriculumTree = () => {
    const tree = {};
    curriculumItems.forEach(item => {
      if (!tree[item.level1]) tree[item.level1] = {};
      if (!tree[item.level1][item.level2]) tree[item.level1][item.level2] = [];
      tree[item.level1][item.level2].push(item);
    });
    return tree;
  };

  // Toggle chapter code selection
  const toggleChapterCode = (code) => {
    setSelectedChapterCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  // Select/deselect all codes under a level1
  const toggleLevel1 = (level1Name, tree) => {
    const codes = [];
    Object.values(tree[level1Name]).forEach(items => items.forEach(i => codes.push(i.chapter_code)));
    setSelectedChapterCodes(prev => {
      const next = new Set(prev);
      const allSelected = codes.every(c => next.has(c));
      codes.forEach(c => allSelected ? next.delete(c) : next.add(c));
      return next;
    });
  };

  // Select/deselect all codes under a level2
  const toggleLevel2 = (items) => {
    const codes = items.map(i => i.chapter_code);
    setSelectedChapterCodes(prev => {
      const next = new Set(prev);
      const allSelected = codes.every(c => next.has(c));
      codes.forEach(c => allSelected ? next.delete(c) : next.add(c));
      return next;
    });
  };

  // Calculate preview counts
  const calcPreview = () => {
    const total = smartTotalCount;
    const d1 = Math.round((diffRatio['1'] / 100) * total);
    const d2 = Math.round((diffRatio['2'] / 100) * total);
    const d3 = total - d1 - d2;
    const mc = Math.round((mcRatio / 100) * total);
    const desc = total - mc;
    return { d1, d2, d3, mc, desc };
  };

  const diffLabels = { 1: '하', 2: '중', 3: '상' };
  const diffColors = { 1: 'bg-green-100 text-green-700', 2: 'bg-yellow-100 text-yellow-700', 3: 'bg-red-100 text-red-700' };

  // Render curriculum tree
  const renderCurriculumTree = () => {
    const tree = buildCurriculumTree();
    return Object.entries(tree).map(([level1, level2Map]) => {
      const l1Expanded = expandedLevel1.has(level1);
      const l1Codes = [];
      Object.values(level2Map).forEach(items => items.forEach(i => l1Codes.push(i.chapter_code)));
      const l1AllSelected = l1Codes.length > 0 && l1Codes.every(c => selectedChapterCodes.has(c));
      const l1SomeSelected = l1Codes.some(c => selectedChapterCodes.has(c));

      return (
        <div key={level1} className="mb-1">
          <div className="flex items-center gap-1 py-1">
            <button onClick={() => setExpandedLevel1(prev => {
              const next = new Set(prev);
              l1Expanded ? next.delete(level1) : next.add(level1);
              return next;
            })} className="text-gray-400 hover:text-gray-700 w-5 text-center text-xs">
              {l1Expanded ? '▼' : '▶'}
            </button>
            <input type="checkbox" checked={l1AllSelected}
              ref={el => { if (el) el.indeterminate = l1SomeSelected && !l1AllSelected; }}
              onChange={() => toggleLevel1(level1, tree)}
              className="rounded border-gray-300 text-indigo-600" />
            <span className="text-sm font-medium text-gray-800 cursor-pointer"
              onClick={() => setExpandedLevel1(prev => {
                const next = new Set(prev);
                l1Expanded ? next.delete(level1) : next.add(level1);
                return next;
              })}>{level1}</span>
          </div>
          {l1Expanded && (
            <div className="ml-6">
              {Object.entries(level2Map).map(([level2, items]) => {
                const l2Key = `${level1}::${level2}`;
                const l2Expanded = expandedLevel2.has(l2Key);
                const l2AllSelected = items.every(i => selectedChapterCodes.has(i.chapter_code));
                const l2SomeSelected = items.some(i => selectedChapterCodes.has(i.chapter_code));

                return (
                  <div key={l2Key} className="mb-0.5">
                    <div className="flex items-center gap-1 py-0.5">
                      <button onClick={() => setExpandedLevel2(prev => {
                        const next = new Set(prev);
                        l2Expanded ? next.delete(l2Key) : next.add(l2Key);
                        return next;
                      })} className="text-gray-400 hover:text-gray-700 w-5 text-center text-xs">
                        {l2Expanded ? '▼' : '▶'}
                      </button>
                      <input type="checkbox" checked={l2AllSelected}
                        ref={el => { if (el) el.indeterminate = l2SomeSelected && !l2AllSelected; }}
                        onChange={() => toggleLevel2(items)}
                        className="rounded border-gray-300 text-indigo-600" />
                      <span className="text-sm text-gray-700 cursor-pointer"
                        onClick={() => setExpandedLevel2(prev => {
                          const next = new Set(prev);
                          l2Expanded ? next.delete(l2Key) : next.add(l2Key);
                          return next;
                        })}>{level2}</span>
                    </div>
                    {l2Expanded && (
                      <div className="ml-6">
                        {items.map(item => (
                          <label key={item.chapter_code} className="flex items-center gap-2 py-0.5 cursor-pointer">
                            <input type="checkbox"
                              checked={selectedChapterCodes.has(item.chapter_code)}
                              onChange={() => toggleChapterCode(item.chapter_code)}
                              className="rounded border-gray-300 text-indigo-600" />
                            <span className="text-xs text-gray-600">{item.level3 || item.chapter_code}</span>
                            <span className="text-xs text-gray-400">({item.chapter_code})</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  const preview = calcPreview();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">새 시험지 만들기</h2>

      {msg && <div className={`p-3 mb-4 rounded-lg text-white ${msg.ok ? 'bg-green-500' : 'bg-red-500'}`}>{msg.text}</div>}

      {/* Mode tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[['manual', '수동 선택'], ['auto', '자동 추천'], ['batch', '그룹 일괄'], ['smart', '스마트 출제']].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Smart mode */}
      {mode === 'smart' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl space-y-6">
          <h3 className="text-xl font-bold text-gray-800 border-b pb-2">스마트 출제 - 난이도별 맞춤 시험지</h3>
          <p className="text-sm text-gray-500">단원과 난이도 비율을 지정하면 DB에서 조건에 맞는 문제를 자동 추출합니다.</p>

          {/* Exam Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
              <input value={smartTitle} onChange={e => setSmartTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="2월 월말고사" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시험 유형</label>
              <select value={smartExamType} onChange={e => setSmartExamType(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-sm">
                <option value="monthly">월말고사</option>
                <option value="daily">일일 테스트</option>
                <option value="practice">연습 문제지</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">과목 *</label>
              <select value={smartSubject} onChange={e => setSmartSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-sm">
                <option value="">과목을 선택하세요</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학생 (선택)</label>
              <select value={smartStudentId} onChange={e => setSmartStudentId(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-sm">
                <option value="">미지정</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
              </select>
            </div>
          </div>

          {/* Chapter Tree */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              단원 선택 * ({selectedChapterCodes.size}개 선택됨)
            </label>
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
              {smartSubject ? (
                curriculumItems.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">단원 정보가 없습니다.</p>
                ) : renderCurriculumTree()
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">과목을 먼저 선택해주세요.</p>
              )}
            </div>
          </div>

          {/* Total count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">총 문제 수 *</label>
            <input type="number" value={smartTotalCount}
              onChange={e => setSmartTotalCount(Math.max(5, Math.min(50, +e.target.value)))}
              min="5" max="50"
              className="w-32 border border-gray-300 rounded-md p-2 text-sm" />
          </div>

          {/* Difficulty Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">난이도 비율 (합계 100%)</label>
            <div className="space-y-3">
              {[
                { key: '1', label: '하 (쉬움)', color: 'accent-green-500' },
                { key: '2', label: '중 (보통)', color: 'accent-yellow-500' },
                { key: '3', label: '상 (어려움)', color: 'accent-red-500' },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-24">{label}</span>
                  <input type="range" min="0" max="100" value={diffRatio[key]}
                    onChange={e => handleDiffRatioChange(key, +e.target.value)}
                    className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${color}`} />
                  <span className="text-sm font-medium w-12 text-right">{diffRatio[key]}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Type Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              유형 비율 (객관식 {mcRatio}% / 서술형 {100 - mcRatio}%)
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">서술형</span>
              <input type="range" min="0" max="100" value={mcRatio}
                onChange={e => setMcRatio(+e.target.value)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              <span className="text-xs text-gray-500">객관식</span>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-indigo-800 mb-2">미리보기</h4>
            <div className="text-sm text-indigo-700">
              <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium mr-1">
                하 {preview.d1}문제
              </span>
              <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium mr-1">
                중 {preview.d2}문제
              </span>
              <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium mr-1">
                상 {preview.d3}문제
              </span>
              <span className="text-indigo-800 font-bold ml-1">= 총 {smartTotalCount}문제</span>
            </div>
            <div className="text-sm text-indigo-600 mt-1">
              객관식 {preview.mc}문제 / 서술형 {preview.desc}문제
            </div>
          </div>

          {/* Generate Button */}
          <button onClick={handleSmartCreate}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
            disabled={!smartTitle.trim() || !smartSubject || selectedChapterCodes.size === 0}>
            스마트 시험지 생성
          </button>
        </div>
      )}

      {/* Auto mode */}
      {mode === 'auto' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-lg space-y-4">
          <h3 className="font-bold text-gray-700 border-b pb-2">자동 추천 시험지</h3>
          <p className="text-sm text-gray-500">학생의 과목/난이도에 맞는 승인된 문제를 자동으로 선별합니다.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">제목 *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm" placeholder="2월 월말고사" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">유형</label>
              <select value={examType} onChange={e => setExamType(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm">
                <option value="monthly">월말고사</option>
                <option value="daily">일일 테스트</option>
                <option value="practice">연습 문제지</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">학생 *</label>
              <select value={studentId} onChange={e => setStudentId(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm">
                <option value="">학생 선택</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade} - {s.subject})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">문제 수</label>
              <input type="number" value={autoCount} onChange={e => setAutoCount(+e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm" min="1" max="50" />
            </div>
          </div>
          <button onClick={handleAutoCreate}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">
            자동 시험지 생성
          </button>
        </div>
      )}

      {/* Batch mode */}
      {mode === 'batch' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-lg space-y-4">
          <h3 className="font-bold text-gray-700 border-b pb-2">그룹 일괄 생성</h3>
          <p className="text-sm text-gray-500">같은 그룹의 모든 학생에게 개별 맞춤 시험지를 한번에 생성합니다.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">제목 접두사 *</label>
              <input value={batchPrefix} onChange={e => setBatchPrefix(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm" placeholder="2월 월말고사" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">유형</label>
              <select value={examType} onChange={e => setExamType(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm">
                <option value="monthly">월말고사</option>
                <option value="daily">일일 테스트</option>
                <option value="practice">연습 문제지</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">그룹 *</label>
              <select value={batchGroup} onChange={e => setBatchGroup(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm">
                <option value="">그룹 선택</option>
                {groups.map(g => <option key={g} value={g}>{g} ({students.filter(s => s.group_name === g).length}명)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">문제 수 (1인당)</label>
              <input type="number" value={autoCount} onChange={e => setAutoCount(+e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm" min="1" max="50" />
            </div>
          </div>
          {batchGroup && (
            <div className="bg-gray-50 rounded p-3 text-sm">
              <div className="font-medium mb-1">대상 학생:</div>
              {students.filter(s => s.group_name === batchGroup).map(s => (
                <span key={s.id} className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs mr-1 mb-1">
                  {s.name} ({s.grade})
                </span>
              ))}
            </div>
          )}
          <button onClick={handleBatchCreate}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">
            일괄 시험지 생성
          </button>
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && <div className="grid grid-cols-3 gap-6">
        {/* Left: Settings + Problem selection */}
        <div className="col-span-2 space-y-4">
          {/* Exam info */}
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="font-bold text-gray-700 border-b pb-2">시험지 정보</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">제목 *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm" placeholder="2월 월말고사" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">유형</label>
                <select value={examType} onChange={e => setExamType(e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm">
                  <option value="monthly">월말고사</option>
                  <option value="daily">일일 테스트</option>
                  <option value="practice">연습 문제지</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">학생</label>
                <select value={studentId} onChange={e => setStudentId(e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm">
                  <option value="">미지정 (공통)</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Problem filter */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-700 border-b pb-2 mb-3">문제 선택</h3>
            <div className="flex gap-3 mb-3">
              <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm">
                <option value="">전체 과목</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm">
                <option value="">전체 난이도</option>
                <option value="1">하</option>
                <option value="2">중</option>
                <option value="3">상</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm">
                <option value="">전체 상태</option>
                <option value="approved">승인됨</option>
                <option value="draft">초안</option>
              </select>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">과목</th>
                    <th className="px-3 py-2">단원</th>
                    <th className="px-3 py-2">난이도</th>
                    <th className="px-3 py-2">유형</th>
                    <th className="px-3 py-2">문제 (미리보기)</th>
                  </tr>
                </thead>
                <tbody>
                  {allProblems.length === 0 ? (
                    <tr><td colSpan="7" className="px-3 py-6 text-center text-gray-400">문제가 없습니다</td></tr>
                  ) : allProblems.map(p => {
                    const isSelected = selected.some(s => s.problem_id === p.id);
                    return (
                      <tr key={p.id} className={`border-t ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-3 py-2">
                          <button onClick={() => isSelected ? removeProblem(p.id) : addProblem(p)}
                            className={`w-6 h-6 rounded text-xs font-bold ${isSelected ? 'bg-indigo-600 text-white' : 'border border-gray-300 text-gray-400 hover:border-indigo-500'}`}>
                            {isSelected ? '-' : '+'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-gray-500">#{p.id}</td>
                        <td className="px-3 py-2">{p.subject}</td>
                        <td className="px-3 py-2 text-gray-500">{p.chapter_code}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${diffColors[p.difficulty] || ''}`}>
                            {diffLabels[p.difficulty] || p.difficulty}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">{p.type === 'multiple_choice' ? '객관식' : '서술형'}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{p.question?.slice(0, 60)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Selected problems */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4 sticky top-4">
            <h3 className="font-bold text-gray-700 border-b pb-2 mb-3">
              선택된 문제 ({selected.length}개) - 총 {totalPoints}점
            </h3>

            {selected.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">왼쪽에서 문제를 추가하세요</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selected.map((s, i) => (
                  <div key={s.problem_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveProblem(i, -1)} className="text-gray-400 hover:text-gray-700 text-xs leading-none">&uarr;</button>
                      <button onClick={() => moveProblem(i, 1)} className="text-gray-400 hover:text-gray-700 text-xs leading-none">&darr;</button>
                    </div>
                    <span className="font-bold text-gray-500 w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">#{s.problem_id} {s.problem.subject} {s.problem.chapter_code}</div>
                      <div className="truncate text-gray-700">{s.problem.question?.slice(0, 40)}</div>
                    </div>
                    <input type="number" value={s.points} onChange={e => updatePoints(s.problem_id, e.target.value)}
                      className="w-12 border rounded px-1 py-0.5 text-center text-xs" min="1" />
                    <span className="text-xs text-gray-400">점</span>
                    <button onClick={() => removeProblem(s.problem_id)}
                      className="text-red-500 hover:text-red-700 font-bold text-xs">X</button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleCreate}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
              disabled={selected.length === 0 || !title.trim()}>
              시험지 생성하기
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}
