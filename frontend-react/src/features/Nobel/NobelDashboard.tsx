import React, { useState } from 'react';
import { useNobelSummary, useNobelTwAuthors, useNobelDetails } from '../../api/hooks';
import { Award, Search, User, FileText, ChevronRight, ExternalLink } from 'lucide-react';

const NobelDashboard: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'tw' | 'details'>('summary');
  const [filters, setFilters] = useState({
    category: '',
    last_name: '',
    first_name: '',
    tw_author_id: '',
    tw_surname: '',
    tw_given_name: '',
  });

  const summaryQuery = useNobelSummary(filters);
  const twAuthorsQuery = useNobelTwAuthors(filters);
  const detailsQuery = useNobelDetails(filters);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const renderSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {summaryQuery.data?.map((nobel, i) => (
        <div key={i} className="bg-bg-card border border-border-color rounded-2xl p-6 hover:border-accent-primary/50 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-sec bg-white/5 px-2 py-1 rounded">
              {nobel.categories}
            </span>
          </div>
          <h4 className="text-xl font-bold mb-2 group-hover:text-accent-primary transition-colors">
            {nobel.nobel_first_name} {nobel.nobel_last_name}
          </h4>
          <div className="space-y-3 pt-4 border-t border-border-color">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-sec">共同發表論文</span>
              <span className="text-sm font-black text-white">{nobel.paper_count} 篇</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-sec">臺灣合作學者數</span>
              <span className="text-sm font-black text-accent-primary">{nobel.tw_author_count} 位</span>
            </div>
          </div>
          <a 
            href={nobel.nobel_link} 
            target="_blank" 
            className="mt-6 w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
          >
            SCOPUS 檔案 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ))}
    </div>
  );

  const renderTwAuthors = () => (
    <div className="overflow-x-auto rounded-2xl border border-border-color bg-bg-card shadow-xl">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-white/5 border-b border-border-color text-[10px] text-text-sec font-black uppercase tracking-widest">
            <th className="px-6 py-4">學者姓名</th>
            <th className="px-6 py-4">所屬機構</th>
            <th className="px-6 py-4 text-center">合作諾獎主數</th>
            <th className="px-6 py-4 text-center">總合作論文數</th>
            <th className="px-6 py-4">合作對象</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color">
          {twAuthorsQuery.data?.map((author, i) => (
            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
              <td className="px-6 py-4">
                <div className="font-bold text-white group-hover:text-accent-primary transition-colors">{author.surname} {author.given_name}</div>
                <div className="text-[10px] text-text-sec font-mono mt-0.5">{author.author_id}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-xs text-text-primary">{author.affiliation}</div>
                <div className="text-[10px] text-text-sec uppercase">{author.city}</div>
              </td>
              <td className="px-6 py-4 text-center font-black text-accent-primary">{author.nobel_count}</td>
              <td className="px-6 py-4 text-center font-black text-white">{author.paper_count}</td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {author.collaborated_nobels.split(',').map((n: string, idx: number) => (
                    <span key={idx} className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                      {n.trim()}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Filter Panel */}
      <div className="bg-bg-card border border-border-color rounded-2xl p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">獎項類別</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-primary transition-all"
            >
              <option value="">全部類別</option>
              <option value="Physics">物理學 (Physics)</option>
              <option value="Chemistry">化學 (Chemistry)</option>
              <option value="Medicine">醫學 (Medicine)</option>
              <option value="Economics">經濟學 (Economics)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">諾獎主姓氏</label>
            <input
              type="text"
              name="last_name"
              placeholder="Nobel Last Name"
              value={filters.last_name}
              onChange={handleFilterChange}
              className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-primary transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">臺灣學者 ID</label>
            <input
              type="text"
              name="tw_author_id"
              placeholder="TW Author ID"
              value={filters.tw_author_id}
              onChange={handleFilterChange}
              className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-primary transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">臺灣學者姓名</label>
            <input
              type="text"
              name="tw_surname"
              placeholder="Surname"
              value={filters.tw_surname}
              onChange={handleFilterChange}
              className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-primary transition-all"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-bg-dark font-black py-2 rounded-xl transition-all shadow-lg shadow-yellow-500/20">
              <Search className="w-4 h-4" /> 篩選清單
            </button>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-4 border-b border-border-color">
        {[
          { id: 'summary', label: '諾獎主概覽', icon: Award },
          { id: 'tw', label: '臺灣合作學者', icon: User },
          { id: 'details', label: '論文明細查詢', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all border-b-2 relative -mb-[2px] ${
              activeSubTab === tab.id 
              ? 'text-yellow-500 border-yellow-500 bg-yellow-500/5' 
              : 'text-text-sec border-transparent hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {(summaryQuery.isLoading || twAuthorsQuery.isLoading || detailsQuery.isLoading) && (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-text-sec font-bold animate-pulse">正在索取全球諾貝爾獎合作大數據...</p>
          </div>
        )}

        {!summaryQuery.isLoading && activeSubTab === 'summary' && renderSummary()}
        {!twAuthorsQuery.isLoading && activeSubTab === 'tw' && renderTwAuthors()}
        {!detailsQuery.isLoading && activeSubTab === 'details' && (
           <div className="bg-bg-card border border-border-color rounded-2xl p-8 text-center text-text-sec italic">
             論文明細模式已就緒，請在上方輸入查詢條件。
           </div>
        )}
      </div>
    </div>
  );
};

export default NobelDashboard;
