import React, { useState, useMemo } from 'react';
import { useAuthorPapers } from '../../api/hooks';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';

interface PaperListProps {
  authorId: string;
}

type SortKey = 'scopus_id' | 'citedby_count_SJR' | 'SJR_Best_Quartile' | 'aggregation_type' | 'cover_date' | 'citation_count';

const PaperList: React.FC<PaperListProps> = ({ authorId }) => {
  const { data: papers, isLoading } = useAuthorPapers(authorId);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'citedby_count_SJR',
    direction: 'desc',
  });

  const sortedPapers = useMemo(() => {
    if (!papers) return [];
    return [...papers].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (['citedby_count_SJR', 'citation_count'].includes(sortConfig.key)) {
        return sortConfig.direction === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
      }

      aVal = (aVal || '').toString().toLowerCase();
      bVal = (bVal || '').toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [papers, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  if (isLoading) return <div className="py-20 text-center text-text-sec animate-pulse">正在載入論文列表...</div>;
  if (!papers || papers.length === 0) return <div className="py-10 text-center text-text-sec italic">查無論文資料</div>;

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortConfig.key !== col) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h4 className="text-lg font-bold border-l-4 border-accent-primary pl-3">論文列表 (共 {papers.length} 篇)</h4>
        <span className="text-[10px] text-text-sec uppercase tracking-widest font-bold">點擊標題排序</span>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-border-color bg-bg-dark shadow-2xl">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-border-color">
              <th className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('scopus_id')}>
                <div className="flex items-center gap-1.5 uppercase tracking-tighter font-bold text-text-sec text-[11px]">Scopus ID <SortIcon col="scopus_id" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors text-center" onClick={() => handleSort('citedby_count_SJR')}>
                <div className="flex items-center justify-center gap-1.5 uppercase tracking-tighter font-bold text-text-sec text-[11px]">Cited (SJR) <SortIcon col="citedby_count_SJR" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors text-center" onClick={() => handleSort('SJR_Best_Quartile')}>
                <div className="flex items-center justify-center gap-1.5 uppercase tracking-tighter font-bold text-text-sec text-[11px]">Quartile <SortIcon col="SJR_Best_Quartile" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('aggregation_type')}>
                <div className="flex items-center gap-1.5 uppercase tracking-tighter font-bold text-text-sec text-[11px]">Type <SortIcon col="aggregation_type" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('cover_date')}>
                <div className="flex items-center gap-1.5 uppercase tracking-tighter font-bold text-text-sec text-[11px]">Date <SortIcon col="cover_date" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors text-center" onClick={() => handleSort('citation_count')}>
                <div className="flex items-center justify-center gap-1.5 uppercase tracking-tighter font-bold text-text-sec text-[11px]">Citations <SortIcon col="citation_count" /></div>
              </th>
              <th className="px-4 py-3 text-text-sec uppercase tracking-tighter font-bold text-[11px]">Publication Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color">
            {sortedPapers.map((paper) => (
              <tr key={paper.scopus_id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3 font-mono text-[12px]">
                  <a 
                    href={`https://www.scopus.com/pages/publications/${paper.scopus_id}`} 
                    target="_blank" 
                    className="text-accent-primary hover:underline flex items-center gap-1"
                  >
                    {paper.scopus_id} <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
                <td className="px-4 py-3 text-center font-bold text-accent-primary">{paper.citedby_count_SJR || 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    paper.SJR_Best_Quartile === 'Q1' ? 'bg-green-500/20 text-green-400' :
                    paper.SJR_Best_Quartile === 'Q2' ? 'bg-blue-500/20 text-blue-400' :
                    paper.SJR_Best_Quartile === 'Q3' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {paper.SJR_Best_Quartile || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-sec">{paper.aggregation_type || '—'}</td>
                <td className="px-4 py-3">{paper.cover_date || '—'}</td>
                <td className="px-4 py-3 text-center font-medium">{paper.citation_count || 0}</td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="truncate text-text-primary group-hover:text-white transition-colors" title={paper.publicationName_Source}>
                    {paper.publicationName_Source || '—'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaperList;
