import { ArrowRight, Clock3 } from 'lucide-react';
import { OSCard } from '../os';
import { ExecutionPriorityBadge } from './ExecutionPriorityBadge';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { executionPriorityLabel, executionTypeLabel, type ExecutionTimelineItem } from '../../lib/execution';

export function ExecutionCard({
  item,
  onAction,
  actionLabel,
}: {
  item: ExecutionTimelineItem;
  onAction?: () => void;
  actionLabel?: string;
}): JSX.Element {
  return (
    <OSCard className={`executionCard ${item.groupId}`}>
      <div className="executionCardHeader">
        <div>
          <strong>{item.title}</strong>
          <p>{item.description ?? 'Live execution item from the unified timeline.'}</p>
        </div>
        <div className="executionCardBadges">
          <ExecutionStatusBadge status={item.status} />
          <ExecutionPriorityBadge priority={item.priority} />
        </div>
      </div>

      <div className="executionCardMeta">
        <span>{executionTypeLabel(item.executionType)}</span>
        <span>{executionPriorityLabel(item.priority)}</span>
        <span>{item.relatedModuleLabel}</span>
        {item.roleLabel ? <span>{item.roleLabel}</span> : null}
        <span>{item.itemCount !== null ? `${item.itemCount} items` : item.progressLabel}</span>
      </div>

      <div className="executionCardTiming">
        <span>
          <Clock3 aria-hidden="true" size={14} />
          {item.executionDate ?? 'No execution date'}
        </span>
        <span>{item.startedAt ? `Started ${item.startedAt}` : item.scheduledAt ? `Scheduled ${item.scheduledAt}` : 'Not started'}</span>
        <span>{item.completedAt ? `Completed ${item.completedAt}` : item.overdue ? 'Overdue' : item.status === 'blocked' ? 'Blocked' : 'In progress'}</span>
      </div>

      {item.blockedReason && <p className="executionCardBlocked">{item.blockedReason}</p>}
      <p className="quietText executionCardNextAction">{item.nextAction}</p>

      {onAction ? (
        <button className="iconTextButton executionCardAction" onClick={onAction} type="button">
          <ArrowRight aria-hidden="true" size={16} />
          {actionLabel ?? item.actionLabel}
        </button>
      ) : null}
    </OSCard>
  );
}
