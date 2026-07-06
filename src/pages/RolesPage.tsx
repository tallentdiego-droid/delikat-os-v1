import { RoleOSModule } from '../components/roles/RoleOSModule';

interface RolesPageProps {
  onOpenKnowledgeBase?: () => void;
  onOpenOperations?: () => void;
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
}

export function RolesPage(props: RolesPageProps): JSX.Element {
  return <RoleOSModule {...props} />;
}
