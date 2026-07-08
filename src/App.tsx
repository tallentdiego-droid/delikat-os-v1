import { useMemo, useState } from 'react';
import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Plus, Search, Settings, Sparkles, Utensils } from 'lucide-react';
import Layout from './components/Layout';
import ToastContainer from './components/ToastContainer';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import Recipes from './pages/Recipes';
import SOPs from './pages/SOPs';
import SettingsPage from './pages/Settings';
import Training from './pages/Training';

type Page = 'dashboard' | 'knowledge' | 'recipes' | 'sops' | 'training' | 'settings';

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  knowledge: 'Knowledge Base',
  recipes: 'Recipes',
  sops: 'SOPs & Manuals',
  training: 'Training',
  settings: 'Settings',
};

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

  const headerActions = useMemo(() => {
    const openKnowledgeBase = (): void => setPage('knowledge');
    const openSOPs = (): void => {
      setPage('sops');
      setSopCreateRequestId((current) => current + 1);
    };

    switch (page) {
      case 'dashboard':
        return (
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50" onClick={openKnowledgeBase} type="button">
              <Search size={15} />
              Search SOPs
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800" onClick={openSOPs} type="button">
              <Plus size={15} />
              New SOP
            </button>
          </div>
        );
      case 'knowledge':
      case 'sops':
        return (
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800" onClick={openSOPs} type="button">
            <Sparkles size={15} />
            New SOP
          </button>
        );
      default:
        return null;
    }
  }, [page]);

  const headerTitle = pageTitles[page];

  return (
    <>
      <Layout
        activePage={page}
        headerActions={headerActions}
        headerTitle={headerTitle}
        navigation={navigation}
        onNavigate={(nextPage) => setPage(nextPage as Page)}
      >
        {page === 'dashboard' ? (
          <Dashboard
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
          <KnowledgeBase
            initialSearchQuery={knowledgeSearchQuery}
            initialSearchRequestId={knowledgeSearchRequestId}
          />
        ) : page === 'recipes' ? (
          <Recipes />
        ) : page === 'sops' ? (
          <SOPs
            createRequestId={sopCreateRequestId}
            initialSelectedId={sopSelectedId}
            initialSelectedRequestId={sopSelectedRequestId}
            onOpenKnowledgeBase={() => setPage('knowledge')}
          />
        ) : page === 'training' ? (
          <Training onOpenKnowledgeBase={() => setPage('knowledge')} />
        ) : (
          <SettingsPage />
        )}
      </Layout>
      <ToastContainer />
    </>
  );
}

export default App;
