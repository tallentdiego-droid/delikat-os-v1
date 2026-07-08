import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  headerTitle: string;
  headerActions?: React.ReactNode;
  navigation?: Array<{ id: string; label: string; icon: React.ElementType }>;
}

export default function Layout({
  children,
  activePage,
  onNavigate,
  headerTitle,
  headerActions,
  navigation,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        activePage={activePage}
        navigation={navigation}
        isOpen={sidebarOpen}
        onNavigate={onNavigate}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          actions={headerActions}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          title={headerTitle}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
