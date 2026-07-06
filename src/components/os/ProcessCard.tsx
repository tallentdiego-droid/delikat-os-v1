import type { OperationsProcess } from '../../lib/operations';
import { CoverageBadge } from './CoverageBadge';
import { OSCard } from './OSCard';
import { StatusBadge } from './StatusBadge';

export function ProcessCard({
  process,
  selected = false,
  onSelect,
}: {
  process: OperationsProcess;
  selected?: boolean;
  onSelect?: (id: string) => void;
}): JSX.Element {
  const actionable = Boolean(onSelect);

  return (
    <OSCard className={selected ? 'processCard active' : 'processCard'}>
      {actionable ? (
        <button className="processCardButton" onClick={() => onSelect?.(process.id)} type="button">
          <div className="processCardHeader">
            <div>
              <strong>{process.name}</strong>
              <p>{process.description ?? 'Operational process from the seeded catalog.'}</p>
            </div>
            <CoverageBadge coveragePercent={process.knowledgeLinkCount === 0 ? 0 : 100} label={process.knowledgeLinkCount === 0 ? 'Missing knowledge' : 'Knowledge linked'} />
          </div>
          <div className="processCardMeta">
            <span>{process.department?.title ?? 'Unassigned department'}</span>
            <span>{process.area?.title ?? 'No area'}</span>
            <span>{process.stepCount} steps</span>
            <span>{process.knowledgeLinkCount} links</span>
          </div>
          <div className="processCardFooter">
            <StatusBadge status={process.status} />
            <span>{process.triggerType}</span>
            <span>{process.criticality}</span>
          </div>
        </button>
      ) : (
        <>
          <div className="processCardHeader">
            <div>
              <strong>{process.name}</strong>
              <p>{process.description ?? 'Operational process from the seeded catalog.'}</p>
            </div>
            <CoverageBadge coveragePercent={process.knowledgeLinkCount === 0 ? 0 : 100} label={process.knowledgeLinkCount === 0 ? 'Missing knowledge' : 'Knowledge linked'} />
          </div>
          <div className="processCardMeta">
            <span>{process.department?.title ?? 'Unassigned department'}</span>
            <span>{process.area?.title ?? 'No area'}</span>
            <span>{process.stepCount} steps</span>
            <span>{process.knowledgeLinkCount} links</span>
          </div>
          <div className="processCardFooter">
            <StatusBadge status={process.status} />
            <span>{process.triggerType}</span>
            <span>{process.criticality}</span>
          </div>
        </>
      )}
    </OSCard>
  );
}

