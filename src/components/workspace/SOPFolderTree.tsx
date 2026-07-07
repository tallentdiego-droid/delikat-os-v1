import { FolderOpen, Files } from 'lucide-react';
import { OSCard } from '../os';

export interface SOPFolderTreeItem {
  id: string;
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
  onSelectFolder: (id: string) => void;
}): JSX.Element {
  return (
    <section className="workspaceSection">
      <div className="workspaceSectionHeader">
        <div>
          <h3>Folders</h3>
          <p>Simple ways to browse the SOP library.</p>
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
