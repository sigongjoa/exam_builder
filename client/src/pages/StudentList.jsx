import { useState, useEffect } from 'react';
import axios from 'axios';

const grades = ['중1', '중2', '중3', '고1', '고2', '고3'];
const difficultyLabels = { basic: '기본', intermediate: '중급', advanced: '상급' };

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', grade: '중1', subject: '', difficulty_level: 'basic', group_name: '', notes: '' });
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchStudents(); fetchSubjects(); }, []);

  const fetchStudents = () => axios.get('/api/students').then(r => setStudents(r.data));
  const fetchSubjects = () => axios.get('/api/curriculum/subjects').then(r => setSubjects(r.data));

  const showMsg = (text, ok) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', grade: '중1', subject: subjects[0] || '', difficulty_level: 'basic', group_name: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, grade: s.grade, subject: s.subject, difficulty_level: s.difficulty_level || 'basic', group_name: s.group_name || '', notes: s.notes || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('정말로 이 학생을 삭제하시겠습니까?')) return;
    try { await axios.delete(`/api/students/${id}`); showMsg('삭제 완료', true); fetchStudents(); }
    catch { showMsg('삭제 실패', false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showMsg('이름을 입력하세요', false); return; }
    try {
      if (editing) { await axios.put(`/api/students/${editing.id}`, form); showMsg('수정 완료', true); }
      else { await axios.post('/api/students', form); showMsg('추가 완료', true); }
      setShowModal(false); fetchStudents();
    } catch { showMsg('저장 실패', false); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">학생 관리</h2>
        <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow">
          + 학생 추가
        </button>
      </div>

      {msg && (
        <div className={`p-3 mb-4 rounded-lg text-white ${msg.ok ? 'bg-green-500' : 'bg-red-500'}`}>{msg.text}</div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">학년</th>
              <th className="px-4 py-3">과목</th>
              <th className="px-4 py-3">난이도</th>
              <th className="px-4 py-3">그룹</th>
              <th className="px-4 py-3">조건</th>
              <th className="px-4 py-3">메모</th>
              <th className="px-4 py-3 text-center">동작</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">등록된 학생이 없습니다</td></tr>
            ) : students.map((s, i) => (
              <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                <td className="px-4 py-3">{s.grade}</td>
                <td className="px-4 py-3">{s.subject}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.difficulty_level === 'advanced' ? 'bg-red-100 text-red-700' :
                    s.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{difficultyLabels[s.difficulty_level] || s.difficulty_level}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.group_name || '-'}</td>
                <td className="px-4 py-3">{s.conditions?.length || 0}개</td>
                <td className="px-4 py-3 text-gray-500 max-w-32 truncate">{s.notes || '-'}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <button onClick={() => openEdit(s)} className="text-indigo-600 hover:text-indigo-800 mr-3 font-medium">수정</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 font-medium">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">{editing ? '학생 정보 수정' : '새 학생 추가'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                <input name="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                  <select name="grade" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2">
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                  <select name="difficulty_level" value={form.difficulty_level} onChange={e => setForm({...form, difficulty_level: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2">
                    {Object.entries(difficultyLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
                <select name="subject" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2">
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">그룹명</label>
                <input name="group_name" value={form.group_name} onChange={e => setForm({...form, group_name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea name="notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" rows="2" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">
                  {editing ? '수정하기' : '추가하기'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg">
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
