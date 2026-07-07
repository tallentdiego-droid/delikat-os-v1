import { Search, BookOpen } from 'lucide-react';
import { SOPCard, EmptyState } from '../os';
import type { KnowledgeObject } from '../../lib/knowledge';
import { previewText } from '../../lib/knowledge';

export function SOPLibrary({
  query,
  onQueryChange,
  folderLabel,
  objects,
  recentlyEdited,
  drafts,
  onSelectObject,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  folderLabel: string;
  objects: KnowledgeObject[];
  recentlyEdited: KnowledgeObject[];
  drafts: KnowledgeObject[];
  onSelectObject: (id: string) => void;
}): JSX.Element {
  return (
    <div className="workspaceCenter">
      <label className="searchField workspaceSearch">
        <Search aria-hidden="true" size={17} />
        <input onChange={(event) => onQueryChange(event.target.value)} placeholder={`Search ${folderLabel} and approved SOPs`} value={query} />
      </label>

      <section className="workspaceSection">
        <div className="workspaceSectionHeader">
          <div>
            <h3>SOP library</h3>
            <p>{objects.length} approved SOPs in view</p>
          </div>
        </div>
        {objects.length === 0 ? (
          <EmptyState title="No SOPs found" description="No approved SOPs match the current workspace filters." icon={BookOpen} />
        ) : (
          <div className="workspaceCardGrid">
            {objects.map((object) => (
              <SOPCard
                action={
                  <button className="tableLink" onClick={() => onSelectObject(object.id)} type="button">
                    Open SOP
                  </button>
                }
                key={object.id}
                sourceDetail={`${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                sourceLabel="Approved SOP"
                status={object.status}
                summary={object.summary ?? previewText(object.approvedVersion.body, 180)}
                title={object.title}
              />
            ))}
          </div>
        )}
      </section>

      <section className="workspaceSection">
        <div className="workspaceSectionHeader">
          <div>
            <h3>Recently edited</h3>
            <p>Latest approved SOP updates in the catalog.</p>
          </div>
        </div>
        {recentlyEdited.length === 0 ? (
          <div className="workspaceEmpty">No recently edited SOPs visible.</div>
        ) : (
          <div className="workspaceMiniList">
            {recentlyEdited.map((object) => (
              <SOPCard
                key={object.id}
                title={object.title}
                summary={object.summary ?? previewText(object.approvedVersion.body, 120)}
                sourceLabel="Updated SOP"
                sourceDetail={`${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                status={object.status}
                action={
                  <button className="tableLink" onClick={() => onSelectObject(object.id)} type="button">
                    Preview
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="workspaceSection">
        <div className="workspaceSectionHeader">
          <div>
            <h3>Drafts</h3>
            <p>Work in progress and not-yet-active knowledge records.</p>
          </div>
        </div>
        {drafts.length === 0 ? (
          <div className="workspaceEmpty">No drafts are visible in the imported catalog.</div>
        ) : (
          <div className="workspaceMiniList">
            {drafts.map((object) => (
              <SOPCard
                key={object.id}
                title={object.title}
                summary={object.summary ?? previewText(object.approvedVersion.body, 120)}
                sourceLabel="Draft SOP"
                sourceDetail={`${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                status={object.status}
                action={
                  <button className="tableLink" onClick={() => onSelectObject(object.id)} type="button">
                    Preview
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
