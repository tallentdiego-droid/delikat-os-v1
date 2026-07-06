import type { ExecutionStatus } from '../../lib/execution';

function toneFromStatus(status: ExecutionStatus): string {
  if (status === 'blocked') return 'danger';
  if (status === 'completed' || status === 'verified') return 'success';
  if (status === 'in_progress' || status === 'scheduled' || status === 'planned' || status === 'waiting' || status === 'ready') return 'warning';
  return 'neutral';
}

function labelFromStatus(status: ExecutionStatus): string {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'planned') return 'Planned';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'ready') return 'Ready';
  if (status === 'waiting') return 'Waiting';
  if (status === 'blocked') return 'Blocked';
  if (status === 'completed') return 'Completed';
  if (status === 'verified') return 'Verified';
  return 'Archived';
}

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }): JSX.Element {
  return <span className={`executionBadge ${toneFromStatus(status)}`}>{labelFromStatus(status)}</span>;
}
