import { Star } from 'lucide-react';
import { EmptyState } from '../os';

export function FavoriteSOPs(): JSX.Element {
  return (
    <section className="workspaceSection">
      <div className="workspaceSectionHeader">
        <div>
          <h3>Favorites</h3>
          <p>Saved favorites are not persisted yet, so this space is a placeholder for now.</p>
        </div>
      </div>
      <EmptyState icon={Star} title="Favorites placeholder" description="Once saved favorites are available, this section will surface the SOPs your team returns to most often." />
    </section>
  );
}
