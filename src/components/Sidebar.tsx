import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Settings, ChevronLeft, ChevronRight, Sparkles, Utensils } from 'lucide-react';

const navGroups = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
      { id: 'recipes', label: 'Recipes', icon: Utensils },
      { id: 'sops', label: 'SOPs & Manuals', icon: ClipboardList },
      { id: 'training', label: 'Training', icon: GraduationCap },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  navigation?: Array<{ id: string; label: string; icon: React.ElementType }>;
}

export default function Sidebar({ activePage, onNavigate, isOpen, onToggle, navigation }: SidebarProps) {
  const items = navigation ?? navGroups[0].items;

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-r border-slate-200 bg-[#0F172A] text-white transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-sm font-black text-slate-900 shadow-lg shadow-amber-500/20">
          D
        </div>
        {isOpen ? (
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">Delikat Studio</h2>
            <p className="truncate text-[10px] uppercase tracking-[0.22em] text-amber-300/80">SOP workspace</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {isOpen ? <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{group.label}</p> : null}
            {items.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  activePage === id ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:bg-white/8 hover:text-white'
                }`}
                onClick={() => onNavigate(id)}
                title={!isOpen ? label : undefined}
                type="button"
              >
                <Icon size={17} className="shrink-0" />
                {isOpen ? <span className="truncate">{label}</span> : null}
                {activePage === id && isOpen ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-slate-900/30" /> : null}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {isOpen ? (
        <div className="border-t border-white/10 px-4 py-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-amber-200">
            <Sparkles size={13} />
            Bolt UI shell
          </div>
        </div>
      ) : null}

      <button
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#1E293B] text-slate-400 shadow-md transition-colors hover:bg-slate-700"
        onClick={onToggle}
        type="button"
      >
        {isOpen ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
      </button>
    </aside>
  );
}
