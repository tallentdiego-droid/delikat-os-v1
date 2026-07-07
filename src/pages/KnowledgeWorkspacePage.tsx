import { KnowledgeWorkspace } from '../components/workspace/KnowledgeWorkspace';

interface KnowledgeWorkspacePageProps {
  openNewSOPRequestId?: number;
  initialSelectedObjectId?: string | null;
  initialSelectedObjectRequestId?: number;
  initialSearchQuery?: string;
  initialSearchRequestId?: number;
}

export function KnowledgeWorkspacePage({
  openNewSOPRequestId,
  initialSelectedObjectId,
  initialSelectedObjectRequestId,
  initialSearchQuery,
  initialSearchRequestId,
}: KnowledgeWorkspacePageProps): JSX.Element {
  return (
    <KnowledgeWorkspace
      initialSelectedObjectId={initialSelectedObjectId}
      initialSelectedObjectRequestId={initialSelectedObjectRequestId}
      initialSearchQuery={initialSearchQuery}
      initialSearchRequestId={initialSearchRequestId}
      openNewSOPRequestId={openNewSOPRequestId}
    />
  );
}
