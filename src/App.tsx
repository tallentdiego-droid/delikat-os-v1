import { useState } from 'react';
import { Brain, Database, LayoutDashboard, Search } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { CommandCenterPage } from './pages/CommandCenterPage';

type Page = 'dashboard' | 'knowledge' | 'command';

const navigation = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'knowledge' as const, label: 'Knowledge Base', icon: Database },
  { id: 'command' as const, label: 'AI Command Center', icon: Brain },
];

function pageTitle(page: Page): string {
  if (page === 'knowledge') return 'Knowledge Base';
  if (page === 'command') return 'AI Command Center';
  return 'Dashboard';
}

export function App(): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">D</div>
          <div>
            <strong>Delikat OS</strong>
            <span>Operating knowledge</span>
          </div>
        </div>
        <nav className="navList" aria-label="Primary">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={page === item.id ? 'navItem active' : 'navItem'}
                key={item.id}
                onClick={() => setPage(item.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topHeader">
          <div>
            <span className="eyebrow">Live Supabase workspace</span>
            <h1>{pageTitle(page)}</h1>
          </div>
          <div className="headerSearch">
            <Search aria-hidden="true" size={16} />
            <span>Approved knowledge only</span>
          </div>
        </header>

        <main className="mainPanel">
          {page === 'dashboard' && <DashboardPage />}
          {page === 'knowledge' && <KnowledgeBasePage />}
          {page === 'command' && <CommandCenterPage />}
        </main>
      </div>
    </div>
  );
}
