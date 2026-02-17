import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css'; // KaTeX CSS

const API_BASE_URL = '/api';

export default function ProblemBank() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({
    subject: '',
    status: '',
    difficulty: '',
    type: '',
  });
  const [search, setSearch] = useState(''); // New state for search keyword
  const [page, setPage] = useState(1); // New state for current page
  const [total, setTotal] = useState(0); // New state for total problems
  const [totalPages, setTotalPages] = useState(1); // New state for total pages
  const limit = 20; // Problems per page

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubjects();
    fetchProblems();
  }, [filters, page]); // Refetch problems when filters or page change

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/curriculum/subjects`);
      setSubjects(response.data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('과목 목록을 불러오는데 실패했습니다.');
    }
  };

  const fetchProblems = async () => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      // Add filters, excluding empty values
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });
      // Add search, page, and limit
      if (search) {
        queryParams.append('search', search);
      }
      queryParams.append('page', page);
      queryParams.append('limit', limit);

      const response = await axios.get(`${API_BASE_URL}/problems?${queryParams.toString()}`);
      setProblems(response.data.problems); // Adjust to new API response
      setTotal(response.data.total); // Set total count
      setPage(response.data.page); // Set current page from response
      setTotalPages(response.data.totalPages); // Set total pages

    } catch (err) {
      console.error('Error fetching problems:', err);
      setError('문제 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset page to 1 when filters change
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleSearchSubmit = () => {
    setPage(1); // Reset page to 1 when search is submitted
    fetchProblems(); // Manually trigger fetch for search
  };

  const handleCardClick = (problemId) => {
    navigate(`/editor/${problemId}`);
  };

  const handleVariant = async (e, problemId) => {
    e.stopPropagation();
    if (!confirm('이 문제의 숫자를 바꾼 변형 문제를 생성하시겠습니까?')) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/generate/variant`, { problem_id: problemId });
      alert(`변형 문제 생성 완료! (ID: ${res.data.id})`);
      fetchProblems();
    } catch (err) {
      alert(`변형 생성 실패: ${err.response?.data?.message || err.message}`);
    }
  };

  // Function to render KaTeX, same as AIGenerate.jsx
  const renderKaTeX = (text) => {
    if (!text) return '';
    return text.split(/(\\\(.+?\\\)|\\\[.+?\\\]|\$\$.+?\$\$)/g).map((part, index) => {
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        try {
          return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2, -2), { throwOnError: false }) }} />;
        } catch (e) {
          return <span key={index}>{part}</span>;
        }
      } else if ((part.startsWith('\\[') && part.endsWith('\\]')) || (part.startsWith('$$') && part.endsWith('$$'))) {
        try {
          return <div key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false }) }} />;
        } catch (e) {
          return <div key={index}>{part}</div>;
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  const getDifficultyBadge = (level) => {
    let colorClass = '';
    let text = '';
    switch (level) {
      case 1: colorClass = 'bg-green-100 text-green-800'; text = '하'; break;
      case 2: colorClass = 'bg-yellow-100 text-yellow-800'; text = '중'; break;
      case 3: colorClass = 'bg-red-100 text-red-800'; text = '상'; break;
      default: colorClass = 'bg-gray-100 text-gray-800'; text = 'N/A';
    }
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>{text}</span>;
  };

  const getStatusBadge = (status) => {
    let colorClass = '';
    let text = '';
    switch (status) {
      case 'draft': colorClass = 'bg-blue-100 text-blue-800'; text = '초안'; break;
      case 'approved': colorClass = 'bg-green-100 text-green-800'; text = '승인됨'; break;
      case 'reviewed': colorClass = 'bg-purple-100 text-purple-800'; text = '검토됨'; break;
      case 'rejected': colorClass = 'bg-red-100 text-red-800'; text = '거절됨'; break;
      default: colorClass = 'bg-gray-100 text-gray-800'; text = '알 수 없음';
    }
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>{text}</span>;
  };

  const renderPaginationButtons = () => {
    const pageNumbers = [];
    const maxPageButtons = 5; // Display max 5 page numbers at a time
    let startPage = Math.max(1, page - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    if (startPage > 1) {
        pageNumbers.push(
            <button
                key={1}
                onClick={() => setPage(1)}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                1
            </button>
        );
        if (startPage > 2) {
            pageNumbers.push(
                <span key="ellipsis-start" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                </span>
            );
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
            <button
                key={i}
                onClick={() => setPage(i)}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                    i === page ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
                {i}
            </button>
        );
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbers.push(
                <span key="ellipsis-end" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                </span>
            );
        }
        pageNumbers.push(
            <button
                key={totalPages}
                onClick={() => setPage(totalPages)}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                {totalPages}
            </button>
        );
    }

    return pageNumbers;
};


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-8">문제 은행</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">필터</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="filter-subject" className="block text-sm font-medium text-gray-700">과목</label>
            <select
              id="filter-subject"
              name="subject"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={filters.subject}
              onChange={handleFilterChange}
            >
              <option value="">전체</option>
              {subjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700">상태</label>
            <select
              id="filter-status"
              name="status"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">전체</option>
              <option value="draft">초안</option>
              <option value="approved">승인됨</option>
              <option value="reviewed">검토됨</option>
              <option value="rejected">거절됨</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-difficulty" className="block text-sm font-medium text-gray-700">난이도</label>
            <select
              id="filter-difficulty"
              name="difficulty"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={filters.difficulty}
              onChange={handleFilterChange}
            >
              <option value="">전체</option>
              <option value="1">하</option>
              <option value="2">중</option>
              <option value="3">상</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-type" className="block text-sm font-medium text-gray-700">문제 유형</label>
            <select
              id="filter-type"
              name="type"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="">전체</option>
              <option value="multiple_choice">객관식</option>
              <option value="descriptive">서술형</option>
            </select>
          </div>
          {/* Search Input */}
          <div className="md:col-span-2 lg:col-span-1 flex items-end"> {/* Use items-end to align with other inputs */}
            <input
              type="text"
              placeholder="문제 검색 (키워드 입력)..."
              className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
              value={search}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit();
                }
              }}
            />
            <button
              onClick={handleSearchSubmit}
              className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {total > 0 && !isLoading && (
        <div className="text-sm text-gray-600 mb-4">
          총 {total.toLocaleString()}건 중 {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="ml-4 text-gray-600">문제 로딩 중...</p>
        </div>
      ) : problems.length === 0 ? (
        <p className="text-center text-gray-500 text-lg mt-10">필터에 해당하는 문제가 없습니다.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map(problem => (
              <div
                key={problem.id}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handleCardClick(problem.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-bold text-gray-800">문제 #{problem.id}</h4>
                  <div className="flex space-x-2">
                    {getDifficultyBadge(problem.difficulty)}
                    {getStatusBadge(problem.status)}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">{problem.subject}</span> &gt; {problem.chapter_code}
                </div>
                <div className="text-gray-900 leading-relaxed text-base line-clamp-3 mb-3">
                  {renderKaTeX(problem.question)}
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={(e) => handleVariant(e, problem.id)}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-2.5 py-1 rounded font-medium">
                    변형 생성
                  </button>
                  <button onClick={() => handleCardClick(problem.id)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-2.5 py-1 rounded font-medium">
                    편집
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>이전</span>
                </button>

                {/* Page Numbers */}
                {renderPaginationButtons()}

                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>다음</span>
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}