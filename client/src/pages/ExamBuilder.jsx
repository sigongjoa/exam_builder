import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ExamBuilder() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = () => axios.get('/api/exams').then(r => setExams(r.data));

  const showMsg = (text, ok) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const handleDelete = async (id) => {
    if (!confirm('이 시험지를 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/exams/${id}`);
      showMsg('삭제 완료', true);
      fetchExams();
    } catch { showMsg('삭제 실패', false); }
  };

  const downloadPDF = (examId, type) => {
    window.open(`/api/pdf/${examId}?type=${type}`, '_blank');
  };

  const downloadBundle = (examId) => {
    window.open(`/api/pdf/${examId}/bundle`, '_blank');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">시험지 관리</h2>
        <button onClick={() => navigate('/exams/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow">
          + 새 시험지 만들기
        </button>
      </div>

      {msg && <div className={`p-3 mb-4 rounded-lg text-white ${msg.ok ? 'bg-green-500' : 'bg-red-500'}`}>{msg.text}</div>}

      {exams.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          생성된 시험지가 없습니다. 새 시험지를 만들어보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white rounded-lg shadow p-5 hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-lg text-gray-800 mb-2">{exam.title}</h3>
              <div className="text-sm text-gray-500 space-y-1 mb-4">
                <div>유형: <span className="font-medium">{exam.exam_type === 'monthly' ? '월말고사' : exam.exam_type === 'daily' ? '일일 테스트' : exam.exam_type}</span></div>
                <div>학생: <span className="font-medium">{exam.student_name || '미지정'}</span></div>
                <div>문제 수: <span className="font-medium">{exam.problem_count}문제</span> / 총점: <span className="font-medium">{exam.total_points}점</span></div>
                <div className="text-xs text-gray-400">{new Date(exam.created_at).toLocaleDateString('ko-KR')}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => downloadBundle(exam.id)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-2 rounded font-bold mb-1 shadow-sm transition-colors">
                  일괄 다운로드 (ZIP)
                </button>
                <button onClick={() => downloadPDF(exam.id, 'exam')}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-3 py-1.5 rounded font-medium">
                  시험지
                </button>
                <button onClick={() => downloadPDF(exam.id, 'answer')}
                  className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded font-medium">
                  답안지
                </button>
                <button onClick={() => downloadPDF(exam.id, 'solution')}
                  className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1.5 rounded font-medium">
                  해설지
                </button>
                <button onClick={() => handleDelete(exam.id)}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded font-medium">
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
