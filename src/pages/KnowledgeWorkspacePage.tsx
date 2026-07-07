import { KnowledgeWorkspace } from '../components/workspace/KnowledgeWorkspace';

interface KnowledgeWorkspacePageProps {
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
  openNewSOPRequestId?: number;
}

export function KnowledgeWorkspacePage({
  onOpenTraining,
  onOpenChecklists,
  onOpenAudits,
  openNewSOPRequestId,
}: KnowledgeWorkspacePageProps): JSX.Element {
  return (
    <KnowledgeWorkspace
      onOpenAudits={onOpenAudits}
      onOpenChecklists={onOpenChecklists}
      onOpenTraining={onOpenTraining}
      openNewSOPRequestId={openNewSOPRequestId}
    />
  );
}
