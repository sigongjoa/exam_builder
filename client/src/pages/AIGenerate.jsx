import React, { useState, useEffect } from 'react';
import axios from 'axios';
import katex from 'katex';
import 'katex/dist/katex.min.css'; // KaTeX CSS

const API_BASE_URL = '/api';

export default function AIGenerate() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapterCode, setSelectedChapterCode] = useState('');
  const [selectedChapterName, setSelectedChapterName] = useState('');
  const [problemType, setProblemType] = useState('multiple_choice'); // 'multiple_choice' or 'descriptive'
  const [difficulty, setDifficulty] = useState(2); // 1 (하), 2 (중), 3 (상)
  const [count, setCount] = useState(1); // Number of problems to generate
  const [generatedProblems, setGeneratedProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0); // For progress bar

  // Fetch subjects on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Fetch chapters when selectedSubject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchChapters(selectedSubject);
    } else {
      setChapters([]);
      setSelectedChapterCode('');
      setSelectedChapterName('');
    }
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/curriculum/subjects`);
      setSubjects(response.data);
      if (response.data.length > 0) {
        setSelectedSubject(response.data[0]); // Auto-select first subject
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('과목 목록을 불러오는데 실패했습니다.');
    }
  };

  const fetchChapters = async (subject) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/curriculum?subject=${subject}`);
      // Group chapters by chapter_code for selection (e.g., "1-1. 자연수의 성질")
      const groupedChapters = {};
      response.data.forEach(chap => {
        const fullChapterCode = `${chap.chapter_code}. ${chap.level1} > ${chap.level2} > ${chap.level3}`;
        if (!groupedChapters[chap.chapter_code]) {
          groupedChapters[chap.chapter_code] = {
            code: chap.chapter_code,
            name: `${chap.level1} > ${chap.level2} > ${chap.level3}`
          };
        }
      });
      setChapters(Object.values(groupedChapters));
      if (Object.values(groupedChapters).length > 0) {
        // Auto-select first chapter, update both code and name
        setSelectedChapterCode(Object.values(groupedChapters)[0].code);
        setSelectedChapterName(Object.values(groupedChapters)[0].name);
      } else {
        setSelectedChapterCode('');
        setSelectedChapterName('');
      }
    } catch (err) {
      console.error('Error fetching chapters:', err);
      setError('단원 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleChapterChange = (e) => {
    const code = e.target.value;
    setSelectedChapterCode(code);
    const chapter = chapters.find(c => c.code === code);
    if (chapter) {
      setSelectedChapterName(chapter.name);
    } else {
      setSelectedChapterName('');
    }
  };


  const generateProblems = async () => {
    setIsLoading(true);
    setError('');
    setGeneratedProblems([]);
    setGenerationProgress(0);

    if (!selectedSubject || !selectedChapterCode || !selectedChapterName) {
      setError('과목과 단원을 선택해주세요.');
      setIsLoading(false);
      return;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/generate`, {
            subject: selectedSubject,
            chapter_code: selectedChapterCode,
            chapter_name: selectedChapterName,
            pattern_name: null, // Not used in current prompt, but can be added later
            difficulty: parseInt(difficulty),
            type: problemType,
            count: parseInt(count),
        });

        const problemIds = response.data.problemIds;
        const fetchedProblems = [];
        for (let i = 0; i < problemIds.length; i++) {
            const problemId = problemIds[i];
            const problemResponse = await axios.get(`${API_BASE_URL}/problems/${problemId}`);
            fetchedProblems.push(problemResponse.data);
            setGenerationProgress(((i + 1) / problemIds.length) * 100);
        }
        setGeneratedProblems(fetchedProblems);

    } catch (err) {
        console.error('문제 생성 실패:', err.response?.data || err.message);
        setError(`문제 생성 실패: ${err.response?.data?.message || err.message}`);
    } finally {
        setIsLoading(false);
        setGenerationProgress(0);
    }
  };

  const handleApprove = async (problemId) => {
    try {
      await axios.put(`${API_BASE_URL}/problems/${problemId}/status`, { status: 'approved' });
      alert('문제가 승인되었습니다!');
      setGeneratedProblems(prev => prev.map(p => p.id === problemId ? { ...p, status: 'approved' } : p));
    } catch (err) {
      console.error('문제 승인 실패:', err.response?.data || err.message);
      alert(`문제 승인 실패: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (problemId) => {
    if (window.confirm('정말로 이 문제를 삭제하시겠습니까?')) {
      try {
        await axios.delete(`${API_BASE_URL}/problems/${problemId}`);
        alert('문제가 삭제되었습니다!');
        setGeneratedProblems(prev => prev.filter(p => p.id !== problemId));
      } catch (err) {
        console.error('문제 삭제 실패:', err.response?.data || err.message);
        alert(`문제 삭제 실패: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Function to render KaTeX
  const renderKaTeX = (text) => {
    if (!text) return '';
    // Use a simple regex to find and render math expressions
    // This example assumes inline math is \\( ... \\) and display math is \\[ ... \\] or $$ ... $$
    // More robust parsing might be needed for complex cases
    return text.split(/(\\\(.+?\\\)|\\\[.+?\\\]|\$\$.+?\$\$)/g).map((part, index) => {
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        try {
          return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2, -2), { throwOnError: false }) }} />;
        } catch (e) {
          console.warn("KaTeX rendering error for inline math:", part, e);
          return <span key={index}>{part}</span>;
        }
      } else if ((part.startsWith('\\[') && part.endsWith('\\]')) || (part.startsWith('$$') && part.endsWith('$$'))) {
        try {
          return <div key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false }) }} />;
        } catch (e) {
          console.warn("KaTeX rendering error for display math:", part, e);
          return <div key={index}>{part}</div>;
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-8">AI 문제 생성</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Panel: Generation Settings Form */}
        <div className="lg:w-1/3 p-6 bg-white rounded-xl shadow-lg h-fit sticky top-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-5">생성 설정</h3>
          <form onSubmit={(e) => { e.preventDefault(); generateProblems(); }} className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">과목</label>
              <select
                id="subject"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">과목 선택</option>
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="chapter" className="block text-sm font-medium text-gray-700">단원</label>
              <select
                id="chapter"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                value={selectedChapterCode}
                onChange={handleChapterChange}
                disabled={!selectedSubject || chapters.length === 0}
              >
                <option value="">단원 선택</option>
                {chapters.map(chap => (
                  <option key={chap.code} value={chap.code}>
                    {chap.code}. {chap.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">문제 유형</label>
              <div className="mt-1 flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-indigo-600"
                    name="problemType"
                    value="multiple_choice"
                    checked={problemType === 'multiple_choice'}
                    onChange={(e) => setProblemType(e.target.value)}
                  />
                  <span className="ml-2 text-gray-700">객관식</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-indigo-600"
                    name="problemType"
                    value="descriptive"
                    checked={problemType === 'descriptive'}
                    onChange={(e) => setProblemType(e.target.value)}
                  />
                  <span className="ml-2 text-gray-700">서술형</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">난이도</label>
              <select
                id="difficulty"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
              >
                <option value={1}>1 (하)</option>
                <option value={2}>2 (중)</option>
                <option value={3}>3 (상)</option>
              </select>
            </div>

            <div>
              <label htmlFor="count" className="block text-sm font-medium text-gray-700">생성 수량</label>
              <input
                type="number"
                id="count"
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(5, parseInt(e.target.value))))} // Limit 1-5
                min="1"
                max="5"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading || !selectedSubject || !selectedChapterCode}
            >
              {isLoading ? '생성 중...' : '문제 생성하기'}
            </button>
          </form>

          {isLoading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">{Math.round(generationProgress)}% 완료</p>
            </div>
          )}
        </div>

        {/* Right Panel: Generated Problems Preview */}
        <div className="lg:w-2/3">
          <h3 className="text-xl font-semibold text-gray-800 mb-5">생성 결과 미리보기</h3>
          {generatedProblems.length === 0 && !isLoading && (
            <p className="text-gray-500">생성된 문제가 없습니다. 왼쪽 설정으로 문제를 생성해보세요.</p>
          )}
          <div className="space-y-6">
            {generatedProblems.map((problem, index) => (
              <div key={problem.id || `temp-${index}`} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-gray-800">문제 {index + 1}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold
                    ${problem.status === 'approved' ? 'bg-green-100 text-green-800' :
                      problem.status === 'draft' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'}`}>
                    {problem.status === 'approved' ? '승인됨' : '초안'}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="font-medium text-gray-700 mb-2">질문:</p>
                  <div className="text-gray-900 leading-relaxed text-base">
                    {renderKaTeX(problem.question)}
                  </div>
                </div>

                {problem.type === 'multiple_choice' && problem.choices && (
                  <div className="mb-4">
                    <p className="font-medium text-gray-700 mb-2">보기:</p>
                    <ul className="list-decimal list-inside space-y-1">
                      {problem.choices.map((choice, i) => (
                        <li key={i} className="text-gray-800 text-base">
                          {renderKaTeX(choice)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mb-4">
                  <p className="font-medium text-gray-700 mb-2">정답:</p>
                  <div className="text-gray-900 leading-relaxed text-base">
                    {renderKaTeX(problem.answer)}
                  </div>
                </div>

                <div className="mb-6">
                  <p className="font-medium text-gray-700 mb-2">풀이:</p>
                  <div className="text-gray-900 leading-relaxed text-base">
                    {problem.type === 'descriptive' && problem.solution_steps && Array.isArray(problem.solution_steps) ? (
                        <ol className="list-decimal list-inside space-y-1">
                            {problem.solution_steps.map((step, i) => (
                                <li key={i}>{renderKaTeX(step)}</li>
                            ))}
                        </ol>
                    ) : (
                        renderKaTeX(problem.solution)
                    )}
                  </div>
                </div>


                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApprove(problem.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium"
                    disabled={problem.status === 'approved'}
                  >
                    승인
                  </button>
                  {/* TODO: Implement actual editing. For now, this is a placeholder */}
                  <button
                    // onClick={() => navigate(`/editor/${problem.id}`)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium"
                    disabled
                  >
                    수정 (구현 예정)
                  </button>
                  <button
                    onClick={() => handleDelete(problem.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}