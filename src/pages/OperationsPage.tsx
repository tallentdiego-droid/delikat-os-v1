import { OperationsModule } from '../components/operations/OperationsModule';

interface OperationsPageProps {
  onOpenKnowledgeBase?: () => void;
}

export function OperationsPage({ onOpenKnowledgeBase }: OperationsPageProps = {}): JSX.Element {
  return <OperationsModule onOpenKnowledgeBase={onOpenKnowledgeBase} />;
}
