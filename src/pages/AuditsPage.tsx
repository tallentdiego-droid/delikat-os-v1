import type { JSX } from 'react';
import { AuditsModule } from '../components/audits/AuditsModule';

export function AuditsPage({ onOpenKnowledgeBase }: { onOpenKnowledgeBase?: () => void } = {}): JSX.Element {
  return <AuditsModule onOpenKnowledgeBase={onOpenKnowledgeBase} />;
}
