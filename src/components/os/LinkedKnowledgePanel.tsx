import { SOPRelatedKnowledge, type SOPRelatedKnowledgeItem } from './SOPRelatedKnowledge';

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
  const relatedItems: SOPRelatedKnowledgeItem[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    summary: item.preview ?? null,
    status: item.status ?? null,
    notes: item.notes ?? null,
    action: item.action,
  }));

  return <SOPRelatedKnowledge emptyLabel={emptyLabel} items={relatedItems} title={title} />;
}
