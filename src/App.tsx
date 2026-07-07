import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Brain,
  BookOpen,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Search,
  Settings,
  ShieldAlert,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
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
import { OSCard } from './components/os';

type Page =
  | 'home'
  | 'studio'
  | 'dailyOperations'
  | 'ai'
  | 'admin'
  | 'manager'
  | 'knowledgeWorkspace'
  | 'knowledge'
  | 'organization'
  | 'operations'
  | 'roles'
  | 'training'
  | 'checklists'
  | 'audits'
  | 'command'
  | 'settings';

const navigation = [
  { id: 'home' as const, label: 'Home', icon: LayoutDashboard },
  { id: 'studio' as const, label: 'Studio', icon: BookOpen },
  { id: 'dailyOperations' as const, label: 'Daily Operations', icon: ClipboardList },
  { id: 'ai' as const, label: 'AI', icon: Brain },
  { id: 'admin' as const, label: 'Admin', icon: Settings },
];

function pageTitle(page: Page): string {
  if (page === 'studio' || page === 'knowledgeWorkspace') return 'Delikat Studio';
  if (page === 'dailyOperations' || page === 'manager') return 'Daily Operations';
  if (page === 'ai' || page === 'command') return 'AI Command Center';
  if (page === 'admin') return 'Admin';
  if (page === 'knowledge') return 'Knowledge';
  if (page === 'organization') return 'Organization';
  if (page === 'operations') return 'Operations';
  if (page === 'roles') return 'Roles';
  if (page === 'training') return 'Training';
  if (page === 'checklists') return 'Checklists';
  if (page === 'audits') return 'Audits';
  if (page === 'settings') return 'Settings';
  return 'Home';
}

function HubPage({
  label,
  detail,
  cards,
}: {
  label: string;
  detail: string;
  cards: Array<{
    title: string;
    detail: string;
    icon: LucideIcon;
    onClick: () => void;
  }>;
}): JSX.Element {
  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>{label}</h2>
          <p>{detail}</p>
        </div>
      </div>
      <div className="hubGrid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <OSCard key={card.title} className="hubCard" onClick={card.onClick}>
              <div className="hubCardHeader">
                <Icon aria-hidden="true" size={18} />
                <strong>{card.title}</strong>
              </div>
              <p>{card.detail}</p>
              <button
                className="iconTextButton"
                onClick={(event) => {
                  event.stopPropagation();
                  card.onClick();
                }}
                type="button"
              >
                <ArrowRight aria-hidden="true" size={16} />
                Open
              </button>
            </OSCard>
          );
        })}
      </div>
    </section>
  );
}

export function App(): JSX.Element {
  const [page, setPage] = useState<Page>('home');
  const [studioDraftSeed, setStudioDraftSeed] = useState(0);

  const adminCards = useMemo(
    () => [
      { title: 'Knowledge', detail: 'Admin library and technical knowledge tools.', icon: BookOpen, onClick: () => setPage('knowledge') },
      { title: 'Operations', detail: 'Operational data and process structure.', icon: Workflow, onClick: () => setPage('operations') },
      { title: 'Roles', detail: 'Role workspaces and readiness views.', icon: Users, onClick: () => setPage('roles') },
      { title: 'Training', detail: 'Training paths and coverage views.', icon: ShieldAlert, onClick: () => setPage('training') },
      { title: 'Checklists', detail: 'Checklist templates, runs, and execution.', icon: ClipboardList, onClick: () => setPage('checklists') },
      { title: 'Audits', detail: 'Audit templates, runs, and scoring.', icon: ShieldAlert, onClick: () => setPage('audits') },
      { title: 'Organization', detail: 'Structure and settings for the workspace.', icon: Building2, onClick: () => setPage('organization') },
      { title: 'Settings', detail: 'System preferences and internal configuration.', icon: Settings, onClick: () => setPage('settings') },
    ],
    [],
  );

  const dailyOpsCards = useMemo(
    () => [
      { title: 'Today’s Shift', detail: 'Full command view for today’s operation.', icon: ClipboardList, onClick: () => setPage('manager') },
      { title: 'Operations', detail: 'Process structure and operational reference.', icon: Workflow, onClick: () => setPage('operations') },
      { title: 'Checklists', detail: 'Checklist runs and template execution.', icon: ClipboardList, onClick: () => setPage('checklists') },
      { title: 'Audits', detail: 'Audit runs, scoring, and review work.', icon: ShieldAlert, onClick: () => setPage('audits') },
    ],
    [],
  );

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
            <span>Search SOPs in Studio</span>
          </div>
        </header>

        <main className="mainPanel">
          {page === 'home' && (
            <DashboardPage
              onCreateSOP={() => {
                setPage('studio');
                setStudioDraftSeed((current) => current + 1);
              }}
              onOpenDailyOperations={() => setPage('dailyOperations')}
              onOpenStudio={() => setPage('studio')}
              onOpenKnowledgeBase={() => setPage('studio')}
              onOpenOperations={() => setPage('operations')}
            />
          )}
          {page === 'dailyOperations' && (
            <HubPage label="Daily Operations" detail="Your working hub for shift execution, checklists, audits, and manager tools." cards={dailyOpsCards} />
          )}
          {page === 'manager' && (
            <ManagerPage
              onOpenAudits={() => setPage('audits')}
              onOpenChecklists={() => setPage('checklists')}
              onOpenKnowledgeBase={() => setPage('studio')}
              onOpenOperations={() => setPage('operations')}
              onOpenRoles={() => setPage('roles')}
              onOpenTraining={() => setPage('training')}
            />
          )}
          {page === 'studio' || page === 'knowledgeWorkspace' ? (
            <KnowledgeWorkspacePage
              onOpenAudits={() => setPage('audits')}
              onOpenChecklists={() => setPage('checklists')}
              onOpenTraining={() => setPage('training')}
              openNewSOPRequestId={studioDraftSeed}
            />
          ) : null}
          {page === 'knowledge' && <KnowledgeBasePage />}
          {page === 'admin' && <HubPage label="Admin" detail="Internal pages for the technical and operational back office." cards={adminCards} />}
          {page === 'organization' && <HubPage label="Organization" detail="Internal page for structure and administration." cards={[{ title: 'Settings', detail: 'Open system settings.', icon: Settings, onClick: () => setPage('settings') }]} />}
          {page === 'operations' && <OperationsPage onOpenKnowledgeBase={() => setPage('studio')} />}
          {page === 'roles' && (
            <RolesPage
              onOpenAudits={() => setPage('audits')}
              onOpenChecklists={() => setPage('checklists')}
              onOpenKnowledgeBase={() => setPage('studio')}
              onOpenOperations={() => setPage('operations')}
              onOpenTraining={() => setPage('training')}
            />
          )}
          {page === 'training' && <TrainingPage onOpenKnowledgeBase={() => setPage('studio')} />}
          {page === 'checklists' && <ChecklistsPage onOpenKnowledgeBase={() => setPage('studio')} />}
          {page === 'audits' && <AuditsPage onOpenKnowledgeBase={() => setPage('studio')} />}
          {page === 'ai' || page === 'command' ? <CommandCenterPage /> : null}
          {page === 'settings' && <HubPage label="Settings" detail="System preferences and internal configuration live here." cards={[{ title: 'Admin', detail: 'Back to internal tools.', icon: Settings, onClick: () => setPage('admin') }]} />}
        </main>
      </div>
    </div>
  );
}
