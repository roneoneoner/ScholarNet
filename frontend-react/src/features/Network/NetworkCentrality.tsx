import React, { useState } from 'react';
import { useAuthorSearch, useNetworkAnalysis, useMetadata } from '../../api/hooks';
import NetworkGraph from './NetworkGraph';
import { Search, Globe, ChevronDown, RotateCcw, Info } from 'lucide-react';

const NetworkCentrality: React.FC = () => {
  const { data: meta } = useMetadata();
  const [filters, setFilters] = useState<Record<string, any>>({
    author_id: '',
    rsNo: '',
    name_chinese: '',
    name_english: '',
    organization: '',
    title: '',
    surname: '',
    given_name: '',
    affiliation: '',
    country: '',
    city: '',
    h_index: '',
    doc_count_min: '',
    cite_count_min: '',
    non_nstc_area: '',
    grant_category: '',
    discipline_code: '',
    plan_name: '',
    pub_start: '',
    pub_end: '',
    pub_name: '',
    is_ieee: false,
    is_top2: false,
  });

  const [activeAnalysis, setActiveAnalysis] = useState<{ authorIds: string[]; targetAuthorId: string | null } | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<number>(1);

  const cleanParams = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined && v !== false)
  );

  const authorSearch = useAuthorSearch(cleanParams);

  const networkQuery = useNetworkAnalysis(
    activeAnalysis?.authorIds || [],
    activeAnalysis?.targetAuthorId || null,
    1
  );

  const handleStartAnalysis = async () => {
    const { data: authors } = await authorSearch.refetch();
    if (!authors || authors.length === 0) {
      alert('查無符合條件之作者，無法分析網絡');
      return;
    }
    const ids = authors.map(a => a.author_id);
    setActiveAnalysis({
      authorIds: ids,
      targetAuthorId: ids.length === 1 ? ids[0] : null
    });
    setActiveClusterId(1);
  };

  const handleReset = () => {
    setFilters({
      author_id: '',
      rsNo: '',
      name_chinese: '',
      name_english: '',
      organization: '',
      title: '',
      surname: '',
      given_name: '',
      affiliation: '',
      country: '',
      city: '',
      h_index: '',
      doc_count_min: '',
      cite_count_min: '',
      non_nstc_area: '',
      grant_category: '',
      discipline_code: '',
      plan_name: '',
      pub_start: '',
      pub_end: '',
      pub_name: '',
      is_ieee: false,
      is_top2: false,
    });
  };

  const currentCluster = networkQuery.data?.clusters?.find((c: any) => c.cluster_id === activeClusterId) || networkQuery.data?.clusters?.[0];

  const graphData = React.useMemo(() => {
    if (!currentCluster || !networkQuery.data) return { nodes: [], edges: [] };

    const nodes = currentCluster.authors.map((a: any) => {
      const c = a.centrality;
      const size = Math.max(0, Math.min(1, c.betweenness || 0)) * 60 + 12;
      return {
        id: a.author_id,
        label: `${a.name}\n(${a.author_id})`,
        group: a.affiliation,
        value: size,
      };
    });

    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = networkQuery.data.graph_edges
      .filter((e: any) => nodeIds.has(e.from) && nodeIds.has(e.to))
      .map((e: any) => ({
        from: e.from,
        to: e.to,
        width: Math.sqrt(e.weight) * 2,
      }));

    return { nodes, edges };
  }, [currentCluster, networkQuery.data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFilters(prev => ({ ...prev, [name]: val }));
  };

  const handleQuickAdd = (name: string, value: string) => {
    if (!value) return;
    const current = filters[name] || '';
    const items = current ? current.split(',').map((i: string) => i.trim()).filter((i: string) => i !== '') : [];
    if (!items.includes(value)) {
      setFilters(prev => ({ ...prev, [name]: [...items, value].join(', ') }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Filter Panel */}
      <div className="bg-bg-card border border-border-color rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-white/5 px-6 py-4 border-b border-border-color flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-accent-primary">
            <Globe className="w-5 h-5" />
            網絡分析範圍篩選
          </h3>
          <div className="flex gap-3">
            <button onClick={handleReset} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all">
              <RotateCcw className="w-3.5 h-3.5 mr-2 inline" /> 重設
            </button>
            <button
              onClick={handleStartAnalysis}
              className="px-6 py-2 bg-accent-primary hover:bg-blue-400 text-bg-dark rounded-xl text-sm font-black transition-all shadow-lg shadow-accent-primary/20"
            >
              <Search className="w-4 h-4 mr-2 inline" /> 執行網絡分析
            </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            { name: 'author_id', label: '作者 ID', placeholder: 'Scopus ID' },
            { name: 'organization', label: '機構 (C302)', placeholder: 'C302 Organization', metaKey: 'c302_orgs' },
            { name: 'affiliation', label: '機構 (Scopus)', placeholder: 'Scopus Affiliation', metaKey: 'scopus_affs' },
            { name: 'non_nstc_area', label: '摘要領域', placeholder: 'Research Area', metaKey: 'non_nstc_areas' },
          ].map(field => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">{field.label}</label>
              <div className="relative group">
                <input
                  type="text"
                  name={field.name}
                  value={filters[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-primary transition-all"
                />
                {field.metaKey && meta && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <select
                      onChange={(e) => handleQuickAdd(field.name, e.target.value)}
                      className="opacity-0 absolute inset-0 w-full cursor-pointer"
                      value=""
                    >
                      <option value="">快速選擇</option>
                      {(meta[field.metaKey as keyof typeof meta] as string[] || []).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-text-sec" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis UI */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 h-[800px] relative">
          {networkQuery.isLoading && (
            <div className="absolute inset-0 bg-bg-dark/50 backdrop-blur-sm rounded-2xl z-10 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-accent-primary animate-pulse tracking-widest">正在構建大規模學術合作拓樸圖...</p>
            </div>
          )}
          
          {!activeAnalysis && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-bg-card border border-dashed border-border-color rounded-2xl opacity-50">
              <Globe className="w-16 h-16 mb-4" />
              <p>請執行篩選以啟動網絡分析</p>
            </div>
          )}

          {activeAnalysis && !networkQuery.isLoading && (
            <NetworkGraph nodes={graphData.nodes} edges={graphData.edges} />
          )}

          {networkQuery.data && (
            <div className="absolute top-6 left-6 bg-bg-card/80 backdrop-blur border border-border-color p-4 rounded-xl shadow-2xl space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse"></div>
                <span className="text-xs font-black uppercase tracking-widest">分析報告已就緒</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-white">{graphData.nodes.length} <span className="text-xs text-text-sec font-medium">Nodes</span></p>
                <p className="text-2xl font-black text-white">{graphData.edges.length} <span className="text-xs text-text-sec font-medium">Edges</span></p>
              </div>
              <div className="pt-2">
                <label className="text-[10px] font-black text-text-sec uppercase tracking-widest block mb-1">切換偵測群體</label>
                <select 
                  value={activeClusterId}
                  onChange={(e) => setActiveClusterId(parseInt(e.target.value))}
                  className="w-full bg-bg-dark border border-border-color rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent-primary"
                >
                  {networkQuery.data.clusters.map((c: any) => (
                    <option key={c.cluster_id} value={c.cluster_id}>群體 {c.cluster_id} ({c.author_count} 人)</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Legend / Metrics Table */}
        <div className="space-y-6">
          <div className="bg-bg-card border border-border-color rounded-2xl p-6 shadow-xl">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-accent-primary" />
              圖例說明
            </h4>
            <ul className="space-y-4 text-xs text-text-sec">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-accent-primary shrink-0"></div>
                <span><strong>節點大小</strong> 代表 <strong>介數中心性 (Betweenness)</strong>，數值越高代表該學者在網絡中的中介地位越強。</span>
              </li>
              <li className="flex gap-3">
                <div className="h-1.5 w-8 bg-accent-primary/50 mt-2 shrink-0 rounded-full"></div>
                <span><strong>連線粗細</strong> 代表 <strong>合作次數 (Co-author count)</strong>，線條越粗代表兩位學者合作越頻繁。</span>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-lg bg-bg-dark border border-border-color flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
                <span>系統會自動使用 <strong>Louvain 演算法</strong> 偵測社群，不同的群體可透過左側選單切換。</span>
              </li>
            </ul>
          </div>

          <div className="bg-bg-card border border-border-color rounded-2xl p-6 shadow-xl overflow-hidden">
            <h4 className="font-bold mb-4">群體成員指標</h4>
            <div className="max-h-[400px] overflow-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-bg-card shadow-sm">
                  <tr className="text-[10px] text-text-sec uppercase border-b border-border-color">
                    <th className="pb-2">姓名</th>
                    <th className="pb-2 text-right">度中心</th>
                    <th className="pb-2 text-right">介數</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/50">
                  {currentCluster?.authors.map((a: any) => (
                    <tr key={a.author_id} className="text-[11px] group hover:bg-white/5 transition-colors">
                      <td className="py-2.5 truncate max-w-[80px]" title={a.name}>{a.name}</td>
                      <td className="py-2.5 text-right font-mono">{(a.centrality.degree || 0).toFixed(3)}</td>
                      <td className="py-2.5 text-right font-mono text-accent-primary font-bold">{(a.centrality.betweenness || 0).toFixed(3)}</td>
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

export default NetworkCentrality;
