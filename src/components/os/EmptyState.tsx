import type { LucideIcon } from 'lucide-react';
import { OSCard } from './OSCard';

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: JSX.Element;
}): JSX.Element {
  return (
    <OSCard className="emptyStatePanel">
      {Icon && <Icon aria-hidden="true" size={18} />}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </OSCard>
  );
}

