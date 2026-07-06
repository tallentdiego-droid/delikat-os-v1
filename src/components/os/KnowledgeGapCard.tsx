import { OSCard } from './OSCard';
import { CoverageBadge } from './CoverageBadge';

export function KnowledgeGapCard({
  title,
  description,
  coveragePercent,
  detail,
  action,
}: {
  title: string;
  description: string;
  coveragePercent?: number;
  detail?: string | null;
  action?: JSX.Element;
}): JSX.Element {
  return (
    <OSCard className="knowledgeGapCard">
      <div className="knowledgeGapHeader">
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

