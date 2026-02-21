import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const API_BASE_URL = '/api';

// ─── KaTeX 렌더링 헬퍼 ────────────────────────────────────────────────────────
function renderKaTeX(text) {
  if (!text) return null;
  return text.split(/(\\\(.+?\\\)|\\\[[\s\S]+?\\\]|\$\$.+?\$\$|\$[^\$\n]+?\$)/gs).map((part, i) => {
    if (part.startsWith('\\(') && part.endsWith('\\)')) {
      return <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2, -2), { throwOnError: false }) }} />;
    }
    if ((part.startsWith('\\[') && part.endsWith('\\]')) || (part.startsWith('$$') && part.endsWith('$$'))) {
      return <div key={i} className="my-2" dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false }) }} />;
    }
    else if (part.startsWith('$') && part.endsWith('$') && !part.startsWith('$$')) {
      return <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(1, -1), { throwOnError: false }) }} />;
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── 개념 칩 컴포넌트 ─────────────────────────────────────────────────────────
function ConceptChip({ concept, onRemove }) {
  const colorMap = {
    ai: 'bg-amber-100 text-amber-800 border-amber-300',
    manual: 'bg-blue-100 text-blue-800 border-blue-300',
    confirmed: 'bg-green-100 text-green-800 border-green-300',
  };
  const color = colorMap[concept.source] || colorMap.manual;
  const label = { ai: 'AI', manual: '직접', confirmed: '확인' }[concept.source] || '직접';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      <span className="opacity-60">[{label}]</span>
      {concept.name}
      <button
        onClick={() => onRemove(concept.id)}
        className="ml-1 opacity-50 hover:opacity-100 font-bold leading-none"
      >
        ×
      </button>
    </span>
  );
}

