export function CoverageBadge({
  coveragePercent,
  label,
}: {
  coveragePercent: number;
  label?: string;
}): JSX.Element {
  const tone = coveragePercent >= 100 ? 'success' : coveragePercent >= 75 ? 'warning' : 'danger';
  return <span className={`coverageBadge ${tone}`}>{label ?? `${coveragePercent}% covered`}</span>;
}

