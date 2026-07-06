import type { ReactNode } from 'react';
import { CoverageBadge } from './CoverageBadge';
import { OSCard } from './OSCard';

export function SOPCoverageWarning({
  title,
  description,
  detail,
  coveragePercent,
  action,
}: {
  title: string;
  description: string;
  detail?: string | null;
  coveragePercent?: number;
  action?: ReactNode;
}): JSX.Element {
  return (
    <OSCard className="sopCoverageWarning">
      <div className="sopCoverageHeader">
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
        {typeof coveragePercent === 'number' ? <CoverageBadge coveragePercent={coveragePercent} /> : null}
      </div>
      {detail && <p className="quietText">{detail}</p>}
      {action}
    </OSCard>
  );
}
