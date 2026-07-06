import type { ReactNode } from 'react';
import { SOPCard, type SOPCardMeta } from './SOPCard';

export interface SOPStepListItem {
  id: string;
  sequence: number | string;
  title: string;
  summary?: string | null;
  durationLabel?: string | null;
  status?: string | null;
  notes?: string | null;
  references?: SOPCardMeta[];
  action?: ReactNode;
}

export function SOPStepList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: SOPStepListItem[];
  emptyLabel: string;
}): JSX.Element {
  return (
    <section className="detailSection">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <div className="emptyInline">{emptyLabel}</div>
      ) : (
        <div className="sopStepList">
          {items.map((item) => (
            <SOPCard
              action={item.action}
              className="sopStepCard"
              key={item.id}
              metadata={item.references}
              sourceDetail={item.durationLabel}
              status={item.status ?? undefined}
              summary={item.notes}
              title={`${item.sequence}. ${item.title}`}
            >
              {item.summary && <p className="sopStepSummary">{item.summary}</p>}
            </SOPCard>
          ))}
        </div>
      )}
    </section>
  );
}
