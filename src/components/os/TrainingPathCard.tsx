import { CoverageBadge } from './CoverageBadge';
import { OSCard } from './OSCard';

interface TrainingPathLike {
  id: string;
  title: string;
  description: string | null;
  coveragePercent: number;
  department?: { name: string | null } | null;
  role?: { name: string | null } | null;
  area?: { name: string | null } | null;
  items: Array<unknown>;
}

export function TrainingPathCard({
  path,
  selected = false,
  onSelect,
}: {
  path: TrainingPathLike;
  selected?: boolean;
  onSelect?: (id: string) => void;
}): JSX.Element {
  const content = (
    <>
      <div className="trainingPathCardHeader">
        <strong>{path.title}</strong>
        <CoverageBadge coveragePercent={path.coveragePercent} />
      </div>
      <p>{path.description ?? 'No description provided.'}</p>
      <div className="trainingPathCardMeta">
        <span>{path.department?.name ?? 'Unassigned'}</span>
        <span>{path.role?.name ?? 'Unassigned role'}</span>
        <span>{path.area?.name ?? 'Unassigned area'}</span>
        <span>{path.items.length} items</span>
      </div>
    </>
  );

  if (!onSelect) {
    return <OSCard className={selected ? 'trainingPathCard active' : 'trainingPathCard'}>{content}</OSCard>;
  }

  return (
    <OSCard className={selected ? 'trainingPathCard active' : 'trainingPathCard'}>
      <button className="trainingPathButton" onClick={() => onSelect(path.id)} type="button">
        {content}
      </button>
    </OSCard>
  );
}
