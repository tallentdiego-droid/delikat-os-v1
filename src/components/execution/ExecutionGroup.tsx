import { OSCard } from '../os';
import { ExecutionCard } from './ExecutionCard';
import type { ExecutionTimelineGroup, ExecutionTimelineItem } from '../../lib/execution';

export function ExecutionGroup({
  group,
  onAction,
}: {
  group: ExecutionTimelineGroup;
  onAction?: (item: ExecutionTimelineItem) => void;
}): JSX.Element {
  return (
    <section className="executionGroup">
      <div className="executionGroupHeader">
        <div>
          <h3>{group.title}</h3>
          <p>{group.description}</p>
        </div>
        <span className="executionGroupCount">{group.items.length}</span>
      </div>

      {group.items.length === 0 ? (
        <OSCard className="emptyStatePanel refined">
          <h3>No items here yet</h3>
          <p>This part of the day is quiet for now.</p>
        </OSCard>
      ) : (
        <div className="executionGroupList">
          {group.items.map((item) => (
            <ExecutionCard key={item.id} item={item} actionLabel={item.nextAction} onAction={onAction ? () => onAction(item) : undefined} />
          ))}
        </div>
      )}
    </section>
  );
}
