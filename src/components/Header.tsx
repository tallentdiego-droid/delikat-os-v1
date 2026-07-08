import { Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
  onMenuToggle: () => void;
}

export default function Header({ title, actions, onMenuToggle }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
        onClick={onMenuToggle}
        type="button"
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Delikat Studio</p>
        <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
      </div>

      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
