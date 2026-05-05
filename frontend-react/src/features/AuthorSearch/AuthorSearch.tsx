import React, { useState } from 'react';
import { useMetadata, useAuthorSearch } from '../../api/hooks';
import { Search, RotateCcw, ChevronDown } from 'lucide-react';
import AuthorProfile from './AuthorProfile';

const AuthorSearch: React.FC = () => {
  const { data: meta } = useMetadata();
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
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

  const { data: authors, isLoading, refetch, isError, error } = useAuthorSearch(filters);

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

  const filterFields = [
    { name: 'author_id', label: '作者 ID (Scopus)', placeholder: '作者 ID' },
    { name: 'rsNo', label: 'NSTC rsNo', placeholder: 'rsNo' },
    { name: 'name_chinese', label: '中文姓名 (C302)', placeholder: '中文姓名' },
    { name: 'name_english', label: '英文姓名 (C302)', placeholder: '英文姓名' },
    { name: 'organization', label: '機構名稱 (C302)', placeholder: '機構名稱', metaKey: 'c302_orgs' },
    { name: 'title', label: '職稱 (C302)', placeholder: '職稱' },
    { name: 'surname', label: '姓氏 (Surname)', placeholder: 'Surname' },
    { name: 'given_name', label: '名字 (Given Name)', placeholder: 'Given Name' },
    { name: 'affiliation', label: '機構名稱 (Scopus)', placeholder: 'Affiliation', metaKey: 'scopus_affs' },
    { name: 'country', label: '國家', placeholder: 'Country', metaKey: 'countries' },
    { name: 'city', label: '城市', placeholder: 'City', metaKey: 'cities' },
    { name: 'h_index', label: '最小 H-index', placeholder: 'H-index', type: 'number' },
    { name: 'doc_count_min', label: '最小論文數', placeholder: '論文數', type: 'number' },
    { name: 'cite_count_min', label: '最小被引用數', placeholder: '引用數', type: 'number' },
    { name: 'non_nstc_area', label: '摘要領域 (Top 5%)', placeholder: '領域', metaKey: 'non_nstc_areas' },
    { name: 'grant_category', label: '國科會補助類別', placeholder: '類別', metaKey: 'grant_cats' },
    { name: 'discipline_code', label: '國科會學門代碼', placeholder: '學門代碼', metaKey: 'disc_codes' },
    { name: 'plan_name', label: '國科會計畫名稱', placeholder: '計畫名稱' },
    { name: 'pub_start', label: '出版年份 (起)', placeholder: '年份', type: 'number' },
    { name: 'pub_end', label: '出版年份 (訖)', placeholder: '年份', type: 'number' },
    { name: 'pub_name', label: '期刊名稱 (Scopus)', placeholder: '期刊名稱' },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-white/5 px-6 py-4 border-b border-border-color flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Search className="w-5 h-5 text-accent-primary" />
            多維度智慧篩選
          </h3>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-sec hover:text-text-primary transition-all text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              重設
            </button>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-accent-primary hover:bg-blue-400 text-bg-dark transition-all text-sm font-bold shadow-lg shadow-accent-primary/20"
            >
              <Search className="w-4 h-4" />
              執行篩選
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filterFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="text-xs font-bold text-text-sec uppercase tracking-wider">{field.label}</label>
                <div className="relative group">
                  <input
                    type={field.type || 'text'}
                    name={field.name}
                    value={filters[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2.5 text-sm focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-all"
                  />
                  {field.metaKey && meta && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                      <select
                        onChange={(e) => handleQuickAdd(field.name, e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        value=""
                      >
                        <option value="">-- 快速選擇 --</option>
                        {(meta[field.metaKey as keyof typeof meta] as string[] || []).map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-text-sec group-hover:text-text-primary transition-colors pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="is_ieee"
                  checked={filters.is_ieee}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-border-color bg-bg-dark text-accent-primary focus:ring-offset-bg-dark"
                />
                <span className="text-sm font-medium text-text-sec group-hover:text-text-primary transition-colors">存在於 IEEE 資料</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="is_top2"
                  checked={filters.is_top2}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-border-color bg-bg-dark text-accent-primary focus:ring-offset-bg-dark"
                />
                <span className="text-sm font-medium text-text-sec group-hover:text-text-primary transition-colors">存在於 Top 2% 資料</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold flex items-center gap-2">
            搜尋結果
            {authors && <span className="bg-accent-primary/10 text-accent-primary text-xs px-2.5 py-1 rounded-full">{authors.length} 筆</span>}
          </h3>
        </div>

        {isLoading && <div className="text-center py-20 text-text-sec animate-pulse">正在搜尋符合條件的學者...</div>}
        {isError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">⚠ {(error as Error).message}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {authors?.map((author) => (
            <div key={author.author_id} className="bg-bg-card border border-border-color rounded-xl p-5 hover:border-accent-primary/50 transition-all group shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold group-hover:text-accent-primary transition-colors">
                    {author.surname} {author.given_name}
                  </h4>
                  <p className="text-sm text-text-sec mt-1">{author.ip_doc_parent_preferred_name || '機構資訊未提供'}</p>
                </div>
                <button 
                  onClick={() => setSelectedAuthorId(author.author_id)}
                  className="px-4 py-2 bg-white/5 hover:bg-accent-primary hover:text-bg-dark rounded-lg text-sm font-bold transition-all"
                >
                  檢視全方位資料
                </button>
              </div>
              <div className="flex gap-6 text-xs text-text-sec border-t border-border-color pt-4">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>📄 論文數: {author.document_count || 0}</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>💬 被引用: {author.cited_by_count || 0}</span>
              </div>
            </div>
          ))}
          {authors?.length === 0 && <div className="col-span-full text-center py-20 bg-white/5 rounded-xl border border-dashed border-border-color text-text-sec">查無符合條件之作者資訊</div>}
          {!authors && !isLoading && <div className="col-span-full text-center py-20 bg-white/5 rounded-xl border border-dashed border-border-color text-text-sec">請設定篩選條件後點擊「執行篩選」</div>}
        </div>
      </div>

      {selectedAuthorId && (
        <AuthorProfile 
          authorId={selectedAuthorId} 
          onClose={() => setSelectedAuthorId(null)} 
        />
      )}
    </div>
  );
};

export default AuthorSearch;
