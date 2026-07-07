import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Layers3 } from 'lucide-react';
import { SOPFolderTree, type SOPFolderTreeItem } from './SOPFolderTree';
import { FavoriteSOPs } from './FavoriteSOPs';
import { RecentSOPs } from './RecentSOPs';
import { SOPLibrary } from './SOPLibrary';
import { SOPPreview } from './SOPPreview';
import { EmptyState, MetricCard, OSCard } from '../os';
import {
  getKnowledgeEngineData,
  type KnowledgeEngineData,
  type KnowledgeObject,
  type ManualFilter,
  type KnowledgeManual,
} from '../../lib/knowledge';
import { getTrainingEngineData, type TrainingEngineData } from '../../lib/training';
import { getChecklistEngineData, type ChecklistEngineData } from '../../lib/checklists';
import { getAuditEngineData, type AuditEngineData } from '../../lib/audits';

interface WorkspaceState {
  knowledge: KnowledgeEngineData;
  training: TrainingEngineData;
  checklists: ChecklistEngineData;
  audits: AuditEngineData;
}

function friendlyError(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message;
  return 'Knowledge Workspace could not reach live Supabase data. Ask an administrator to check the connection and read policies.';
}

function fileLabel(sourceUri: string): string {
  return sourceUri.split('/').pop() || sourceUri || 'Source file';
}

function matchesQuery(object: KnowledgeObject, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    object.title,
    object.summary ?? '',
    object.category,
    object.manualCode ?? '',
    object.manualTitle,
    object.sourceFileUri,
    object.sourceSectionHeading,
    object.approvedVersion.body,
    ...object.evidence.map((item) => item.sourceSectionHeading),
    ...object.related.map((item) => item.object.title),
  ].some((value) => value.toLowerCase().includes(needle));
}

function folderLabel(manual: KnowledgeManual): string {
  return manual.manualCode ? `${manual.manualCode} · ${manual.title}` : manual.title;
}

function objectRating(object: KnowledgeObject): number {
  const coverageBonus = object.related.length > 0 ? 3 : 0;
  const evidenceBonus = object.evidence.length > 0 ? 2 : 0;
  const summaryBonus = object.summary ? 1 : 0;
  return coverageBonus + evidenceBonus + summaryBonus;
}

function chooseManual(manuals: KnowledgeManual[], object: KnowledgeObject): KnowledgeManual | null {
  return (
    manuals.find((manual) => manual.manualCode !== null && manual.manualCode === object.manualCode) ??
    manuals.find((manual) => manual.title === object.manualTitle) ??
    manuals.find((manual) => manual.sourceUri === object.sourceFileUri) ??
    null
  );
}

function sourceSectionsForObject(manual: KnowledgeManual | null, object: KnowledgeObject) {
  if (!manual) return [];
  return manual.sections.filter((section) => section.knowledgeIds.includes(object.id));
}

interface KnowledgeWorkspaceProps {
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
}

