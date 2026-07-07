import { FolderOpen, Files } from 'lucide-react';
import { OSCard } from '../os';
import type { ManualFilter } from '../../lib/knowledge';

export interface SOPFolderTreeItem {
  id: ManualFilter;
  title: string;
  subtitle: string;
  count: number;
  selected: boolean;
}

export function SOPFolderTree({
  folders,
  onSelectFolder,
}: {
  folders: SOPFolderTreeItem[];
  onSelectFolder: (id: ManualFilter) => void;
}): JSX.Element {
  return (
    <section className="workspaceSection">
      <div className="workspaceSectionHeader">
        <div>
          <h3>SOP folders</h3>
          <p>Approved manuals organized as the workspace library.</p>
        </div>
      </div>
      <div className="workspaceFolderList">
        {folders.map((folder) => (
          <OSCard key={folder.id} className={folder.selected ? 'workspaceFolderCard active' : 'workspaceFolderCard'}>
            <button className="workspaceFolderButton" onClick={() => onSelectFolder(folder.id)} type="button">
              <div className="workspaceFolderHeader">
                <div className="workspaceFolderIcon">
                  <FolderOpen aria-hidden="true" size={16} />
                </div>
                <div>
                  <strong>{folder.title}</strong>
                  <p>{folder.subtitle}</p>
                </div>
              </div>
              <div className="workspaceFolderMeta">
                <span>
                  <Files aria-hidden="true" size={14} />
                  {folder.count} SOPs
                </span>
              </div>
            </button>
          </OSCard>
        ))}
      </div>
    </section>
  );
}
