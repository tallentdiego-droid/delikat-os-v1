import { ManagerOSModule } from '../components/manager/ManagerOSModule';

interface ManagerPageProps {
  onOpenKnowledgeBase?: () => void;
  onOpenOperations?: () => void;
  onOpenRoles?: () => void;
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
}

export function ManagerPage(props: ManagerPageProps): JSX.Element {
  return <ManagerOSModule {...props} />;
}
