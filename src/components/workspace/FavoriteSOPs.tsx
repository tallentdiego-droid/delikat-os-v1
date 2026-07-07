import { Star } from 'lucide-react';
import { OSCard } from '../os';
import type { KnowledgeObject } from '../../lib/knowledge';
import { previewText } from '../../lib/knowledge';

export function FavoriteSOPs({
  objects,
  onSelectObject,
}: {
  objects: KnowledgeObject[];
  onSelectObject: (id: string) => void;
}): JSX.Element {
  return (
    <section className="workspaceSection">
      <div className="workspaceSectionHeader">
        <div>
          <h3>Favorites</h3>
          <p>Frequently linked SOPs chosen from the live catalog.</p>
        </div>
      </div>
      <div className="workspaceMiniList">
        {objects.length === 0 ? (
          <div className="workspaceEmpty">No favorites are visible yet.</div>
        ) : (
          objects.map((object) => (
            <OSCard className="workspaceMiniCard" key={object.id}>
              <button className="workspaceMiniButton" onClick={() => onSelectObject(object.id)} type="button">
                <div className="workspaceMiniHeader">
                  <Star aria-hidden="true" size={14} />
                  <strong>{object.title}</strong>
                </div>
                <p>{object.summary ?? previewText(object.approvedVersion.body, 120)}</p>
              </button>
            </OSCard>
          ))
        )}
      </div>
    </section>
  );
}
