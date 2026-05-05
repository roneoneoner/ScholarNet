import React, { useState } from 'react';
import { useCooperation } from '../../api/hooks';
import CoopChart from './CoopChart';
import { LayoutDashboard, Search, FileDown, ExternalLink } from 'lucide-react';
import { exportToCSV } from '../../utils/export';

const CooperationDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    type: 'country',
    p: '',
    c: '',
    a: '',
    u: '',
    limit: 10,
  });

  const [activeParams, setActiveParams] = useState<any>(null);

  const countryQuery = useCooperation(
    activeParams?.type,
    'countries',
    activeParams?.p,
    { c: activeParams?.c, a: activeParams?.a, u: activeParams?.u },
    activeParams?.limit || 10
  );

  const affQuery = useCooperation(
    activeParams?.type,
    'affiliations',
    activeParams?.p,
    { c: activeParams?.c, a: activeParams?.a, u: activeParams?.u },
    activeParams?.limit || 10
  );

  const authorQuery = useCooperation(
    activeParams?.type,
    'authors',
    activeParams?.p,
    { c: activeParams?.c, a: activeParams?.a, u: activeParams?.u },
    activeParams?.limit || 10
  );

  const handleSearch = () => {
    if (!searchParams.p) {
      alert('請填寫主體名稱或 ID！');
      return;
    }
    setActiveParams({ ...searchParams });
  };

  const isLoading = countryQuery.isLoading || affQuery.isLoading || authorQuery.isLoading;

  const renderSection = (title: string, data: any[], labelKey: string, isAuthor: boolean = false) => {
    if (!activeParams) return null;
    if (isLoading) return null;
    
    return (
      <div className="bg-bg-card border border-border-color rounded-2xl overflow-hidden shadow-xl mb-8">
        <div className="px-6 py-4 border-b border-border-color bg-white/5 flex justify-between items-center">
          <h3 className="font-bold text-accent-primary flex items-center gap-2">
            {title}
          </h3>
          <button 
            onClick={() => exportToCSV(`${title.replace(/\s/g, '_')}.csv`, data)}
            className="flex items-center gap-2 text-xs font-bold text-text-sec hover:text-text-primary transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"
          >
            <FileDown className="w-3.5 h-3.5" /> 匯出 CSV
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="h-[400px]">
            <CoopChart data={data} labelKey={labelKey} title={title} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border-color bg-bg-dark">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-white/5 border-b border-border-color">
                  <th className="px-4 py-3 text-text-sec uppercase text-[11px] font-bold">排名</th>
                  <th className="px-4 py-3 text-text-sec uppercase text-[11px] font-bold">
                    {isAuthor ? '作者 ID' : '實體名稱'}
                  </th>
                  {isAuthor && <th className="px-4 py-3 text-text-sec uppercase text-[11px] font-bold">姓名</th>}
                  <th className="px-4 py-3 text-text-sec uppercase text-[11px] font-bold text-center">共著數</th>
                  <th className="px-4 py-3 text-text-sec uppercase text-[11px] font-bold">Scopus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {data.map((d, i) => {
                  const scopusIds = (d.scopus_ids || '').split(',');
                  const firstId = scopusIds[0];
                  return (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3 text-text-sec font-mono text-xs">#{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{d[labelKey]}</td>
                      {isAuthor && <td className="px-4 py-3">{d.surname} {d.given_name}</td>}
                      <td className="px-4 py-3 text-center text-accent-primary font-black">{d.co_count}</td>
                      <td className="px-4 py-3">
                        <a 
                          href={`https://www.scopus.com/record/display.uri?eid=2-s2.0-${firstId}`} 
                          target="_blank" 
                          className="flex items-center gap-1.5 text-text-sec hover:text-accent-primary transition-colors"
                        >
                          <span className="text-[11px] font-mono">{firstId.substring(0, 8)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-text-sec italic">查無合作數據</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Search Panel */}
      <div className="bg-bg-card border border-border-color rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6 text-accent-primary">
          <LayoutDashboard className="w-5 h-5" />
          <h3 className="font-bold">合作分析配置</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">分析類型</label>
            <select
              value={searchParams.type}
              onChange={(e) => setSearchParams({ ...searchParams, type: e.target.value })}
              className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-primary transition-all"
            >
              <option value="country">🌍 以國家為主體</option>
              <option value="aff">🏛 以機構為主體</option>
              <option value="author">👤 以作者為主體</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">
              {searchParams.type === 'country' ? '主體國家名稱' : searchParams.type === 'aff' ? '主體機構名稱' : '主體作者 ID'}
            </label>
            <input
              type="text"
              placeholder="例如: Taiwan, National Taiwan University, 7004412211"
              value={searchParams.p}
              onChange={(e) => setSearchParams({ ...searchParams, p: e.target.value })}
              className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-primary transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">限制合作國家</label>
            <input
              type="text"
              placeholder="Country Name"
              value={searchParams.c}
              onChange={(e) => setSearchParams({ ...searchParams, c: e.target.value })}
              className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-primary transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">限制合作機構</label>
            <input
              type="text"
              placeholder="Affiliation Name"
              value={searchParams.a}
              onChange={(e) => setSearchParams({ ...searchParams, a: e.target.value })}
              className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-primary transition-all"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full flex items-center justify-center gap-2 bg-accent-primary hover:bg-blue-400 text-bg-dark font-black py-2 rounded-xl transition-all shadow-lg shadow-accent-primary/20"
            >
              <Search className="w-4 h-4" /> 啟動分析
            </button>
          </div>
        </div>
      </div>

      {/* Results Container */}
      <div id="coop-dash-results">
        {isLoading && (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-text-sec font-bold animate-pulse">正在運算多維度合作統計資料...</p>
          </div>
        )}

        {!activeParams && !isLoading && (
          <div className="py-20 text-center bg-bg-card border border-dashed border-border-color rounded-3xl">
            <LayoutDashboard className="w-12 h-12 text-text-sec mx-auto mb-4 opacity-20" />
            <p className="text-text-sec">請在上方輸入主體資訊後點擊「啟動分析」以生成數據圖表</p>
          </div>
        )}

        {activeParams && !isLoading && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderSection('🌍 合作國家分佈統計', countryQuery.data || [], 'entity_name')}
            {renderSection('🏛 合作機構分佈統計', affQuery.data || [], 'entity_name')}
            {renderSection('👤 合作作者排行統計', authorQuery.data || [], 'author_id', true)}
          </div>
        )}
      </div>
    </div>
  );
};

export default CooperationDashboard;
