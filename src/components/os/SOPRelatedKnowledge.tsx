import type { ReactNode } from 'react';
import { SOPCard } from './SOPCard';

export interface SOPRelatedKnowledgeItem {
  id: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  status?: string | null;
  notes?: string | null;
  action?: ReactNode;
}

export function SOPRelatedKnowledge({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: SOPRelatedKnowledgeItem[];
  emptyLabel: string;
}): JSX.Element {
  return (
    <section className="detailSection">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <div className="emptyInline">{emptyLabel}</div>
      ) : (
        <div className="sopRelatedKnowledgeGrid">
          {items.map((item) => (
            <SOPCard
              action={item.action}
              className="sopRelatedKnowledgeCard"
              key={item.id}
              sourceDetail={item.notes}
              sourceLabel={item.subtitle ?? null}
              status={item.status ?? undefined}
              summary={item.summary}
              title={item.title}
            />
          ))}
        </div>
      )}
    </section>
  );
}