export function KnowledgeWorkspace({
  onOpenTraining,
  onOpenChecklists,
  onOpenAudits,
}: KnowledgeWorkspaceProps): JSX.Element {
  const [data, setData] = useState<WorkspaceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [manualCode, setManualCode] = useState<ManualFilter>('all');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([getKnowledgeEngineData(), getTrainingEngineData(), getChecklistEngineData(), getAuditEngineData()])
      .then(([knowledge, training, checklists, audits]) => {
        if (!active) return;
        setData({ knowledge, training, checklists, audits });
        setError(null);
        setSelectedObjectId((current) => current ?? knowledge.objects[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (active) setError(friendlyError(reason));
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredObjects = useMemo(() => {
    if (!data) return [];
    return data.knowledge.objects
      .filter((object) => manualCode === 'all' || object.manualCode === manualCode)
      .filter((object) => matchesQuery(object, query));
  }, [data, manualCode, query]);

  useEffect(() => {
    if (!data) return;
    if (filteredObjects.length === 0) {
      if (selectedObjectId !== null) setSelectedObjectId(null);
      return;
    }

    const visible = filteredObjects.find((object) => object.id === selectedObjectId) ?? filteredObjects[0];
    if (visible && visible.id !== selectedObjectId) setSelectedObjectId(visible.id);
  }, [data, filteredObjects, selectedObjectId]);

  const selectedObject = useMemo(
    () => data?.knowledge.objects.find((object) => object.id === selectedObjectId) ?? null,
    [data, selectedObjectId],
  );

  const selectedManual = useMemo(() => (data && selectedObject ? chooseManual(data.knowledge.manuals, selectedObject) : null), [data, selectedObject]);
  const sourceSections = useMemo(
    () => (selectedObject && selectedManual ? sourceSectionsForObject(selectedManual, selectedObject) : []),
    [selectedManual, selectedObject],
  );

  const folders = useMemo<SOPFolderTreeItem[]>(() => {
    if (!data) return [];
    const allCount = data.knowledge.objects.length;
    return [
      { id: 'all', title: 'All SOPs', subtitle: 'Entire approved library', count: allCount, selected: manualCode === 'all' },
      ...data.knowledge.manuals.map((manual) => ({
        id: (manual.manualCode ?? 'all') as ManualFilter,
        title: folderLabel(manual),
        subtitle: `${manual.sections.length} source sections · ${fileLabel(manual.sourceUri)}`,
        count: data.knowledge.objects.filter((object) => object.manualCode === manual.manualCode).length,
        selected: manual.manualCode !== null && manualCode === manual.manualCode,
      })),
    ];
  }, [data, manualCode]);

  const favorites = useMemo(() => {
    if (!data) return [];
    return [...data.knowledge.objects].sort((a, b) => objectRating(b) - objectRating(a) || a.title.localeCompare(b.title)).slice(0, 5);
  }, [data]);

  const recentSops = useMemo(() => {
    if (!data) return [];
    return [...data.knowledge.objects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title)).slice(0, 5);
  }, [data]);

  const drafts = useMemo(() => {
    if (!data) return [];
    return data.knowledge.objects
      .filter((object) => object.status !== 'active' || object.approvedVersion.status !== 'approved')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
  }, [data]);

  const recentlyEdited = useMemo(() => {
    if (!data) return [];
    return [...data.knowledge.objects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);
  }, [data]);

  const previewTrainingPaths = useMemo(() => {
    if (!data || !selectedObject) return [];
    return data.training.paths.filter((path) => path.items.some((item) => item.matchedKnowledge.some((matched) => matched.id === selectedObject.id)));
  }, [data, selectedObject]);

  const previewChecklistTemplates = useMemo(() => {
    if (!data || !selectedObject) return [];
    return data.checklists.templates.filter((template) => template.items.some((item) => item.matchedKnowledge.some((matched) => matched.id === selectedObject.id)));
  }, [data, selectedObject]);

  const previewAuditTemplates = useMemo(() => {
    if (!data || !selectedObject) return [];
    return data.audits.templates.filter((template) => template.items.some((item) => item.matchedKnowledge.some((matched) => matched.id === selectedObject.id)));
  }, [data, selectedObject]);

  function openObject(id: string): void {
    if (!data) return;
    const object = data.knowledge.objects.find((entry) => entry.id === id) ?? null;
    if (object?.manualCode) setManualCode(object.manualCode);
    setSelectedObjectId(id);
  }

  return (
    <section className="pageStack knowledgeWorkspaceShell">
      <div className="sectionHeader">
        <div>
          <h2>Knowledge Workspace</h2>
          <p>A read-only SOP workspace for browsing the approved knowledge library like modern knowledge software.</p>
        </div>
        <div className="engineStats">
          <span>{data?.knowledge.manuals.length ?? '...'} folders</span>
          <span>{data?.knowledge.objects.length ?? '...'} SOPs</span>
          <span>{data?.knowledge.relationships.length ?? '...'} links</span>
        </div>
      </div>

      {error && (
        <div className="notice error actionNotice">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      {!data ? (
        <EmptyState icon={BookOpen} title="Loading Knowledge Workspace" description="Pulling live SOP folders, favorites, recent items, and previews from Supabase." />
      ) : (
        <div className="knowledgeWorkspaceLayout">
          <aside className="knowledgeWorkspaceSidebar">
            <SOPFolderTree folders={folders} onSelectFolder={setManualCode} />
            <FavoriteSOPs objects={favorites} onSelectObject={openObject} />
            <RecentSOPs objects={recentSops} onSelectObject={openObject} />
          </aside>

          <SOPLibrary
            folderLabel={manualCode === 'all' ? 'all folders' : manualCode}
            drafts={drafts}
            objects={filteredObjects}
            onQueryChange={setQuery}
            onSelectObject={openObject}
            query={query}
            recentlyEdited={recentlyEdited}
          />

          <div className="knowledgeWorkspacePreview">
            <div className="workspacePreviewSummary">
              <MetricCard label="Visible SOPs" value={filteredObjects.length} helper={manualCode === 'all' ? 'Across the whole library' : `Folder ${manualCode}`} />
              <MetricCard label="Recently edited" value={recentlyEdited.length} helper="Updated approved knowledge" />
              <MetricCard label="Drafts" value={drafts.length} helper="Not-yet-active records" />
            </div>

            {selectedObject ? (
              <SOPPreview
                auditTemplates={previewAuditTemplates}
                checklistTemplates={previewChecklistTemplates}
                coverage={data.knowledge.coverage}
                manual={selectedManual}
                object={selectedObject}
                relatedSOPs={selectedObject.related}
                sourceSections={sourceSections}
                trainingPaths={previewTrainingPaths}
                onOpenAudits={onOpenAudits}
                onOpenChecklists={onOpenChecklists}
                onOpenTraining={onOpenTraining}
              />
            ) : (
              <OSCard className="workspacePreviewPanel">
                <EmptyState icon={Layers3} title="Select a SOP" description="Choose a folder or a SOP to preview its approved knowledge, evidence, and related work." />
              </OSCard>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
