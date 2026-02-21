import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const MIDDLE_SUBJECTS = ['중1수학', '중2수학', '중3수학'];
const HIGH_SUBJECTS = ['공통수학1', '공통수학2', '대수', '미적분I', '확률과통계', '미적분II', '기하'];

export default function ExamCreate() {
  const navigate = useNavigate();

  // Basic States
  const [gradeTab, setGradeTab] = useState('middle'); // 'middle' | 'high'
  const [selectedSubject, setSelectedSubject] = useState('');
  const [curriculumItems, setCurriculumItems] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [expandedL1, setExpandedL1] = useState(new Set());

  // Form States
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState('monthly');
  const [studentId, setStudentId] = useState('');
  const [students, setStudents] = useState([]);
  const [problemCount, setProblemCount] = useState(20);

  // Difficulty & Type States
  const [diffPreset, setDiffPreset] = useState('basic'); // 'easy' | 'basic' | 'hard' | 'custom'
  const [diffRatio, setDiffRatio] = useState({ 1: 30, 2: 50, 3: 20 }); // 1:하, 2:중, 3:상
  const [showCustomDiff, setShowCustomDiff] = useState(false);
  const [typePreset, setTypePreset] = useState('mixed'); // 'mixed' | 'mc' | 'desc'

  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Initial load
  useEffect(() => {
    const fetchStudents = async () => {
        try {
            const res = await axios.get('/api/students');
            setStudents(res.data);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };
    fetchStudents();
  }, []);

  // Subject change -> fetch curriculum
  useEffect(() => {
    if (selectedSubject) {
      const fetchCurriculum = async () => {
        try {
          const res = await axios.get(`/api/curriculum?subject=${encodeURIComponent(selectedSubject)}`);
          setCurriculumItems(res.data);
          setSelectedCodes(new Set());
          setExpandedL1(new Set());
        } catch (err) {
          console.error('Error fetching curriculum:', err);
          setCurriculumItems([]);
        }
      };
      fetchCurriculum();
    } else {
      setCurriculumItems([]);
      setSelectedCodes(new Set());
    }
  }, [selectedSubject]);

  // Difficulty Preset sync
  useEffect(() => {
    if (diffPreset === 'easy') setDiffRatio({ 1: 50, 2: 40, 3: 10 });
    else if (diffPreset === 'basic') setDiffRatio({ 1: 30, 2: 50, 3: 20 });
    else if (diffPreset === 'hard') setDiffRatio({ 1: 10, 2: 40, 3: 50 });
  }, [diffPreset]);

  // Handlers
  const toggleL1 = (l1) => {
    setExpandedL1(prev => {
      const next = new Set(prev);
      if (next.has(l1)) next.delete(l1); else next.add(l1);
      return next;
    });
  };

  const selectAllInL1 = (l1) => {
    const codesInL1 = curriculumItems
      .filter(item => item.level1 === l1)
      .map(item => item.chapter_code);
    
    setSelectedCodes(prev => {
      const next = new Set(prev);
      const allSelected = codesInL1.every(c => next.has(c));
      if (allSelected) {
        codesInL1.forEach(c => next.delete(c));
      } else {
        codesInL1.forEach(c => next.add(c));
      }
      return next;
    });
  };

  const toggleCode = (code) => {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const getSelectedNames = () => {
    return curriculumItems
      .filter(item => selectedCodes.has(item.chapter_code))
      .map(item => item.level3 || item.chapter_code);
  };

  const getTypeRatio = () => {
    if (typePreset === 'mc') return { multiple_choice: 100, descriptive: 0 };
    if (typePreset === 'desc') return { multiple_choice: 0, descriptive: 100 };
    return { multiple_choice: 70, descriptive: 30 };
  };

  const showMsg = (text, ok) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleCreate = async () => {
    if (selectedCodes.size === 0) {
        showMsg('최소 1개 이상의 단원을 선택해야 합니다.', false);
        return;
    }
    if (!title.trim()) { 
        showMsg('시험지 제목을 입력하세요.', false); 
        return; 
    }
    
    const diffSum = Object.values(diffRatio).reduce((a, b) => a + (parseInt(b) || 0), 0);
    if (diffSum !== 100) { 
        showMsg('난이도 합계가 100%여야 합니다.', false); 
        return; 
    }

    setIsLoading(true);
    try {
      const payload = {
        title,
        exam_type: examType,
        student_id: studentId ? parseInt(studentId) : null,
        subject: selectedSubject,
        chapter_codes: Array.from(selectedCodes),
        total_count: problemCount,
        difficulty_ratio: diffRatio,
        type_ratio: getTypeRatio()
      };
      
      const res = await axios.post('/api/exams/smart', payload);
      showMsg('시험지가 성공적으로 생성되었습니다.', true);
      setTimeout(() => navigate('/exams'), 1000);
    } catch (err) {
      console.error('Error generating exam:', err);
      showMsg(err.response?.data?.error || '생성 중 오류가 발생했습니다.', false);
    } finally {
      setIsLoading(false);
    }
  };

  // Grouping curriculum items
  const groupedItems = curriculumItems.reduce((acc, item) => {
    if (!acc[item.level1]) acc[item.level1] = {};
    if (!acc[item.level1][item.level2]) acc[item.level1][item.level2] = [];
    acc[item.level1][item.level2].push(item);
    return acc;
  }, {});

  const diffSum = Object.values(diffRatio).reduce((a, b) => a + (parseInt(b) || 0), 0);

  return (
    <div className='flex h-screen bg-gray-50 overflow-hidden'>
      {/* 왼쪽 60%: 단원 선택 패널 */}
      <div className='w-[60%] flex flex-col p-8 overflow-hidden'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-2xl font-bold text-gray-800'>단원 선택</h1>
          <div className='flex bg-gray-200 p-1 rounded-lg'>
            <button 
              onClick={() => { setGradeTab('middle'); setSelectedSubject(''); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${gradeTab === 'middle' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
            >
              중등
            </button>
            <button 
              onClick={() => { setGradeTab('high'); setSelectedSubject(''); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${gradeTab === 'high' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
            >
              고등
            </button>
          </div>
        </div>

        {/* 과목 버튼 그리드 */}
        <div className='grid grid-cols-4 gap-2 mb-8'>
          {(gradeTab === 'middle' ? MIDDLE_SUBJECTS : HIGH_SUBJECTS).map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${selectedSubject === sub ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'}`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* 단원 트리 */}
        <div className='flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-6'>
          {!selectedSubject ? (
            <div className='h-full flex flex-col items-center justify-center text-gray-400'>
              <div className='mb-2 text-4xl'>📚</div>
              <p>과목을 선택하면 단원 목록이 표시됩니다.</p>
            </div>
          ) : curriculumItems.length === 0 ? (
            <div className='h-full flex items-center justify-center text-gray-400'>
              데이터를 불러오는 중이거나 목록이 비어있습니다.
            </div>
          ) : (
            <div className='space-y-4'>
              {Object.entries(groupedItems).map(([l1, l2Group]) => {
                const isExpanded = expandedL1.has(l1);
                const l1Codes = curriculumItems.filter(i => i.level1 === l1).map(i => i.chapter_code);
                const isAllSelected = l1Codes.every(c => selectedCodes.has(c));

                return (
                  <div key={l1} className='border border-gray-100 rounded-lg overflow-hidden'>
                    <div className={`flex items-center justify-between p-3 transition-colors ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}>
                      <div className='flex items-center gap-3'>
                        <button 
                          onClick={() => toggleL1(l1)}
                          className='w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-transform'
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                          ▶
                        </button>
                        <span className='font-bold text-gray-800'>{l1}</span>
                      </div>
                      <button 
                        onClick={() => selectAllInL1(l1)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${isAllSelected ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {isAllSelected ? '전체 해제' : '대단원 전체 선택'}
                      </button>
                    </div>
                    
                    {isExpanded && (
                      <div className='p-4 pt-0 space-y-4 bg-gray-50/30'>
                        {Object.entries(l2Group).map(([l2, items]) => (
                          <div key={l2} className='ml-4'>
                            <div className='text-sm font-semibold text-gray-600 mb-2'>• {l2}</div>
                            <div className='grid grid-cols-2 gap-2 ml-4'>
                              {items.map(item => (
                                <label key={item.chapter_code} className='flex items-center gap-2 cursor-pointer group'>
                                  <input 
                                    type='checkbox'
                                    checked={selectedCodes.has(item.chapter_code)}
                                    onChange={() => toggleCode(item.chapter_code)}
                                    className='w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
                                  />
                                  <span className={`text-sm transition-colors ${selectedCodes.has(item.chapter_code) ? 'text-indigo-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                    {item.level3 || item.chapter_code}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 선택된 단원 칩 */}
        <div className='mt-6'>
          <div className='text-sm font-semibold text-gray-500 mb-2'>선택된 단원 ({selectedCodes.size})</div>
          <div className='flex flex-wrap gap-2 max-h-24 overflow-y-auto'>
            {getSelectedNames().map((name, idx) => (
              <span key={idx} className='inline-flex items-center bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full border border-indigo-100'>
                {name}
              </span>
            ))}
            {selectedCodes.size === 0 && <span className='text-xs text-gray-400'>선택된 단원이 없습니다.</span>}
          </div>
        </div>
      </div>

      {/* 오른쪽 40%: 설정 패널 */}
      <div className='w-[40%] bg-white border-l border-gray-200 flex flex-col overflow-y-auto'>
        <div className='p-8 space-y-8'>
          {/* 인디케이터 */}
          <div className='flex items-center justify-between px-2'>
            {[
              { n: 1, label: '단원선택', active: selectedCodes.size > 0 },
              { n: 2, label: '출제옵션', active: title && selectedCodes.size > 0 },
              { n: 3, label: '생성', active: isLoading }
            ].map((step, i) => (
              <div key={step.n} className='flex items-center flex-1 last:flex-none'>
                <div className='flex flex-col items-center gap-1'>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step.active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {step.n}
                  </div>
                  <span className={`text-[10px] font-bold ${step.active ? 'text-indigo-600' : 'text-gray-400'}`}>{step.label}</span>
                </div>
                {i < 2 && <div className={`h-[2px] flex-1 mx-2 mb-4 ${step.active ? 'bg-indigo-600' : 'bg-gray-100'}`} />}
              </div>
            ))}
          </div>

          <div className='space-y-6'>
            {/* 기본 정보 */}
            <div>
              <label className='block text-sm font-bold text-gray-700 mb-2'>시험지 제목</label>
              <input 
                type='text' 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='예: 3월 대비 중간고사 실전'
                className='w-full border-gray-300 border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-bold text-gray-700 mb-2'>대상 학생</label>
                <select 
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className='w-full border-gray-300 border p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500'
                >
                  <option value=''>학생 선택 (전체 공통)</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-bold text-gray-700 mb-2'>시험 유형</label>
                <select 
                  value={examType}
                  onChange={e => setExamType(e.target.value)}
                  className='w-full border-gray-300 border p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500'
                >
                  <option value='monthly'>월말 평가</option>
                  <option value='daily'>일일 테스트</option>
                  <option value='curriculum'>단원 평가</option>
                  <option value='mock'>모의고사</option>
                </select>
              </div>
            </div>

            {/* 문제수 슬라이더 */}
            <div>
              <div className='flex justify-between items-center mb-4'>
                <label className='text-sm font-bold text-gray-700'>문제 구성 (총 문제 수)</label>
                <span className='text-xl font-extrabold text-indigo-600'>{problemCount}</span>
              </div>
              <input
                type='range' min='5' max='30' step='1'
                value={problemCount}
                onChange={e => setProblemCount(parseInt(e.target.value))}
                className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600'
              />
              <div className='flex justify-between mt-2 px-1'>
                {[5, 10, 20, 30, 40].map(v => (
                  <span key={v} className={`text-[10px] ${problemCount === v ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>{v}</span>
                ))}
              </div>
            </div>

            {/* 난이도 설정 */}
            <div>
              <label className='block text-sm font-bold text-gray-700 mb-3'>시험 난이도</label>
              <div className='grid grid-cols-3 gap-2 mb-4'>
                {[
                  { id: 'easy', label: '쉽게' },
                  { id: 'basic', label: '기본' },
                  { id: 'hard', label: '어렵게' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDiffPreset(p.id)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${diffPreset === p.id ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => { setShowCustomDiff(!showCustomDiff); setDiffPreset('custom'); }}
                className='text-xs text-gray-400 hover:text-indigo-500 transition-colors flex items-center gap-1 mb-4'
              >
                {showCustomDiff ? '▲ 상세 설정 닫기' : '▼ 상세 난이도 조절'}
              </button>

              {showCustomDiff && (
                <div className='bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4'>
                  <div className='grid grid-cols-3 gap-4'>
                    <div>
                      <label className='block text-[10px] font-bold text-gray-500 mb-1 text-center'>하 (Easy)</label>
                      <div className='relative'>
                        <input 
                          type='number' value={diffRatio[1]} 
                          onChange={e => setDiffRatio({ ...diffRatio, 1: parseInt(e.target.value) || 0 })}
                          className='w-full border-gray-200 border p-2 rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-indigo-500'
                        />
                        <span className='absolute right-2 top-2.5 text-xs text-gray-400'>%</span>
                      </div>
                    </div>
                    <div>
                      <label className='block text-[10px] font-bold text-gray-500 mb-1 text-center'>중 (Normal)</label>
                      <div className='relative'>
                        <input 
                          type='number' value={diffRatio[2]} 
                          onChange={e => setDiffRatio({ ...diffRatio, 2: parseInt(e.target.value) || 0 })}
                          className='w-full border-gray-200 border p-2 rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-indigo-500'
                        />
                        <span className='absolute right-2 top-2.5 text-xs text-gray-400'>%</span>
                      </div>
                    </div>
                    <div>
                      <label className='block text-[10px] font-bold text-gray-500 mb-1 text-center'>상 (Hard)</label>
                      <div className='relative'>
                        <input 
                          type='number' value={diffRatio[3]} 
                          onChange={e => setDiffRatio({ ...diffRatio, 3: parseInt(e.target.value) || 0 })}
                          className='w-full border-gray-200 border p-2 rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-indigo-500'
                        />
                        <span className='absolute right-2 top-2.5 text-xs text-gray-400'>%</span>
                      </div>
                    </div>
                  </div>
                  <div className='flex justify-between items-center px-1'>
                    <div className='text-xs text-gray-500'>합계: <span className={`font-bold ${diffSum === 100 ? 'text-green-600' : 'text-red-500'}`}>{diffSum}%</span></div>
                    {diffSum !== 100 && <div className='text-[10px] text-red-400 font-medium'>합계가 100이 되어야 합니다.</div>}
                  </div>
                </div>
              )}
            </div>

            {/* 문제 형식 설정 */}
            <div>
              <label className='block text-sm font-bold text-gray-700 mb-3'>문제 형식</label>
              <div className='grid grid-cols-3 gap-2'>
                {[
                  { id: 'mc', label: '객관식만' },
                  { id: 'desc', label: '서술형만' },
                  { id: 'mixed', label: '혼합(기본)' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setTypePreset(p.id)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${typePreset === p.id ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className='text-[10px] text-gray-400 mt-2 px-1'>
                {typePreset === 'mixed' && '* 객관식 70% / 서술형 30% 비율로 출제됩니다.'}
                {typePreset === 'mc' && '* 모든 문제가 객관식으로 출제됩니다.'}
                {typePreset === 'desc' && '* 모든 문제가 서술형으로 출제됩니다.'}
              </p>
            </div>

            {/* 메시지 표시 */}
            {msg && (
              <div className={`p-4 rounded-xl text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {msg.text}
              </div>
            )}

            {/* 생성 버튼 */}
            <button
              onClick={handleCreate}
              disabled={selectedCodes.size === 0 || isLoading || diffSum !== 100}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${selectedCodes.size === 0 || isLoading || diffSum !== 100 ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-[0.98]'}`}
            >
              {isLoading ? (
                <div className='flex items-center justify-center gap-2'>
                  <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  <span>시험지 생성 중...</span>
                </div>
              ) : '시험지 생성하기'}
            </button>
            
            {selectedCodes.size === 0 && (
              <p className='text-center text-xs text-red-400 font-medium'>* 최소 1개 이상의 단원을 선택해야 합니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
