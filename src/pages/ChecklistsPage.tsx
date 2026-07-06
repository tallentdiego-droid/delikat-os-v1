import { ChecklistsModule } from '../components/checklists/ChecklistsModule';

interface ChecklistsPageProps {
  onOpenKnowledgeBase?: () => void;
}

export function ChecklistsPage({ onOpenKnowledgeBase }: ChecklistsPageProps = {}): JSX.Element {
  return <ChecklistsModule onOpenKnowledgeBase={onOpenKnowledgeBase} />;
}
