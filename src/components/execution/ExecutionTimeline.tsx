import { EmptyState, MetricCard } from '../os';
import type { ExecutionTimelineData, ExecutionTimelineGroup, ExecutionTimelineItem } from '../../lib/execution';
import { ExecutionGroup } from './ExecutionGroup';

export function ExecutionTimeline({
  data,
  onAction,
}: {
  data: ExecutionTimelineData;
  onAction?: (item: ExecutionTimelineItem) => void;
}): JSX.Element {
  if (data.items.length === 0) {
    return <EmptyState title="No execution items yet" description="The unified execution timeline will appear here once live workflow records exist." />;
  }

  return (
    <section className="executionTimeline">
      <div className="executionTimelineSummary">
        <MetricCard label="Now" value={data.stats.now} helper="Already in motion" />
        <MetricCard label="Next" value={data.stats.next} helper="Ready to start" />
        <MetricCard label="Later Today" value={data.stats.laterToday} helper="Scheduled or waiting" />
        <MetricCard label="Completed" value={data.stats.completed} helper="Finished or verified" />
        <MetricCard label="Blocked" value={data.stats.blocked} helper="Missing SOP or dependencies" />
        <MetricCard label="Highest priority" value={data.stats.highestPriority} helper={`Overdue ${data.stats.overdue}`} />
      </div>

      <div className="executionTimelineGrid">
        {data.groups.map((group: ExecutionTimelineGroup) => (
          <ExecutionGroup key={group.id} group={group} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}
