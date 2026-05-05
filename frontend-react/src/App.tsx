import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Search, Users, Globe, Award, Database, LayoutDashboard } from 'lucide-react';
import AuthorSearch from './features/AuthorSearch/AuthorSearch';
import CooperationDashboard from './features/Cooperation/CooperationDashboard';
import NetworkCentrality from './features/Network/NetworkCentrality';
import NobelDashboard from './features/Nobel/NobelDashboard';
import RawDataView from './features/RawData/RawDataView';
import { useMetadata } from './api/hooks';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type Tab = 'info' | 'coop' | 'net' | 'nobel' | 'raw';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const { isLoading: isMetaLoading } = useMetadata();

  const tabs = [
    { id: 'info', label: '作者搜尋', icon: Search },
    { id: 'coop', label: '合作儀表板', icon: LayoutDashboard },
    { id: 'net', label: '網路中心性', icon: Globe },
    { id: 'nobel', label: '諾貝爾獎', icon: Award },
    { id: 'raw', label: '數據全覽', icon: Database },
  ];

  if (isMetaLoading) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center gap-6 text-white">
        <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black tracking-widest uppercase">ScholarNet Engine</h2>
          <p className="text-text-sec text-sm animate-pulse">正在初始化全球學術中繼資料庫...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border-color bg-bg-card flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center">
            <Users className="text-bg-dark w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">ScholarNet</h1>
            <p className="text-[10px] text-text-sec uppercase tracking-wider">Academic Network Analytics</p>
          </div>
        </div>

        <nav className="flex h-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 h-full border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent-primary text-accent-primary bg-accent-primary/5'
                  : 'border-transparent text-text-sec hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto">
          {activeTab === 'info' && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">🧑‍💻 作者搜尋與分析</h2>
              </div>
              <AuthorSearch />
            </section>
          )}
          
          {activeTab === 'coop' && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">🤝 合作儀表板</h2>
              </div>
              <CooperationDashboard />
            </section>
          )}

          {activeTab === 'net' && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">🌐 網絡中心性分析</h2>
              </div>
              <NetworkCentrality />
            </section>
          )}

          {activeTab === 'nobel' && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">🏅 諾貝爾獎合作分析</h2>
              </div>
              <NobelDashboard />
            </section>
          )}

          {activeTab === 'raw' && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">📄 數據全覽與稽核</h2>
              </div>
              <RawDataView />
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout />
    </QueryClientProvider>
  );
};

export default App;
