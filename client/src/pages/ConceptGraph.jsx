import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';

const ConceptGraph = () => {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/concepts/graph');
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch concept graph:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!data.nodes.length || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    // Clear existing SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');

    // Zoom setup
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Forces
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30));

    simulationRef.current = simulation;

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', d => Math.sqrt(d.value) + 1)
      .attr('stroke-opacity', 0.6);

    // Nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(data.nodes)
      .enter().append('circle')
      .attr('r', d => Math.max(10, Math.min(30, 8 + (d.use_count || 0) * 3)))
      .attr('fill', d => {
        switch (d.grade_level) {
          case '중1': return '#818cf8'; // indigo-400
          case '중2': return '#60a5fa'; // blue-400
          case '중3': return '#34d399'; // emerald-400
          case '고1': return '#fbbf24'; // amber-400
          default: return '#94a3b8'; // slate-400
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
        event.stopPropagation();
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Labels
    const label = g.append('g')
      .selectAll('text')
      .data(data.nodes)
      .enter().append('text')
      .text(d => d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name)
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle')
      .attr('dy', d => {
        const r = Math.max(10, Math.min(30, 8 + (d.use_count || 0) * 3));
        return -(r + 4);
      })
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        const { width: newWidth, height: newHeight } = containerRef.current.getBoundingClientRect();
        svg.attr('width', newWidth).attr('height', newHeight);
        simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
        simulation.alpha(0.3).restart();
      }
    });

    resizeObserver.observe(container);

    return () => {
      simulation.stop();
      resizeObserver.disconnect();
    };
  }, [data]);

  const getConnectedConcepts = (nodeId) => {
    const connectedIds = data.links
      .filter(l => (l.source.id || l.source) === nodeId || (l.target.id || l.target) === nodeId)
      .map(l => (l.source.id || l.source) === nodeId ? (l.target.id || l.target) : (l.source.id || l.source));
    
    return data.nodes.filter(n => connectedIds.includes(n.id)).map(n => n.name);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">개념 연결 그래프</h1>
          <p className="text-sm text-slate-500">문제에서 함께 사용된 개념들의 연결 관계</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4 text-sm text-slate-600">
            <span>개념 <span className="font-semibold text-indigo-600">{data.nodes.length}</span>개</span>
            <span>연결 <span className="font-semibold text-indigo-600">{data.links.length}</span>개</span>
          </div>
          <button 
            onClick={fetchData}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
          >
            새로고침
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">선택된 노드 정보</h2>
          </div>
          <div className="p-4 flex-1">
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold">이름</label>
                  <p className="text-lg font-bold text-slate-900">{selectedNode.name}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold">학년</label>
                    <p className="text-sm font-medium">{selectedNode.grade_level || '기타'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold">사용 횟수</label>
                    <p className="text-sm font-medium">{selectedNode.use_count || 0}회</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold">연결된 개념</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {getConnectedConcepts(selectedNode.id).map((name, i) => (
                      <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                        {name}
                      </span>
                    ))}
                    {getConnectedConcepts(selectedNode.id).length === 0 && (
                      <p className="text-xs text-slate-400 italic">연결된 개념이 없습니다.</p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded mt-4"
                >
                  선택 해제
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm">노드를 클릭하면<br />상세 정보가 표시됩니다</p>
              </div>
            )}
          </div>
        </aside>

        {/* Graph Area */}
        <main ref={containerRef} className="flex-1 relative bg-slate-50 overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-sm text-slate-500">그래프 데이터를 불러오는 중...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              <p>{error}</p>
            </div>
          ) : data.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <p>개념을 태깅하면 그래프가 생성됩니다</p>
            </div>
          ) : null}
          <svg 
            ref={svgRef} 
            className="w-full h-full touch-none"
            onClick={() => setSelectedNode(null)}
          ></svg>
        </main>
      </div>
    </div>
  );
};

export default ConceptGraph;
