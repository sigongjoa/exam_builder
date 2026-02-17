import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import katex from 'katex';

function renderLatex(text) {
  if (!text) return '';
  return text.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try { return katex.renderToString(tex, { displayMode: true, throwOnError: false }); } catch { return tex; }
  }).replace(/\$(.*?)\$/g, (_, tex) => {
    try { return katex.renderToString(tex, { displayMode: false, throwOnError: false }); } catch { return tex; }
  });
}

export default function ProblemEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [form, setForm] = useState({
    type: 'multiple_choice', subject: '', chapter_code: '', pattern_name: '',
    difficulty: 2, question: '', choices: '["① ", "② ", "③ ", "④ ", "⑤ "]',
    answer: '', solution: '', status: 'draft', points: 5
  });
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (id && id !== 'new') {
      axios.get(`/api/problems/${id}`).then(r => {
        setProblem(r.data);
        setForm({
          ...r.data,
          choices: typeof r.data.choices === 'string' ? r.data.choices : JSON.stringify(r.data.choices || [])
        });
      }).catch(() => setMsg({ text: '문제를 불러올 수 없습니다', ok: false }));
    }
  }, [id]);

  const showMsg = (text, ok) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const handleSave = async () => {
    try {
      if (id && id !== 'new') {
        await axios.put(`/api/problems/${id}`, form);
        showMsg('저장 완료', true);
      } else {
        const r = await axios.post('/api/problems', form);
        showMsg('문제 등록 완료', true);
        navigate(`/editor/${r.data.id}`);
      }
    } catch { showMsg('저장 실패', false); }
  };

  const handleStatus = async (status) => {
    try {
      await axios.put(`/api/problems/${id}/status`, { status });
      setForm(f => ({ ...f, status }));
      showMsg(`상태 변경: ${status}`, true);
    } catch { showMsg('상태 변경 실패', false); }
  };

  const handleDelete = async () => {
    if (!confirm('문제를 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/problems/${id}`);
      showMsg('삭제 완료', true);
      navigate('/problems');
    } catch { showMsg('삭제 실패', false); }
  };

  let parsedChoices = [];
  try { parsedChoices = JSON.parse(form.choices || '[]'); } catch {}

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700', reviewed: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700'
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {id === 'new' ? '새 문제 등록' : `문제 편집 #${id}`}
        </h2>
        <div className="flex gap-2">
          {id !== 'new' && (
            <>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[form.status] || ''}`}>
                {form.status}
              </span>
              <button onClick={() => handleStatus('approved')} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">승인</button>
              <button onClick={() => handleStatus('rejected')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">반려</button>
              <button onClick={handleDelete} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">삭제</button>
            </>
          )}
        </div>
      </div>

      {msg && <div className={`p-3 mb-4 rounded-lg text-white ${msg.ok ? 'bg-green-500' : 'bg-red-500'}`}>{msg.text}</div>}

      <div className="grid grid-cols-2 gap-6">
        {/* 편집 영역 */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="font-bold text-gray-700 border-b pb-2">기본 정보</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">유형</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                  className="w-full border rounded px-3 py-1.5 text-sm">
                  <option value="multiple_choice">객관식</option>
                  <option value="descriptive">서술형</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">난이도</label>
                <select value={form.difficulty} onChange={e => setForm({...form, difficulty: +e.target.value})}
                  className="w-full border rounded px-3 py-1.5 text-sm">
                  <option value={1}>하</option>
                  <option value={2}>중</option>
                  <option value={3}>상</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">과목</label>
                <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                  className="w-full border rounded px-3 py-1.5 text-sm" placeholder="중2수학" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">단원 코드</label>
                <input value={form.chapter_code} onChange={e => setForm({...form, chapter_code: e.target.value})}
                  className="w-full border rounded px-3 py-1.5 text-sm" placeholder="1-1-1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">배점</label>
              <input type="number" value={form.points} onChange={e => setForm({...form, points: +e.target.value})}
                className="w-24 border rounded px-3 py-1.5 text-sm" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="font-bold text-gray-700 border-b pb-2">문제 내용</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">문제 본문 (LaTeX: $...$)</label>
              <textarea value={form.question} onChange={e => setForm({...form, question: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm font-mono" rows="4" />
            </div>
            {form.type === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">보기 (JSON 배열)</label>
                <textarea value={form.choices} onChange={e => setForm({...form, choices: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm font-mono" rows="3" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">정답</label>
              <input value={form.answer} onChange={e => setForm({...form, answer: e.target.value})}
                className="w-full border rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">풀이</label>
              <textarea value={form.solution || ''} onChange={e => setForm({...form, solution: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm font-mono" rows="4" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">
              저장
            </button>
            <button onClick={() => setPreview(!preview)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg">
              {preview ? '편집' : '미리보기'}
            </button>
          </div>
        </div>

        {/* 미리보기 영역 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-700 border-b pb-2 mb-4">미리보기</h3>
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-gray-400">[{form.subject} | {form.chapter_code} | 난이도 {'●'.repeat(form.difficulty)}{'○'.repeat(3-form.difficulty)} | {form.points}점]</span>
            </div>
            <div className="text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: renderLatex(form.question) }} />
            {form.type === 'multiple_choice' && parsedChoices.length > 0 && (
              <div className="space-y-1 pl-2">
                {parsedChoices.map((c, i) => (
                  <div key={i} className={`text-sm py-0.5 ${String(form.answer) === String(i+1) ? 'text-red-600 font-bold' : ''}`}
                    dangerouslySetInnerHTML={{ __html: renderLatex(c) }} />
                ))}
              </div>
            )}
            <div className="border-t pt-3">
              <div className="text-sm font-bold text-red-600 mb-1">정답: {form.answer}</div>
              {form.solution && (
                <div className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderLatex(form.solution) }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
