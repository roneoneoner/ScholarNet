import React, { useState } from 'react';
import { useAuthorRaw } from '../../api/hooks';
import { Database, Search, Table, ShieldCheck, Cpu, Award } from 'lucide-react';

const RawDataView: React.FC = () => {
  const [authorId, setAuthorId] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useAuthorRaw(activeId);

  const handleSearch = () => {
    if (!authorId.trim()) return;
    setActiveId(authorId.trim());
  };

  const renderRawSection = (title: string, icon: React.ReactNode, fields: { label: string; value: any }[]) => {
    const validFields = fields.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
    
    return (
      <div className="bg-bg-card border border-border-color rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-white/5 px-6 py-4 border-b border-border-color flex items-center gap-2 text-text-primary font-bold">
          {icon}
          {title}
        </div>
        <div className="p-6">
          {validFields.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {validFields.map((f, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-[10px] font-black text-text-sec uppercase tracking-widest">{f.label}</div>
                  <div className="text-sm font-mono bg-bg-dark border border-white/5 rounded-lg px-3 py-1.5 text-accent-primary break-all">
                    {f.value.toString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-sec italic">此資料表中無該作者紀錄</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="bg-bg-card border border-border-color rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-[10px] font-black text-text-sec uppercase tracking-widest">請輸入精確的 Scopus Author ID</label>
          <div className="relative">
            <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-sec" />
            <input
              type="text"
              placeholder="例如: 7004412211"
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              className="w-full bg-bg-dark border border-border-color rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-accent-primary transition-all"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          className="w-full md:w-auto px-10 py-3 bg-accent-primary hover:bg-blue-400 text-bg-dark font-black rounded-xl transition-all shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 mt-auto"
        >
          <Search className="w-5 h-5" /> 關聯資料全覽
        </button>
      </div>

      {isLoading && (
        <div className="py-20 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-sec font-bold animate-pulse">正在穿透所有關聯資料庫並對齊欄位屬性...</p>
        </div>
      )}

      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
          ⚠ 載入失敗: {(error as Error).message}
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-10 w-1 px-1 bg-accent-primary rounded-full"></div>
            <h3 className="text-2xl font-black">作者 ID: {activeId} <span className="text-text-sec font-medium text-lg ml-2">關聯屬性矩陣</span></h3>
          </div>

          {renderRawSection('Scopus 基礎屬性 (data_author_name_aff_country)', <Table className="w-5 h-5 text-blue-400" />, [
            { label: 'Surname', value: data.surname },
            { label: 'Given Name', value: data.given_name },
            { label: 'H-Index', value: data.h_index },
            { label: 'Doc Count', value: data.document_count },
            { label: 'Cited Count', value: data.cited_by_count },
            { label: 'Affiliation ID', value: data.affiliation_id },
            { label: 'Preferred Aff', value: data.ip_doc_parent_preferred_name },
            { label: 'City', value: data.ip_doc_address_city },
            { label: 'Country', value: data.ip_doc_address_country },
          ])}

          {renderRawSection('國科會 C302 紀錄 (data_author_c302_Basic)', <ShieldCheck className="w-5 h-5 text-green-400" />, [
            { label: 'NSTC rsNo', value: data.rsNo },
            { label: '中文姓名', value: data.name_chinese },
            { label: '英文姓名', value: data.name_english },
            { label: '所屬機構', value: data.c302_org },
            { label: '職稱', value: data.c302_title },
          ])}

          {renderRawSection('IEEE Fellow 紀錄 (data_author_IEEE_author_id)', <Cpu className="w-5 h-5 text-purple-400" />, [
            { label: 'IEEE Year', value: data.ieee_year },
            { label: 'English Name', value: data.ieee_en },
            { label: 'Chinese Name', value: data.ieee_cn },
            { label: 'Title', value: data.ieee_title },
            { label: 'Contribution', value: data.ieee_contrib },
            { label: 'Affiliation', value: data.ieee_aff_e },
          ])}

          {renderRawSection('Stanford Top 2% (data_author_top2_author_id)', <Award className="w-5 h-5 text-yellow-500" />, [
            { label: 'Global Rank', value: data.top2_rank },
            { label: 'Main Field', value: data.top2_field },
            { label: 'Sub Field 1', value: data.top2_sub1 },
            { label: 'Institution', value: data.top2_inst },
            { label: 'Country', value: data.top2_cntry },
          ])}

          {/* Table Sections (Plans, Fields) can be added here similarly */}
          {data.plans?.length > 0 && (
            <div className="bg-bg-card border border-border-color rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-white/5 px-6 py-4 border-b border-border-color flex items-center gap-2 text-text-primary font-bold">
                <Table className="w-5 h-5 text-accent-primary" />
                國科會計畫原始清單 (data_author_Plan_all)
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-bg-dark/50 text-text-sec uppercase font-black">
                      <th className="px-6 py-3">年度</th>
                      <th className="px-6 py-3">補助類別</th>
                      <th className="px-6 py-3">學門代碼</th>
                      <th className="px-6 py-3">計畫名稱</th>
                      <th className="px-6 py-3">核定經費</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color/50">
                    {data.plans.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-3 font-mono">{p['年度']}</td>
                        <td className="px-6 py-3">{p['補助類別']}</td>
                        <td className="px-6 py-3 font-mono">{p['學門代碼']}</td>
                        <td className="px-6 py-3 truncate max-w-md" title={p['計畫名稱']}>{p['計畫名稱']}</td>
                        <td className="px-6 py-3 font-mono text-green-400 font-bold">
                           {p['核定經費_新台幣'] ? `$${parseInt(p['核定經費_新台幣']).toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!activeId && !isLoading && (
        <div className="py-40 text-center opacity-30">
          <Database className="w-20 h-20 mx-auto mb-6" />
          <p className="text-xl font-bold uppercase tracking-widest">數據關聯引擎待命中</p>
          <p className="text-sm mt-2">請輸入 Author ID 以開始進行全表掃描與屬性對齊</p>
        </div>
      )}
    </div>
  );
};

export default RawDataView;
