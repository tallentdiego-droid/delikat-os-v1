import {
  LayoutDashboard,
  BookOpen,
  Utensils,
  ClipboardList,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'recipes', label: 'Recipes', icon: Utensils },
  { id: 'sops', label: 'SOPs & Manuals', icon: ClipboardList },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ activePage, onNavigate, isOpen, onToggle }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="brand">
        <div className="brandMark">D</div>
        {isOpen && (
          <div>
            <strong>Delikat</strong>
            <span>Studio</span>
          </div>
        )}
      </div>

      <nav className="navList" aria-label="Primary">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={activePage === id ? 'navItem active' : 'navItem'}
            title={!isOpen ? label : undefined}
            type="button"
          >
            <Icon aria-hidden="true" size={18} />
            {isOpen && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="sidebarToggle"
        type="button"
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </aside>
  );
}
