export function ExecutionPriorityBadge({ priority }: { priority: number }): JSX.Element {
  const tone = priority >= 5 ? 'danger' : priority === 4 ? 'warning' : 'neutral';
  const label = priority >= 5 ? 'Critical' : priority === 4 ? 'High' : priority === 3 ? 'Normal' : priority === 2 ? 'Low' : 'Backlog';

  return <span className={`executionBadge ${tone}`}>{label}</span>;
}
