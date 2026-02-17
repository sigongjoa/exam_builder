import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ExamCreate() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [msg, setMsg] = useState(null);
  const [mode, setMode] = useState('manual'); // 'manual' | 'auto' | 'batch'
  const [autoCount, setAutoCount] = useState(20);
  const [batchGroup, setBatchGroup] = useState('');
  const [batchPrefix, setBatchPrefix] = useState('');
  const [groups, setGroups] = useState([]);

  // Exam form
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState('monthly');
  const [studentId, setStudentId] = useState('');

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

  const fetchProblems = () => {
    const params = new URLSearchParams();
    if (filterSubject) params.set('subject', filterSubject);
    if (filterDifficulty) params.set('difficulty', filterDifficulty);
    if (filterStatus) params.set('status', filterStatus);
    axios.get(`/api/problems?${params}`).then(r => setAllProblems(r.data));
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
      const res = await axios.post('/api/exams', {
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

  const diffLabels = { 1: '하', 2: '중', 3: '상' };
  const diffColors = { 1: 'bg-green-100 text-green-700', 2: 'bg-yellow-100 text-yellow-700', 3: 'bg-red-100 text-red-700' };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">새 시험지 만들기</h2>

      {msg && <div className={`p-3 mb-4 rounded-lg text-white ${msg.ok ? 'bg-green-500' : 'bg-red-500'}`}>{msg.text}</div>}

      {/* Mode tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[['manual', '수동 선택'], ['auto', '자동 추천'], ['batch', '그룹 일괄']].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

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
