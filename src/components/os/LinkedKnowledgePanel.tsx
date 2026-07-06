import { OSCard } from './OSCard';
import { StatusBadge } from './StatusBadge';

export interface LinkedKnowledgeItem {
  id: string;
  title: string;
  subtitle?: string | null;
  preview?: string | null;
  status?: string | null;
  notes?: string | null;
  action?: JSX.Element;
}

export function LinkedKnowledgePanel({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: LinkedKnowledgeItem[];
  emptyLabel: string;
}): JSX.Element {
  return (
    <section className="detailSection">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <div className="emptyInline">{emptyLabel}</div>
      ) : (
        <div className="linkedKnowledgePanel">
          {items.map((item) => (
            <OSCard className="linkedKnowledgeCard" key={item.id}>
              <div className="linkedKnowledgeHeader">
                <div>
                  <strong>{item.title}</strong>
                  {item.subtitle && <p>{item.subtitle}</p>}
                </div>
                {item.status ? <StatusBadge status={item.status} /> : null}
              </div>
              {item.preview && <p className="previewText">{item.preview}</p>}
              {item.notes && <p className="quietText">{item.notes}</p>}
              {item.action}
            </OSCard>
          ))}
        </div>
      )}
    </section>
  );
}

