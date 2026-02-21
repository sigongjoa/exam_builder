import { NavLink, Outlet } from 'react-router-dom';

const menuItems = [
  { to: '/', label: '대시보드', icon: '📊' },
  { to: '/students', label: '학생 관리', icon: '👤' },
  { to: '/problems', label: '문제 은행', icon: '📚' },
  { to: '/generate', label: 'AI 문제 생성', icon: '🤖' },
  { to: '/exams', label: '시험지 빌더', icon: '📝' },
  { to: '/aihub', label: 'AI-Hub 데이터셋 리뷰', icon: '🔍' },
  { to: '/concept-tagging', label: '개념 원자화 태깅', icon: '⚛️' },
  { to: '/concept-graph', label: '개념 연결 그래프', icon: '🕸️' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-indigo-900 text-white flex flex-col">
        <div className="p-4 border-b border-indigo-700">
          <h1 className="text-lg font-bold">Exam Builder</h1>
          <p className="text-xs text-indigo-300">수학 시험지 자동 생성</p>
        </div>
        <nav className="flex-1 py-4">
          {menuItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive
                  ? 'bg-indigo-700 text-white font-semibold'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-indigo-700 text-xs text-indigo-400">
          v1.0.0 | Local AI
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
