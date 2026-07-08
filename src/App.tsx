import { useMemo, useState } from 'react';
import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Search, Settings, Utensils } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { RecipesPage } from './pages/RecipesPage';
import { SOPsPage } from './pages/SOPsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TrainingPage } from './pages/TrainingPage';

type Page = 'dashboard' | 'knowledge' | 'recipes' | 'sops' | 'training' | 'settings';

const navigation: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'recipes', label: 'Recipes', icon: Utensils },
  { id: 'sops', label: 'SOPs & Manuals', icon: ClipboardList },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function App(): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard');
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState('');
  const [knowledgeSearchRequestId, setKnowledgeSearchRequestId] = useState(0);
  const [sopCreateRequestId, setSopCreateRequestId] = useState(0);
  const [sopSelectedId, setSopSelectedId] = useState<string | null>(null);
  const [sopSelectedRequestId, setSopSelectedRequestId] = useState(0);

  const headerLabel = useMemo(() => {
    switch (page) {
      case 'knowledge':
        return 'Knowledge Base';
      case 'recipes':
        return 'Recipes';
      case 'sops':
        return 'SOPs & Manuals';
      case 'training':
        return 'Training';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  }, [page]);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">D</div>
          <div>
            <strong>Delikat OS</strong>
            <span>Knowledge workspace</span>
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
            <span className="eyebrow">Delikat Studio</span>
            <h1>{headerLabel}</h1>
          </div>
          <div className="headerSearch">
            <Search aria-hidden="true" size={16} />
            <span>Live Supabase knowledge</span>
          </div>
        </header>

        <main className="mainPanel">
          {page === 'dashboard' ? (
            <DashboardPage
              onCreateSOP={() => {
                setSopCreateRequestId((current) => current + 1);
                setPage('sops');
              }}
              onContinueLastDraft={(id) => {
                setSopSelectedId(id);
                setSopSelectedRequestId((current) => current + 1);
                setPage('sops');
              }}
              onOpenKnowledgeBase={() => setPage('knowledge')}
              onSearchKnowledge={(query) => {
                setKnowledgeSearchQuery(query);
                setKnowledgeSearchRequestId((current) => current + 1);
                setPage('knowledge');
              }}
            />
          ) : page === 'knowledge' ? (
            <KnowledgeBasePage
              initialSearchQuery={knowledgeSearchQuery}
              initialSearchRequestId={knowledgeSearchRequestId}
            />
          ) : page === 'recipes' ? (
            <RecipesPage />
          ) : page === 'sops' ? (
            <SOPsPage
              createRequestId={sopCreateRequestId}
              initialSelectedId={sopSelectedId}
              initialSelectedRequestId={sopSelectedRequestId}
              onOpenKnowledgeBase={() => setPage('knowledge')}
            />
          ) : page === 'training' ? (
            <TrainingPage onOpenKnowledgeBase={() => setPage('knowledge')} />
          ) : (
            <SettingsPage />
          )}
        </main>
      </div>
    </div>
  );
}
