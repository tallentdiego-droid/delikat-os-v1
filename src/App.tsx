import { useState } from 'react';
import { BookOpen, Bot, ClipboardList, GraduationCap, LayoutDashboard, Search, Settings, Utensils } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgeWorkspacePage } from './pages/KnowledgeWorkspacePage';

type Page = 'home' | 'studio';

const navigation = [
  { id: 'home' as const, label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'studio' as const, label: 'Knowledge Base', icon: BookOpen, active: true },
  { id: 'recipes' as const, label: 'Recipes', icon: Utensils, active: false },
  { id: 'sops' as const, label: 'SOPs & Manuals', icon: ClipboardList, active: false },
  { id: 'training' as const, label: 'Training', icon: GraduationCap, active: false },
  { id: 'ai' as const, label: 'AI Manager', icon: Bot, active: false },
  { id: 'settings' as const, label: 'Settings', icon: Settings, active: false },
];

export function App(): JSX.Element {
  const [page, setPage] = useState<Page>('home');
  const [studioDraftSeed, setStudioDraftSeed] = useState(0);
  const [studioSearchSeed, setStudioSearchSeed] = useState('');
  const [studioSearchRequestId, setStudioSearchRequestId] = useState(0);
  const [studioSelectedObjectId, setStudioSelectedObjectId] = useState<string | null>(null);
  const [studioSelectedObjectRequestId, setStudioSelectedObjectRequestId] = useState(0);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">D</div>
          <div>
            <strong>Delikat OS</strong>
            <span>Studio workspace</span>
          </div>
        </div>
        <nav className="navList" aria-label="Primary">
          <p className="navSectionLabel">Primary</p>
          {navigation.filter((item) => item.active).map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={page === item.id ? 'navItem active' : 'navItem'}
                key={item.id}
                onClick={() => setPage(item.id as Page)}
                type="button"
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <p className="navSectionLabel navSectionSpacer">Hidden for now</p>
          {navigation.filter((item) => !item.active).map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-disabled="true"
                className="navItem hidden"
                key={item.id}
                disabled
                type="button"
                title="Hidden until the next phase"
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
            <span className="eyebrow">Delikat OS</span>
            <h1>{page === 'home' ? 'Dashboard' : 'Knowledge Base'}</h1>
          </div>
          <div className="headerSearch">
            <Search aria-hidden="true" size={16} />
            <span>Search SOPs in Studio</span>
          </div>
        </header>

        <main className="mainPanel">
          {page === 'home' ? (
            <DashboardPage
              onContinueLastDraft={(id) => {
                setStudioSelectedObjectId(id);
                setStudioSelectedObjectRequestId((current) => current + 1);
                setStudioDraftSeed((current) => current + 1);
                setPage('studio');
              }}
              onCreateSOP={() => {
                setStudioDraftSeed((current) => current + 1);
                setPage('studio');
              }}
              onOpenStudio={() => setPage('studio')}
              onSearchStudio={(query) => {
                setStudioSearchSeed(query);
                setStudioSearchRequestId((current) => current + 1);
                setPage('studio');
              }}
            />
          ) : (
            <KnowledgeWorkspacePage
              initialSelectedObjectId={studioSelectedObjectId}
              initialSelectedObjectRequestId={studioSelectedObjectRequestId}
              initialSearchQuery={studioSearchSeed}
              initialSearchRequestId={studioSearchRequestId}
              openNewSOPRequestId={studioDraftSeed}
            />
          )}
        </main>
      </div>
    </div>
  );
}
