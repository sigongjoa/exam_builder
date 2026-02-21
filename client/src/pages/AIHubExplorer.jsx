import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AIHubExplorer = () => {
    const [datasets, setDatasets] = useState([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState(null);
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        fetchDatasets();
    }, []);

    useEffect(() => {
        if (selectedDatasetId) {
            fetchItems();
            fetchStats();
        }
    }, [selectedDatasetId, page]);

    const fetchDatasets = async () => {
        try {
            const resp = await axios.get('http://localhost:3000/api/aihub/datasets');
            setDatasets(resp.data);
            if (resp.data.length > 0) setSelectedDatasetId(resp.data[0].id);
        } catch (e) {
            console.error('Error fetching datasets', e);
        }
    };

    const fetchItems = async () => {
        try {
            const resp = await axios.get(`http://localhost:3000/api/aihub/datasets/${selectedDatasetId}/items?page=${page}`);
            setItems(resp.data.items);
            setTotalPages(resp.data.pagination.totalPages);
        } catch (e) {
            console.error('Error fetching items', e);
        }
    };

    const fetchStats = async () => {
        try {
            const resp = await axios.get(`http://localhost:3000/api/aihub/datasets/${selectedDatasetId}/stats`);
            setStats(resp.data);
        } catch (e) {
            console.error('Error fetching stats', e);
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-teal-800">AI-Hub 데이터셋 리뷰</h1>
                <p className="text-slate-500 mt-2">외부 AI-Hub 교육 데이터를 탐색하고 품질을 검토하는 연구용 페이지입니다. (관리용 문제 은행과는 독립된 데이터입니다.)</p>
            </div>

            {/* Dataset Selector */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {datasets.map(ds => (
                    <button
                        key={ds.id}
                        onClick={() => { setSelectedDatasetId(ds.id); setPage(1); }}
                        className={`px-4 py-2 rounded-full whitespace-nowrap transition-all font-medium ${selectedDatasetId === ds.id
                                ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                                : 'bg-white text-slate-600 hover:bg-teal-50 border'
                            }`}
                    >
                        {ds.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-teal-500">
                        <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                            <span className="text-teal-500">📊</span> 학년별 분포
                        </h2>
                        <div className="space-y-4">
                            {stats?.gradeDistribution.map(g => (
                                <div key={g.grade}>
                                    <div className="flex justify-between text-xs mb-1 text-slate-500 uppercase tracking-wider">
                                        <span>{g.grade || 'Unknown'}</span>
                                        <span className="font-bold text-slate-700">{g.count}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                        <div
                                            className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (g.count / 500) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-emerald-500">
                        <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                            <span className="text-emerald-500">📂</span> 과목별 분포
                        </h2>
                        <div className="space-y-4">
                            {stats?.subjectDistribution.map(s => (
                                <div key={s.subject}>
                                    <div className="flex justify-between text-xs mb-1 text-slate-500 uppercase tracking-wider">
                                        <span>{s.subject || 'Unknown'}</span>
                                        <span className="font-bold text-slate-700">{s.count}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                        <div
                                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (s.count / 500) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Data Table Section */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <h2 className="font-bold text-slate-800 text-lg">데이터 브라우저</h2>
                                <p className="text-xs text-slate-400">데이터셋 본문 및 메타데이터 미리보기</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-1 rounded-lg border">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-20"
                                >
                                    ◀
                                </button>
                                <span className="text-sm font-bold text-slate-600 px-2 border-x">{page} / {totalPages}</span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-20"
                                >
                                    ▶
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold tracking-widest border-b">
                                    <tr>
                                        <th className="px-6 py-4">GRADE</th>
                                        <th className="px-6 py-4">SUBJECT</th>
                                        <th className="px-6 py-4">CONTENT PREVIEW</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y">
                                    {items.map(item => (
                                        <tr key={item.id} className="hover:bg-teal-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-bold">{item.grade}</span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">{item.subject}</td>
                                            <td className="px-6 py-4 text-slate-600 line-clamp-2 leading-relaxed h-[4.5rem] flex items-center pr-10">
                                                {item.content_text || 'No preview available'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIHubExplorer;
