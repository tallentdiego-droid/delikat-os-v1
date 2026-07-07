import { useState } from 'react';
import { Brain, BookOpen, Building2, ClipboardList, Database, GraduationCap, LayoutDashboard, Search, Settings, ShieldAlert, Users, Workflow } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgeWorkspacePage } from './pages/KnowledgeWorkspacePage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { ManagerPage } from './pages/ManagerPage';
import { OperationsPage } from './pages/OperationsPage';
import { RolesPage } from './pages/RolesPage';
import { ChecklistsPage } from './pages/ChecklistsPage';
import { AuditsPage } from './pages/AuditsPage';
import { TrainingPage } from './pages/TrainingPage';

type Page = 'home' | 'manager' | 'knowledgeWorkspace' | 'knowledge' | 'organization' | 'operations' | 'roles' | 'training' | 'checklists' | 'audits' | 'command' | 'settings';

const navigation = [
  { id: 'home' as const, label: 'Home', icon: LayoutDashboard },
  { id: 'manager' as const, label: 'Manager OS', icon: ClipboardList },
  { id: 'knowledgeWorkspace' as const, label: 'Knowledge Workspace', icon: BookOpen },
  { id: 'operations' as const, label: 'Operations', icon: Workflow },
  { id: 'roles' as const, label: 'Roles', icon: Users },
  { id: 'training' as const, label: 'Training', icon: GraduationCap },
  { id: 'checklists' as const, label: 'Checklists', icon: ClipboardList },
  { id: 'audits' as const, label: 'Audits', icon: ShieldAlert },
  { id: 'command' as const, label: 'AI Command Center', icon: Brain },
  { id: 'knowledge' as const, label: 'Knowledge', icon: Database },
  { id: 'organization' as const, label: 'Organization', icon: Building2 },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

function pageTitle(page: Page): string {
  if (page === 'manager') return 'Manager OS';
  if (page === 'knowledgeWorkspace') return 'Knowledge Workspace';
  if (page === 'knowledge') return 'Knowledge';
  if (page === 'organization') return 'Organization';
  if (page === 'operations') return 'Operations';
  if (page === 'roles') return 'Roles';
  if (page === 'training') return 'Training';
  if (page === 'checklists') return 'Checklists';
  if (page === 'audits') return 'Audits';
  if (page === 'command') return 'AI Command Center';
  if (page === 'settings') return 'Settings';
  return 'Home';
}

function PlaceholderPage({ label }: { label: string }): JSX.Element {
  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>{label}</h2>
          <p>This module will consume the Knowledge Engine instead of owning knowledge.</p>
        </div>
      </div>
      <div className="placeholderPanel">
        <h3>Knowledge-first foundation</h3>
        <p>Operational content remains centralized in Supabase canonical knowledge.</p>
      </div>
    </section>
  );
}

export function App(): JSX.Element {
  const [page, setPage] = useState<Page>('home');

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
          {page === 'home' && (
            <DashboardPage
              onOpenAudits={() => setPage('audits')}
              onOpenChecklists={() => setPage('checklists')}
              onOpenKnowledgeBase={() => setPage('knowledge')}
              onOpenOperations={() => setPage('operations')}
              onOpenManager={() => setPage('manager')}
              onOpenRoles={() => setPage('roles')}
              onOpenTraining={() => setPage('training')}
            />
          )}
          {page === 'manager' && (
            <ManagerPage
              onOpenAudits={() => setPage('audits')}
              onOpenChecklists={() => setPage('checklists')}
              onOpenKnowledgeBase={() => setPage('knowledge')}
              onOpenOperations={() => setPage('operations')}
              onOpenRoles={() => setPage('roles')}
              onOpenTraining={() => setPage('training')}
            />
          )}
          {page === 'knowledgeWorkspace' && (
            <KnowledgeWorkspacePage
              onOpenAudits={() => setPage('audits')}
              onOpenChecklists={() => setPage('checklists')}
              onOpenTraining={() => setPage('training')}
            />
          )}
          {page === 'knowledge' && <KnowledgeBasePage />}
          {page === 'organization' && <PlaceholderPage label="Organization" />}
          {page === 'operations' && <OperationsPage onOpenKnowledgeBase={() => setPage('knowledge')} />}
          {page === 'roles' && (
            <RolesPage
              onOpenAudits={() => setPage('audits')}
              onOpenChecklists={() => setPage('checklists')}
              onOpenKnowledgeBase={() => setPage('knowledge')}
              onOpenOperations={() => setPage('operations')}
              onOpenTraining={() => setPage('training')}
            />
          )}
          {page === 'training' && <TrainingPage onOpenKnowledgeBase={() => setPage('knowledge')} />}
          {page === 'checklists' && <ChecklistsPage onOpenKnowledgeBase={() => setPage('knowledge')} />}
          {page === 'audits' && <AuditsPage onOpenKnowledgeBase={() => setPage('knowledge')} />}
          {page === 'command' && <CommandCenterPage />}
          {page === 'settings' && <PlaceholderPage label="Settings" />}
        </main>
      </div>
    </div>
  );
}
