import { TrainingModule } from '../components/training/TrainingModule';

interface TrainingPageProps {
  onOpenKnowledgeBase?: () => void;
}

export function TrainingPage({ onOpenKnowledgeBase }: TrainingPageProps = {}): JSX.Element {
  return <TrainingModule onOpenKnowledgeBase={onOpenKnowledgeBase} />;
}

