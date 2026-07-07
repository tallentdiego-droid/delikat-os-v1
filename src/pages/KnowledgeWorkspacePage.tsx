import { KnowledgeWorkspace } from '../components/workspace/KnowledgeWorkspace';

interface KnowledgeWorkspacePageProps {
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
}

export function KnowledgeWorkspacePage({
  onOpenTraining,
  onOpenChecklists,
  onOpenAudits,
}: KnowledgeWorkspacePageProps): JSX.Element {
  return (
    <KnowledgeWorkspace
      onOpenAudits={onOpenAudits}
      onOpenChecklists={onOpenChecklists}
      onOpenTraining={onOpenTraining}
    />
  );
}