// ─── 문제 목록 카드 ───────────────────────────────────────────────────────────
function ProblemCard({ problem, isSelected, onClick }) {
  const tagCount = problem.concept_count || 0;
  const diffLabel = ['', '하', '중', '상'][problem.difficulty] || '?';
  const diffColor = ['', 'text-green-600', 'text-yellow-600', 'text-red-600'][problem.difficulty] || 'text-gray-500';

  return (
    <div
      onClick={onClick}
      className={`p-3 border-b cursor-pointer transition-colors ${
        isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">#{problem.id}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${diffColor}`}>{diffLabel}</span>
          {tagCount > 0 ? (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{tagCount}개 태깅</span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">미태깅</span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
        {problem.question?.replace(/\$[^\$\n]+?\$|\$\$.+?\$\$|\\\(.+?\\\)|\\\[.+?\\\]/gs, '').slice(0, 80)}...
      </p>
      {problem.chapter_code && (
        <span className="text-xs text-indigo-500 mt-1 inline-block">{problem.chapter_code}</span>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function ConceptTagger() {
  // 문제 목록 상태
  const [problems, setProblems] = useState([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('untagged'); // all | untagged | tagged
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // 태깅 상태
  const [taggedConcepts, setTaggedConcepts] = useState([]); // 현재 문제에 태깅된 개념들
  const [conceptPool, setConceptPool] = useState([]);       // 전체 원자 개념 풀
  const [poolSearch, setPoolSearch] = useState('');
  const [newConceptName, setNewConceptName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // AI 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]); // AI 제안 목록
  const [analyzeError, setAnalyzeError] = useState('');

  // 전체 태깅 진행률
  const [taggedCount, setTaggedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // ── 데이터 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProblems();
  }, [page, filter]);

  useEffect(() => {
    fetchConceptPool();
    fetchTaggingProgress();
  }, []);

  const fetchProblems = async () => {
    setIsLoadingList(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (filter === 'untagged') params.append('tagged', '0');
      if (filter === 'tagged') params.append('tagged', '1');
      const res = await axios.get(`${API_BASE_URL}/problems?${params}`);
      setProblems(res.data.problems || []);
      setTotalProblems(res.data.total || 0);
    } catch {
      setProblems([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchConceptPool = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/concepts`);
      setConceptPool(res.data || []);
    } catch {
      // 백엔드 미구현 시 샘플 데이터
      setConceptPool([
        { id: 1, name: '√x² = |x| 변환 규칙', grade_level: '중3' },
        { id: 2, name: '절댓값: 양수일 때 기호 제거', grade_level: '중1' },
        { id: 3, name: '부등식 조건을 대입하여 부호 판정', grade_level: '중2' },
        { id: 4, name: '이차방정식의 판별식 D = b² - 4ac', grade_level: '중3' },
        { id: 5, name: '인수분해: 합차공식 (a+b)(a-b)', grade_level: '중2' },
        { id: 6, name: '피타고라스 정리 a² + b² = c²', grade_level: '중2' },
        { id: 7, name: '사인 법칙: a/sinA = 2R', grade_level: '고1' },
        { id: 8, name: '로그의 밑 변환 공식', grade_level: '고1' },
      ]);
    }
  };

  const fetchTaggingProgress = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/concepts/progress`);
      setTaggedCount(res.data.tagged || 0);
      setTotalCount(res.data.total || 0);
    } catch {
      setTaggedCount(0);
      setTotalCount(9933);
    }
  };

  const fetchProblemConcepts = async (problemId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/problems/${problemId}/concepts`);
      setTaggedConcepts(res.data || []);
    } catch {
      setTaggedConcepts([]);
    }
  };

  // ── 문제 선택 ─────────────────────────────────────────────────────────────
  const handleSelectProblem = (problem) => {
    setSelectedProblem(problem);
    setAiSuggestions([]);
    setAnalyzeError('');
    setShowSolution(false);
    setSaveMsg('');
    setPoolSearch('');
    setShowNewForm(false);
    fetchProblemConcepts(problem.id);
  };

  // ── AI 분석 ──────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!selectedProblem) return;
    setIsAnalyzing(true);
    setAnalyzeError('');
    setAiSuggestions([]);
    try {
      const res = await axios.post(`${API_BASE_URL}/problems/${selectedProblem.id}/concepts/analyze`);
      setAiSuggestions(res.data.suggestions || []);
    } catch {
      // 백엔드 미구현 시 데모 응답
      setAiSuggestions([
        { name: '√x² = |x| 변환 규칙', confidence: 0.95 },
        { name: '절댓값: 양수일 때 기호 제거', confidence: 0.88 },
        { name: '부등식 조건을 대입하여 부호 판정', confidence: 0.82 },
      ]);
      setAnalyzeError('데모 모드: 실제 분석 API가 연결되지 않아 샘플 결과를 표시합니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI 제안 → 태깅에 추가
  const handleAddAiSuggestion = (suggestion) => {
    const exists = taggedConcepts.find(c => c.name === suggestion.name);
    if (exists) return;
    // 풀에서 매칭 찾기
    const fromPool = conceptPool.find(c => c.name === suggestion.name);
    const newConcept = fromPool
      ? { ...fromPool, source: 'ai' }
      : { id: `temp-${Date.now()}`, name: suggestion.name, source: 'ai' };
    setTaggedConcepts(prev => [...prev, newConcept]);
    setAiSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
  };

  // 풀에서 검색 후 추가
  const handleAddFromPool = (concept) => {
    if (taggedConcepts.find(c => c.id === concept.id)) return;
    setTaggedConcepts(prev => [...prev, { ...concept, source: 'manual' }]);
    setPoolSearch('');
  };

  // 새 원자 개념 직접 추가
  const handleAddNew = () => {
    if (!newConceptName.trim()) return;
    const newConcept = { id: `new-${Date.now()}`, name: newConceptName.trim(), source: 'manual', isNew: true };
    setTaggedConcepts(prev => [...prev, newConcept]);
    setConceptPool(prev => [...prev, newConcept]);
    setNewConceptName('');
    setShowNewForm(false);
  };

  // 개념 제거
  const handleRemoveConcept = (conceptId) => {
    setTaggedConcepts(prev => prev.filter(c => c.id !== conceptId));
  };

  // ── 저장 ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedProblem) return;
    setIsSaving(true);
    setSaveMsg('');
    try {
      await axios.post(`${API_BASE_URL}/problems/${selectedProblem.id}/concepts`, {
        concepts: taggedConcepts,
      });
      setSaveMsg('저장 완료!');
      // 목록에서 현재 문제 제거 (untagged 필터일 경우) 또는 카운트 업데이트
      setProblems(prev => prev.filter(p => p.id !== selectedProblem.id));
      setTaggedCount(prev => prev + 1);
      // 다음 문제로 자동 이동
      const currentIdx = problems.findIndex(p => p.id === selectedProblem.id);
      const nextProblem = problems[currentIdx + 1];
      if (nextProblem) setTimeout(() => handleSelectProblem(nextProblem), 800);
      else setTimeout(() => { setSelectedProblem(null); setSaveMsg(''); }, 1000);
    } catch {
      // 데모 모드에서는 성공 처리
      setSaveMsg('저장 완료! (데모)');
      setTimeout(() => setSaveMsg(''), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  // ── 필터된 풀 검색 ────────────────────────────────────────────────────────
  const filteredPool = conceptPool.filter(c =>
    c.name.includes(poolSearch) && !taggedConcepts.find(t => t.id === c.id)
  );

  const progressPct = totalCount > 0 ? Math.round((taggedCount / totalCount) * 100) : 0;
  const totalPages = Math.ceil(totalProblems / 30);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── 상단 헤더 ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-6">
        <div>
          <h1 className="text-lg font-bold text-gray-800">개념 원자화 태깅</h1>
          <p className="text-xs text-gray-500">문제별 풀이에 사용된 수학 개념/성질을 태깅합니다</p>
        </div>
        {/* 진행률 */}
        <div className="flex-1 max-w-sm">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>태깅 진행률</span>
            <span>{taggedCount.toLocaleString()} / {totalCount.toLocaleString()} ({progressPct}%)</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        {/* 범례 */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />AI 제안
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />직접 추가
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />풀에서 선택
          </span>
        </div>
      </div>

      {/* ── 메인 바디 ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── 왼쪽: 문제 목록 ─────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 bg-white border-r flex flex-col">
          {/* 필터 탭 */}
          <div className="flex border-b text-sm">
            {[
              { key: 'untagged', label: '미태깅' },
              { key: 'tagged',   label: '태깅완료' },
              { key: 'all',      label: '전체' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1); }}
                className={`flex-1 py-2.5 font-medium transition-colors ${
                  filter === f.key
                    ? 'text-indigo-600 border-b-2 border-indigo-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 문제 카드 목록 */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="p-8 text-center text-gray-400 text-sm">불러오는 중...</div>
            ) : problems.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                {filter === 'untagged' ? '모든 문제가 태깅되었습니다!' : '문제가 없습니다.'}
              </div>
            ) : (
              problems.map(p => (
                <ProblemCard
                  key={p.id}
                  problem={p}
                  isSelected={selectedProblem?.id === p.id}
                  onClick={() => handleSelectProblem(p)}
                />
              ))
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="border-t p-3 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs px-3 py-1.5 rounded border disabled:opacity-40 hover:bg-gray-50"
              >
                이전
              </button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs px-3 py-1.5 rounded border disabled:opacity-40 hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          )}
        </div>

        {/* ── 오른쪽: 문제 상세 + 태깅 ───────────────────────────────── */}
        {!selectedProblem ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4">👈</div>
              <p className="text-lg font-medium">왼쪽에서 문제를 선택하세요</p>
              <p className="text-sm mt-2">문제를 클릭하면 풀이와 개념 태깅 화면이 표시됩니다</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* 문제 뷰어 */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-indigo-600">#{selectedProblem.id}</span>
                  {selectedProblem.chapter_code && (
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-200">
                      {selectedProblem.chapter_code}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {selectedProblem.type === 'multiple_choice' ? '객관식' : '주관식'}
                  </span>
                </div>
                <button
                  onClick={() => setShowSolution(v => !v)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  {showSolution ? '풀이 숨기기' : '풀이 보기'}
                </button>
              </div>

              {/* 문제 텍스트 */}
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">문제</p>
                <div className="text-sm leading-loose text-gray-800">
                  {renderKaTeX(selectedProblem.question)}
                </div>
                {selectedProblem.choices && (
                  <div className="mt-3 space-y-1">
                    {(() => {
                      let choices = selectedProblem.choices;
                      if (typeof choices === 'string') try { choices = JSON.parse(choices); } catch { choices = []; }
                      return Array.isArray(choices) ? choices.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="font-medium text-indigo-500 min-w-[1.2rem]">{i + 1}.</span>
                          <span>{renderKaTeX(c)}</span>
                        </div>
                      )) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* 풀이 (접힘/펼침) */}
              {showSolution && selectedProblem.solution && (
                <div className="border-t p-5 bg-blue-50">
                  <p className="text-xs text-blue-500 mb-2 font-medium uppercase tracking-wider">풀이</p>
                  <div className="text-sm leading-loose text-gray-800">
                    {renderKaTeX(selectedProblem.solution)}
                  </div>
                </div>
              )}
            </div>

            {/* 개념 태깅 패널 */}
            <div className="bg-white rounded-xl border shadow-sm p-5 space-y-5">
              <h2 className="font-semibold text-gray-800">원자 개념 태깅</h2>

              {/* ① 현재 태깅된 개념 칩들 */}
              <div>
                <p className="text-xs text-gray-500 mb-2">현재 태깅된 개념 ({taggedConcepts.length}개)</p>
                {taggedConcepts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">아직 태깅된 개념이 없습니다. 아래에서 추가하세요.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {taggedConcepts.map(c => (
                      <ConceptChip key={c.id} concept={c} onRemove={handleRemoveConcept} />
                    ))}
                  </div>
                )}
              </div>

              {/* ② AI 분석 */}
              <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-sm font-medium text-amber-800">AI 자동 분석</span>
                    <span className="text-xs text-amber-600">(qwen2.5:14b가 풀이를 분석합니다)</span>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="text-xs px-4 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors font-medium"
                  >
                    {isAnalyzing ? '분석 중...' : '풀이 분석'}
                  </button>
                </div>

                {analyzeError && (
                  <p className="text-xs text-amber-700 mb-2 italic">{analyzeError}</p>
                )}

                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 py-1">
                    <span className="animate-spin inline-block">⟳</span>
                    풀이를 읽고 사용된 개념을 추출하는 중...
                  </div>
                )}

                {aiSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-700 font-medium">제안된 개념 (클릭하면 추가):</p>
                    {aiSuggestions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                        <div>
                          <span className="text-sm text-gray-800">{s.name}</span>
                          <span className="ml-2 text-xs text-amber-600">확신도 {Math.round(s.confidence * 100)}%</span>
                        </div>
                        <button
                          onClick={() => handleAddAiSuggestion(s)}
                          className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                        >
                          + 추가
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {aiSuggestions.length === 0 && !isAnalyzing && (
                  <p className="text-xs text-amber-600 italic">분석 버튼을 눌러 AI가 풀이에서 사용된 개념을 추출합니다.</p>
                )}
              </div>

              {/* ③ 원자 풀에서 검색하여 추가 */}
              <div>
                <p className="text-xs text-gray-500 mb-2">원자 풀에서 검색</p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="개념 이름으로 검색..."
                    value={poolSearch}
                    onChange={e => setPoolSearch(e.target.value)}
                    className="w-full text-sm border rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  {poolSearch && (
                    <button onClick={() => setPoolSearch('')} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">×</button>
                  )}
                </div>
                {poolSearch && filteredPool.length > 0 && (
                  <div className="mt-1 border rounded-lg overflow-hidden shadow-sm max-h-40 overflow-y-auto">
                    {filteredPool.slice(0, 10).map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleAddFromPool(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center justify-between border-b last:border-0"
                      >
                        <span className="text-gray-800">{c.name}</span>
                        {c.grade_level && (
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{c.grade_level}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {poolSearch && filteredPool.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1.5 italic">"{poolSearch}" 와 일치하는 개념이 없습니다.</p>
                )}
              </div>

              {/* ④ 새 원자 개념 직접 추가 */}
              <div>
                {!showNewForm ? (
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span className="text-lg leading-none">+</span> 새 원자 개념 추가
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="예: √x² = |x| 변환 규칙"
                      value={newConceptName}
                      onChange={e => setNewConceptName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddNew()}
                      autoFocus
                      className="flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      onClick={handleAddNew}
                      className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600"
                    >
                      추가
                    </button>
                    <button
                      onClick={() => { setShowNewForm(false); setNewConceptName(''); }}
                      className="px-3 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>

              {/* ⑤ 저장 버튼 */}
              <div className="pt-2 border-t flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || taggedConcepts.length === 0}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? '저장 중...' : `저장 후 다음 문제 →`}
                </button>
                {saveMsg && (
                  <span className="text-sm text-green-600 font-medium">{saveMsg}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
