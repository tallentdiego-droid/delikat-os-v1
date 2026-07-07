import type { ReactNode } from 'react';
import { CoverageBadge } from './CoverageBadge';
import { OSCard } from './OSCard';
import { StatusBadge } from './StatusBadge';

export interface SOPCardMeta {
  label: string;
  value: string;
}

export function SOPCard({
  title,
  summary,
  status,
  statusLabel,
  sourceLabel,
  sourceDetail,
  coveragePercent,
  coverageLabel,
  metadata = [],
  action,
  children,
  className = '',
  onClick,
  selected = false,
}: {
  title: string;
  summary?: string | null;
  status?: string | null;
  statusLabel?: string | null;
  sourceLabel?: string | null;
  sourceDetail?: string | null;
  coveragePercent?: number;
  coverageLabel?: string | null;
  metadata?: SOPCardMeta[];
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}): JSX.Element {
  return (
    <OSCard className={className ? `sopCard ${className}` : 'sopCard'} onClick={onClick} selected={selected}>
      <div className="sopCardHeader">
        <div>
          <strong>{title}</strong>
          {summary && <p>{summary}</p>}
        </div>
        <div className="sopCardBadges">
          {status ? <StatusBadge status={status} label={statusLabel ?? undefined} /> : null}
          {typeof coveragePercent === 'number' ? <CoverageBadge coveragePercent={coveragePercent} label={coverageLabel ?? undefined} /> : null}
        </div>
      </div>

      {(sourceLabel || sourceDetail) && (
        <div className="sopCardSource">
          {sourceLabel && <span>{sourceLabel}</span>}
          {sourceDetail && <strong>{sourceDetail}</strong>}
        </div>
      )}

      {metadata.length > 0 && (
        <div className="sopCardMeta">
          {metadata.map((item) => (
            <span key={`${item.label}:${item.value}`}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
      )}

      {children}

      {action}
    </OSCard>
  );
}
