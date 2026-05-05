import React from 'react';

interface StatItem {
  label: string;
  cnt: number;
}

interface BarStatsProps {
  title: string;
  items: StatItem[] | undefined;
}

const BarStats: React.FC<BarStatsProps> = ({ title, items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="p-6 text-center text-text-sec italic bg-white/5 rounded-xl border border-dashed border-border-color">
        目前尚無相關數據
      </div>
    );
  }

  const maxVal = Math.max(...items.map(i => i.cnt));

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-bold border-l-4 border-accent-primary pl-3">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
        {items.map((item, idx) => {
          const pct = maxVal > 0 ? (item.cnt / maxVal) * 100 : 0;
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium px-1">
                <span className="text-text-primary truncate max-w-[80%]" title={item.label}>{item.label}</span>
                <span className="text-accent-primary font-bold">{item.cnt} 筆</span>
              </div>
              <div className="h-2 bg-bg-dark rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-accent-primary transition-all duration-1000 ease-out"
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BarStats;
