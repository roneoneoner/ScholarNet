import React, { useState } from 'react';
import { useAuthorFull } from '../../api/hooks';
import { ExternalLink, GraduationCap, Award, BookOpen, MessageSquare, BarChart3, X, Download, Globe, LayoutDashboard, Database, FileText } from 'lucide-react';
import BarStats from '../../components/BarStats';
import PaperList from './PaperList';
import { exportToImage } from '../../utils/export';

interface AuthorProfileProps {
  authorId: string;
  onClose: () => void;
}

type ProfileTab = 'plan_type' | 'plan_disc' | 'fields' | 'papers' | 'coop' | 'net' | 'nobel' | 'raw';

const AuthorProfile: React.FC<AuthorProfileProps> = ({ authorId, onClose }) => {
  const { data: author, isLoading, isError, error } = useAuthorFull(authorId);
  const [activeTab, setActiveTab] = useState<ProfileTab>('plan_type');

  // ... (keep the loading and error states)

  const tabs = [
    { id: 'plan_type', label: '計畫類別', icon: BarChart3 },
    { id: 'plan_disc', label: '學門分佈', icon: BarChart3 },
    { id: 'fields', label: '研究領域', icon: Award },
    { id: 'papers', label: '論文列表', icon: FileText },
    { id: 'coop', label: '合作統計', icon: LayoutDashboard },
    { id: 'net', label: '網路地位', icon: Globe },
    { id: 'nobel', label: '諾獎合作', icon: Award },
    { id: 'raw', label: '稽核數據', icon: Database },
  ];

  return (
    <div className="fixed inset-0 bg-bg-dark/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-bg-card border border-border-color w-full max-w-6xl max-h-full overflow-hidden rounded-3xl shadow-2xl flex flex-col slide-in-from-bottom-8 duration-500 fill-mode-forwards">
        
        {/* Header */}
        <div className="p-8 pb-6 border-b border-border-color relative">
          <button onClick={onClose} className="absolute right-6 top-6 p-2 rounded-full hover:bg-white/5 transition-colors group">
            <X className="w-6 h-6 text-text-sec group-hover:text-text-primary" />
          </button>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-3xl font-black text-white">
                    {author.surname} {author.given_name}
                  </h2>
                  {author.name_chinese && (
                    <span className="text-2xl text-text-sec font-medium">({author.name_chinese})</span>
                  )}
                  <div className="flex gap-2">
                    {author.top2_rank && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase tracking-tighter">
                        <Award className="w-3 h-3" /> Top 2%
                      </div>
                    )}
                    {author.ieee_year && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-tighter">
                        <Award className="w-3 h-3" /> IEEE Fellow
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-accent-primary font-bold">
                  <GraduationCap className="w-5 h-5" />
                  <span>{author.title_c302 || '研究員'} @ {author.ip_doc_parent_preferred_name || author.organization_c302}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <a 
                  href={author.scopus_link || '#'} 
                  target="_blank" 
                  className="flex items-center gap-2 px-4 py-2 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-bg-dark rounded-xl text-xs font-black transition-all border border-accent-primary/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> SCOPUS PROFILE
                </a>
                {author.rsNo && (
                  <a 
                    href={`https://arspb.nstc.gov.tw/NSCWebFront/modules/talentSearch/talentSearch.do?action=initBasic&rsNo=${author.rsNo}&LANG=chi`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 text-text-sec hover:text-text-primary rounded-xl text-xs font-black transition-all border border-white/5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> NSTC (rsNo: {author.rsNo})
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
              {[
                { label: 'H-Index', val: author.h_index || 0, icon: BarChart3, color: 'text-blue-400' },
                { label: '論文數', val: author.document_count || 0, icon: BookOpen, color: 'text-green-400' },
                { label: '引用數', val: author.cited_by_count || 0, icon: MessageSquare, color: 'text-purple-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-bg-dark/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] group hover:border-accent-primary/30 transition-all">
                  <stat.icon className={`w-5 h-5 mb-2 ${stat.color}`} />
                  <span className="text-2xl font-black text-white leading-none mb-1">{stat.val}</span>
                  <span className="text-[10px] text-text-sec uppercase tracking-widest font-bold">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 px-8 pt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProfileTab)}
              className={`px-6 py-4 font-bold text-sm transition-all border-b-2 relative ${
                activeTab === tab.id 
                ? 'text-accent-primary border-accent-primary bg-accent-primary/5' 
                : 'text-text-sec border-transparent hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          {activeTab === 'plan_type' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <BarStats title="國科會計畫 - 補助類別分佈" items={author.plan_type_stats} />
            </div>
          )}
          {activeTab === 'plan_disc' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <BarStats title="國科會計畫 - 學門代碼分佈" items={author.plan_discipline_stats} />
            </div>
          )}
          {activeTab === 'fields' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <BarStats title="研究領域分析 (基於論文摘要 Top 5% 關鍵詞)" items={author.non_nstc_fields} />
            </div>
          )}
          {activeTab === 'papers' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <PaperList authorId={authorId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthorProfile;
