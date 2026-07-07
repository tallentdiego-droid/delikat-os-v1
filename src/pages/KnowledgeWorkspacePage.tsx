import { KnowledgeWorkspace } from '../components/workspace/KnowledgeWorkspace';

interface KnowledgeWorkspacePageProps {
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
  openNewSOPRequestId?: number;
  initialSearchQuery?: string;
  initialSearchRequestId?: number;
}

export function KnowledgeWorkspacePage({
  onOpenTraining,
  onOpenChecklists,
  onOpenAudits,
  openNewSOPRequestId,
  initialSearchQuery,
  initialSearchRequestId,
}: KnowledgeWorkspacePageProps): JSX.Element {
  return (
    <KnowledgeWorkspace
      onOpenAudits={onOpenAudits}
      onOpenChecklists={onOpenChecklists}
      onOpenTraining={onOpenTraining}
      initialSearchQuery={initialSearchQuery}
      initialSearchRequestId={initialSearchRequestId}
      openNewSOPRequestId={openNewSOPRequestId}
    />
  );
}
