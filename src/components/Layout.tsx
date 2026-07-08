import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  headerTitle: string;
  headerActions?: React.ReactNode;
}

export default function Layout({ children, activePage, onNavigate, headerTitle, headerActions }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="appShell">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="workspace">
        <Header
          title={headerTitle}
          actions={headerActions}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="mainPanel">
          {children}
        </main>
      </div>
    </div>
  );
}
