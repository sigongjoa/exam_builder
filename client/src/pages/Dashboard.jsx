import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [stats, setStats] = useState({ students: 0, problems: 0, exams: 0 });

  useEffect(() => {
    Promise.all([
      axios.get('/api/students'),
      axios.get('/api/problems'),
      axios.get('/api/exams'),
    ]).then(([s, p, e]) => {
      setStats({ students: s.data.length, problems: p.data.length, exams: e.data.length });
    }).catch(() => {});
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">대시보드</h2>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-indigo-600">{stats.students}</div>
          <div className="text-sm text-gray-500 mt-1">등록 학생</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">{stats.problems}</div>
          <div className="text-sm text-gray-500 mt-1">문제 은행</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-orange-600">{stats.exams}</div>
          <div className="text-sm text-gray-500 mt-1">시험지</div>
        </div>
      </div>
    </div>
  );
}
