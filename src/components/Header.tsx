import { Menu, Search } from 'lucide-react';

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
  onMenuToggle: () => void;
}

export default function Header({ title, actions, onMenuToggle }: HeaderProps) {
  return (
    <header className="topHeader">
      <button
        onClick={onMenuToggle}
        className="mobileMenuButton"
        type="button"
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>
      <div className="topHeaderTitle">
        <span className="eyebrow">Delikat Studio</span>
        <h1>{title}</h1>
      </div>
      <div className="headerSearch">
        <Search aria-hidden="true" size={16} />
        <span>Live Supabase knowledge</span>
      </div>
      {actions && <div className="headerActions">{actions}</div>}
    </header>
  );
}
