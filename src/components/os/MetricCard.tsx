import { OSCard } from './OSCard';

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}): JSX.Element {
  return (
    <OSCard className="metricCard">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <p className="quietText">{helper}</p>}
    </OSCard>
  );
}

