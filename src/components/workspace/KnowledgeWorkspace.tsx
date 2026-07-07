import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Layers3, Plus, X } from 'lucide-react';
import { SOPFolderTree, type SOPFolderTreeItem } from './SOPFolderTree';
import { SOPLibrary } from './SOPLibrary';
import { SOPPreview } from './SOPPreview';
import { EmptyState, OSCard, SOPCard } from '../os';
import {
  createKnowledgeDraft,
  getKnowledgeEngineData,
  previewText,
  type KnowledgeEngineData,
  type KnowledgeObject,
  type KnowledgeOntologyEntity,
  type ManualFilter,
  type KnowledgeManual,
  type CreateKnowledgeDraftInput,
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
  return 'Studio could not reach live Supabase data. Ask an administrator to check the connection and read policies.';
}

function fileLabel(sourceUri: string): string {
  return sourceUri.split('/').pop() || sourceUri || 'Source file';
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasNeedsImprovement(object: KnowledgeObject): boolean {
  return object.status !== 'active' || object.approvedVersion.status !== 'approved' || object.evidence.length === 0 || object.ontology.roles.length === 0 || object.ontology.departments.length === 0;
}

function objectSearchText(object: KnowledgeObject): string {
  return [
    object.title,
    object.summary ?? '',
    object.approvedVersion.body,
    object.approvedVersion.notes ?? '',
    object.category,
    object.manualTitle,
    object.sourceFileUri,
    object.sourceSectionHeading,
    object.preview,
    ...object.evidence.map((item) => `${item.sourceManualTitle} ${item.sourceSectionHeading} ${item.sourceSectionBody}`),
    ...object.related.map((item) => `${item.object.title} ${item.relationship.typeName} ${item.object.manualTitle}`),
    ...object.ontology.departments.map((item) => `${item.name} ${item.code}`),
    ...object.ontology.roles.map((item) => `${item.name} ${item.code}`),
    ...object.ontology.areas.map((item) => `${item.name} ${item.code}`),
    ...object.ontology.businessProcesses.map((item) => `${item.name} ${item.code}`),
    ...object.ontology.tags.map((item) => `${item.name} ${item.code}`),
  ]
    .filter(Boolean)
    .join(' ');
}

function searchScore(object: KnowledgeObject, query: string): number {
  const needle = normalize(query);
  if (!needle) return 0;

  const haystack = objectSearchText(object).toLowerCase();
  if (!haystack.includes(needle)) return -1;

  let score = 0;
  const exactTitle = normalize(object.title) === needle;
  const titleMatch = normalize(object.title).includes(needle);
  const summaryMatch = normalize(object.summary ?? '').includes(needle);
  const bodyMatch = normalize(object.approvedVersion.body).includes(needle);
  const sourceMatch = normalize(`${object.manualTitle} ${object.sourceFileUri} ${object.sourceSectionHeading}`).includes(needle);
  const tagMatch = object.ontology.tags.some((tag) => normalize(`${tag.name} ${tag.code}`).includes(needle));
  const roleMatch = object.ontology.roles.some((role) => normalize(`${role.name} ${role.code}`).includes(needle));
  const departmentMatch = object.ontology.departments.some((department) => normalize(`${department.name} ${department.code}`).includes(needle));
  const areaMatch = object.ontology.areas.some((area) => normalize(`${area.name} ${area.code}`).includes(needle));
  const processMatch = object.ontology.businessProcesses.some((process) => normalize(`${process.name} ${process.code}`).includes(needle));
  const relatedMatch = object.related.some((related) => normalize(`${related.object.title} ${related.relationship.typeName} ${related.object.manualTitle}`).includes(needle));

  if (exactTitle) score += 100;
  if (titleMatch) score += 80;
  if (summaryMatch) score += 45;
  if (bodyMatch) score += 35;
  if (tagMatch) score += 30;
  if (sourceMatch) score += 28;
  if (roleMatch) score += 24;
  if (departmentMatch) score += 24;
  if (areaMatch) score += 20;
  if (processMatch) score += 20;
  if (relatedMatch) score += 16;
  if (object.evidence.length > 0) score += 8;
  if (object.status === 'active') score += 6;
  return score;
}

function matchesQuery(object: KnowledgeObject, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return objectSearchText(object).toLowerCase().includes(needle);
}

function folderLabel(manual: KnowledgeManual): string {
  return manual.manualCode ? `${manual.manualCode} · ${manual.title}` : manual.title;
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

interface NewSOPDraftState {
  title: string;
  summary: string;
  body: string;
  notes: string;
  departmentId: string;
  roleId: string;
  tagIds: string[];
}

function buildWorkspaceDraftObject(
  created: Awaited<ReturnType<typeof createKnowledgeDraft>>,
): KnowledgeObject {
  return created.knowledge;
}

interface KnowledgeWorkspaceProps {
  openNewSOPRequestId?: number;
  initialSelectedObjectId?: string | null;
  initialSelectedObjectRequestId?: number;
  initialSearchQuery?: string;
  initialSearchRequestId?: number;
}

export function KnowledgeWorkspace({
  openNewSOPRequestId,
  initialSelectedObjectId,
  initialSelectedObjectRequestId,
  initialSearchQuery,
  initialSearchRequestId,
}: KnowledgeWorkspaceProps): JSX.Element {
  const [data, setData] = useState<WorkspaceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState<'all' | 'imported' | 'drafts' | 'user_created' | 'recent'>('all');
  const [manualCode, setManualCode] = useState<ManualFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [needsImprovementOnly, setNeedsImprovementOnly] = useState(false);
  const [sortMode, setSortMode] = useState<'recent' | 'title' | 'manual'>('recent');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [localObjects, setLocalObjects] = useState<KnowledgeObject[]>([]);
  const [newSOPOpen, setNewSOPOpen] = useState(false);
  const [newSOPSaving, setNewSOPSaving] = useState(false);
  const [newSOPError, setNewSOPError] = useState<string | null>(null);
  const [newSOPDraft, setNewSOPDraft] = useState<NewSOPDraftState>({
    title: '',
    summary: '',
    body: '',
    notes: '',
    departmentId: 'all',
    roleId: 'all',
    tagIds: [],
  });

  useEffect(() => {
    if (typeof openNewSOPRequestId === 'number' && openNewSOPRequestId > 0) {
      openNewSOPModal();
    }
  }, [openNewSOPRequestId]);

  useEffect(() => {
    if (typeof initialSearchRequestId !== 'number') return;
    const nextQuery = initialSearchQuery?.trim() ?? '';
    setQuery(nextQuery);
    setManualCode('all');
    setDepartmentFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
    setNeedsImprovementOnly(false);
    setSelectedObjectId(null);
  }, [initialSearchQuery, initialSearchRequestId]);

  useEffect(() => {
    if (typeof initialSelectedObjectRequestId !== 'number') return;
    if (initialSelectedObjectId) {
      setSelectedObjectId(initialSelectedObjectId);
    }
  }, [initialSelectedObjectId, initialSelectedObjectRequestId]);

  const refreshData = useCallback(async (): Promise<void> => {
    try {
      const [knowledge, training, checklists, audits] = await Promise.all([
        getKnowledgeEngineData(),
        getTrainingEngineData(),
        getChecklistEngineData(),
        getAuditEngineData(),
      ]);
      setData({ knowledge, training, checklists, audits });
      setError(null);
      setSelectedObjectId((current) => current ?? knowledge.objects[0]?.id ?? null);
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }, []);

  useEffect(() => {
    let active = true;

    void refreshData().catch((reason: unknown) => {
      if (active) setError(friendlyError(reason));
    });

    return () => {
      active = false;
    };
  }, [refreshData]);

  const workspaceObjects = useMemo(() => {
    if (!data) return localObjects;
    return [...data.knowledge.objects, ...localObjects];
  }, [data, localObjects]);

  const recentlyEditedIds = useMemo(
    () =>
      new Set(
        [...workspaceObjects]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title))
          .slice(0, 8)
          .map((object) => object.id),
      ),
    [workspaceObjects],
  );

  const filteredObjects = useMemo(() => {
    if (!data) return [];
    const filtered = workspaceObjects.filter((object) => {
      const folderMatches =
        folderFilter === 'all' ||
        (folderFilter === 'imported' && object.sourceType === 'imported') ||
        (folderFilter === 'drafts' && (object.status !== 'active' || object.approvedVersion.status !== 'approved')) ||
        (folderFilter === 'user_created' && object.sourceType === 'user_created') ||
        (folderFilter === 'recent' && recentlyEditedIds.has(object.id));
      const manualMatches = manualCode === 'all' || object.manualCode === manualCode;
      const departmentMatches =
        departmentFilter === 'all' || object.ontology.departments.some((department) => department.id === departmentFilter);
      const roleMatches = roleFilter === 'all' || object.ontology.roles.some((role) => role.id === roleFilter);
      const statusMatches = statusFilter === 'all' || object.status === statusFilter || object.approvedVersion.status === statusFilter;
      const needsImprovementMatches = !needsImprovementOnly || hasNeedsImprovement(object);
      return folderMatches && manualMatches && departmentMatches && roleMatches && statusMatches && needsImprovementMatches && matchesQuery(object, query);
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'title') return a.title.localeCompare(b.title) || b.updatedAt.localeCompare(a.updatedAt);
      if (sortMode === 'manual') {
        const manualDiff = (a.manualCode ?? a.manualTitle).localeCompare(b.manualCode ?? b.manualTitle);
        if (manualDiff !== 0) return manualDiff;
        return a.title.localeCompare(b.title) || b.updatedAt.localeCompare(a.updatedAt);
      }

      const scoreDiff = searchScore(b, query) - searchScore(a, query);
      if (query.trim() && scoreDiff !== 0) return scoreDiff;
      return b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title);
    });
  }, [data, departmentFilter, folderFilter, manualCode, needsImprovementOnly, query, recentlyEditedIds, roleFilter, sortMode, statusFilter, workspaceObjects]);

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
    () => workspaceObjects.find((object) => object.id === selectedObjectId) ?? null,
    [selectedObjectId, workspaceObjects],
  );

  const selectedManual = useMemo(() => (data && selectedObject ? chooseManual(data.knowledge.manuals, selectedObject) : null), [data, selectedObject]);
  const sourceSections = useMemo(
    () => (selectedObject && selectedManual ? sourceSectionsForObject(selectedManual, selectedObject) : []),
    [selectedManual, selectedObject],
  );

  const folders = useMemo<SOPFolderTreeItem[]>(() => {
    if (!data) return [];
    const allCount = workspaceObjects.length;
    return [
      { id: 'all', title: 'All SOPs', subtitle: 'Everything in the live library', count: allCount, selected: folderFilter === 'all' && manualCode === 'all' },
      {
        id: 'imported',
        title: 'Imported manuals',
        subtitle: 'Source manuals only',
        count: workspaceObjects.filter((object) => object.sourceType === 'imported').length,
        selected: folderFilter === 'imported',
      },
      {
        id: 'drafts',
        title: 'Drafts',
        subtitle: 'Not yet published',
        count: workspaceObjects.filter((object) => object.status !== 'active' || object.approvedVersion.status !== 'approved').length,
        selected: folderFilter === 'drafts',
      },
      {
        id: 'user_created',
        title: 'User-created',
        subtitle: 'Drafts started in Studio',
        count: workspaceObjects.filter((object) => object.sourceType === 'user_created').length,
        selected: folderFilter === 'user_created',
      },
      {
        id: 'recent',
        title: 'Recently edited',
        subtitle: 'Last updated SOPs',
        count: recentlyEditedIds.size,
        selected: folderFilter === 'recent',
      },
    ];
  }, [data, folderFilter, manualCode, recentlyEditedIds, workspaceObjects]);

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

  const departmentOptions = useMemo<KnowledgeOntologyEntity[]>(
    () => data?.knowledge.ontologyOptions.departments ?? [],
    [data],
  );
  const roleOptions = useMemo<KnowledgeOntologyEntity[]>(
    () => data?.knowledge.ontologyOptions.roles ?? [],
    [data],
  );
  const tagOptions = useMemo<KnowledgeOntologyEntity[]>(
    () => data?.knowledge.ontologyOptions.tags ?? [],
    [data],
  );
  const manualOptions = useMemo(() => data?.knowledge.manuals ?? [], [data]);
  const resultSummary = useMemo(() => {
    const total = workspaceObjects.length;
    if (!data) return 'Loading live results from Supabase.';
    if (query.trim() || departmentFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all' || manualCode !== 'all' || needsImprovementOnly) {
      return `${filteredObjects.length} SOP${filteredObjects.length === 1 ? '' : 's'} matched your search and filters.`;
    }
    return `${total} SOP${total === 1 ? '' : 's'} available in the workspace.`;
  }, [data, departmentFilter, filteredObjects.length, manualCode, needsImprovementOnly, query, roleFilter, statusFilter, workspaceObjects.length]);

  function openObject(id: string): void {
    if (!data) return;
    const object = workspaceObjects.find((entry) => entry.id === id) ?? null;
    if (object?.manualCode) setManualCode(object.manualCode);
    setSelectedObjectId(id);
  }

  function updateLocalObject(object: KnowledgeObject): void {
    if (object.sourceType !== 'user_created') return;
    setLocalObjects((current) => {
      const next = current.map((entry) => (entry.id === object.id ? object : entry));
      if (!next.some((entry) => entry.id === object.id)) next.unshift(object);
      return next;
    });
  }

  function resetNewSOPDraft(): void {
    setNewSOPDraft({
      title: '',
      summary: '',
      body: '',
      notes: '',
      departmentId: 'all',
      roleId: 'all',
      tagIds: [],
    });
    setNewSOPError(null);
  }

  function openNewSOPModal(): void {
    setNewSOPDraft({
      title: '',
      summary: '',
      body: '',
      notes: '',
      departmentId: 'all',
      roleId: 'all',
      tagIds: [],
    });
    setNewSOPError(null);
    setNewSOPOpen(true);
  }

  function closeNewSOPModal(): void {
    if (newSOPSaving) return;
    setNewSOPOpen(false);
    setNewSOPError(null);
    resetNewSOPDraft();
  }

  async function saveNewSOPDraft(): Promise<void> {
    const title = newSOPDraft.title.trim();
    const summary = newSOPDraft.summary.trim();
    const body = newSOPDraft.body.trim();
    const notes = newSOPDraft.notes.trim();

    if (!title || !body) {
      setNewSOPError('A title and body are required to save a new draft.');
      return;
    }

    setNewSOPSaving(true);
    setNewSOPError(null);

    try {
      const input: CreateKnowledgeDraftInput = {
        title,
        summary,
        body,
        notes,
        ontology: {
          departmentId: newSOPDraft.departmentId === 'all' ? null : newSOPDraft.departmentId,
          roleId: newSOPDraft.roleId === 'all' ? null : newSOPDraft.roleId,
          tagIds: newSOPDraft.tagIds,
        },
      };

      const created = await createKnowledgeDraft(input);
      const newObject = buildWorkspaceDraftObject(created);

      setLocalObjects((current) => [newObject, ...current.filter((object) => object.id !== newObject.id)]);
      setSelectedObjectId(newObject.id);
      setManualCode('all');
      setQuery('');
      setDepartmentFilter('all');
      setRoleFilter('all');
      setStatusFilter('all');
      setNeedsImprovementOnly(false);
      setNewSOPOpen(false);
      resetNewSOPDraft();
    } catch (reason) {
      setNewSOPError(reason instanceof Error ? reason.message : 'New SOP draft could not be created.');
    } finally {
      setNewSOPSaving(false);
    }
  }

  return (
    <section className="pageStack knowledgeWorkspaceShell">
      <div className="sectionHeader knowledgeWorkspaceHeader">
        <div>
          <h2>Delikat Studio</h2>
          <p>Browse manuals, search SOPs, edit drafts, and keep imported evidence visible.</p>
        </div>
        <div className="workspaceHeaderActions">
          <button className="iconTextButton" onClick={openNewSOPModal} type="button" disabled={!data}>
            <Plus aria-hidden="true" size={16} />
            New SOP
          </button>
        </div>
      </div>

      {error && (
        <div className="notice error actionNotice">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      {newSOPOpen ? (
        <div className="modalBackdrop" role="presentation" onClick={closeNewSOPModal}>
          <div className="modalPanel workspaceNewSOPModal" role="dialog" aria-modal="true" aria-label="Create new SOP" onClick={(event) => event.stopPropagation()}>
            <div className="workspaceSectionHeader">
              <div>
                <h3>New SOP</h3>
                <p>Create a user-owned SOP draft. Imported manuals stay immutable.</p>
              </div>
              <button className="iconTextButton" onClick={closeNewSOPModal} type="button" disabled={newSOPSaving}>
                <X aria-hidden="true" size={16} />
                Close
              </button>
            </div>

            {newSOPError ? (
              <div className="notice error actionNotice">
                <AlertCircle aria-hidden="true" size={18} />
                <span>{newSOPError}</span>
              </div>
            ) : null}

            <div className="workspaceDraftEditor">
              <label>
                <span>Title</span>
                <input
                  onChange={(event) => setNewSOPDraft((current) => ({ ...current, title: event.target.value }))}
                  value={newSOPDraft.title}
                  placeholder="Enter a clear SOP title"
                />
              </label>
              <label>
                <span>Summary</span>
                <textarea
                  onChange={(event) => setNewSOPDraft((current) => ({ ...current, summary: event.target.value }))}
                  value={newSOPDraft.summary}
                  rows={3}
                  placeholder="Short summary of the SOP"
                />
              </label>
              <label>
                <span>Purpose / body</span>
                <textarea
                  onChange={(event) => setNewSOPDraft((current) => ({ ...current, body: event.target.value }))}
                  value={newSOPDraft.body}
                  rows={8}
                  placeholder="Draft the SOP body"
                />
              </label>
              <label>
                <span>Notes</span>
                <textarea
                  onChange={(event) => setNewSOPDraft((current) => ({ ...current, notes: event.target.value }))}
                  value={newSOPDraft.notes}
                  rows={3}
                  placeholder="Optional draft notes"
                />
              </label>
              <div className="workspaceDraftSplit">
                <label>
                  <span>Department</span>
                  <select
                    onChange={(event) => setNewSOPDraft((current) => ({ ...current, departmentId: event.target.value }))}
                    value={newSOPDraft.departmentId}
                  >
                    <option value="all">No department</option>
                    {departmentOptions.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Role</span>
                  <select
                    onChange={(event) => setNewSOPDraft((current) => ({ ...current, roleId: event.target.value }))}
                    value={newSOPDraft.roleId}
                  >
                    <option value="all">No role</option>
                    {roleOptions.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Tags</span>
                <select
                  multiple
                  onChange={(event) =>
                    setNewSOPDraft((current) => ({
                      ...current,
                      tagIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                    }))
                  }
                  value={newSOPDraft.tagIds}
                >
                  {tagOptions.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <small className="workspaceDraftHint">Hold Command or Control to select multiple tags.</small>
              </label>
            </div>

            <div className="workspacePreviewActions">
              <button className="iconTextButton" onClick={saveNewSOPDraft} type="button" disabled={newSOPSaving}>
                <Plus aria-hidden="true" size={16} />
                Save draft
              </button>
              <button className="iconTextButton" onClick={closeNewSOPModal} type="button" disabled={newSOPSaving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!data ? (
        <div className="knowledgeWorkspaceLayout">
          <aside className="knowledgeWorkspaceSidebar">
            <OSCard className="workspaceSkeletonPanel">
              <div className="workspaceSkeletonLine short" />
              <div className="workspaceSkeletonLine" />
              <div className="workspaceSkeletonLine" />
              <div className="workspaceSkeletonChipRow">
                <span className="workspaceSkeletonChip" />
                <span className="workspaceSkeletonChip" />
                <span className="workspaceSkeletonChip" />
              </div>
            </OSCard>
            <OSCard className="workspaceSkeletonPanel">
              <div className="workspaceSkeletonLine short" />
              <div className="workspaceSkeletonBlock" />
              <div className="workspaceSkeletonBlock" />
              <div className="workspaceSkeletonBlock" />
            </OSCard>
            <OSCard className="workspaceSkeletonPanel">
              <div className="workspaceSkeletonLine short" />
              <div className="workspaceSkeletonBlock" />
              <div className="workspaceSkeletonBlock" />
            </OSCard>
          </aside>

          <div className="workspaceCenter">
            <OSCard className="workspaceSkeletonPanel workspaceSearchSkeleton">
              <div className="workspaceSkeletonLine short" />
              <div className="workspaceSkeletonBar" />
              <div className="workspaceSkeletonChipRow">
                <span className="workspaceSkeletonChip" />
                <span className="workspaceSkeletonChip" />
                <span className="workspaceSkeletonChip" />
                <span className="workspaceSkeletonChip" />
              </div>
            </OSCard>
            <div className="workspaceCardGrid">
              <OSCard className="workspaceSkeletonPanel">
                <div className="workspaceSkeletonLine" />
                <div className="workspaceSkeletonLine short" />
                <div className="workspaceSkeletonBlock" />
              </OSCard>
              <OSCard className="workspaceSkeletonPanel">
                <div className="workspaceSkeletonLine" />
                <div className="workspaceSkeletonLine short" />
                <div className="workspaceSkeletonBlock" />
              </OSCard>
              <OSCard className="workspaceSkeletonPanel">
                <div className="workspaceSkeletonLine" />
                <div className="workspaceSkeletonLine short" />
                <div className="workspaceSkeletonBlock" />
              </OSCard>
            </div>
          </div>

          <div className="knowledgeWorkspacePreview">
            <OSCard className="workspacePreviewPanel workspaceSkeletonPanel">
              <div className="workspaceSkeletonLine short" />
              <div className="workspaceSkeletonBar large" />
              <div className="workspaceSkeletonBlock tall" />
              <div className="workspaceSkeletonBlock" />
            </OSCard>
          </div>
        </div>
      ) : (
        <div className="knowledgeWorkspaceLayout">
          <aside className="knowledgeWorkspaceSidebar">
            <SOPFolderTree
              folders={folders}
              onSelectFolder={(id) => {
                setFolderFilter(id as typeof folderFilter);
                setManualCode('all');
              }}
            />

            <section className="workspaceSection">
              <div className="workspaceSectionHeader">
                <div>
                  <h3>Manuals</h3>
                  <p>Source manuals loaded from Supabase.</p>
                </div>
              </div>
              <div className="workspaceMiniList">
                {manualOptions.length === 0 ? (
                  <div className="workspaceEmpty">No source manuals were loaded yet.</div>
                ) : (
                  manualOptions.map((manual) => {
                    const manualCount = workspaceObjects.filter((object) => object.manualCode === manual.manualCode).length;
                    const isSelected = manualCode === manual.manualCode;
                    return (
                      <OSCard className="workspaceMiniCard" key={manual.id} selected={isSelected}>
                        <button
                          className="workspaceMiniButton"
                          onClick={() => {
                            setFolderFilter('all');
                            setManualCode((manual.manualCode ?? 'all') as ManualFilter);
                          }}
                          type="button"
                        >
                          <div className="workspaceMiniHeader">
                            <div className="workspaceFolderIcon">
                              <Layers3 aria-hidden="true" size={16} />
                            </div>
                            <div>
                              <strong>{folderLabel(manual)}</strong>
                              <p>{fileLabel(manual.sourceUri)}</p>
                            </div>
                          </div>
                          <div className="workspaceFolderMeta">
                            <span>{manual.sections.length} sections</span>
                            <span>{manualCount} SOPs</span>
                          </div>
                        </button>
                      </OSCard>
                    );
                  })
                )}
              </div>
            </section>
          </aside>

          <SOPLibrary
            folderLabel={manualCode === 'all' ? 'all folders' : manualCode}
            departmentFilter={departmentFilter}
            departmentOptions={departmentOptions}
            objects={filteredObjects}
              folderFilter={folderFilter}
              manualFilter={manualCode}
              manualOptions={manualOptions}
              needsImprovementOnly={needsImprovementOnly}
              onDepartmentFilterChange={setDepartmentFilter}
              onManualFilterChange={setManualCode}
              onNeedsImprovementChange={setNeedsImprovementOnly}
              onSortModeChange={setSortMode}
              onOpenNewSOP={openNewSOPModal}
              onRoleFilterChange={setRoleFilter}
              onStatusFilterChange={setStatusFilter}
              sortMode={sortMode}
              roleFilter={roleFilter}
              roleOptions={roleOptions}
              resultSummary={resultSummary}
            selectedObjectId={selectedObjectId}
            statusFilter={statusFilter}
            onQueryChange={setQuery}
            onSelectObject={openObject}
            query={query}
          />

          <div className="knowledgeWorkspacePreview">
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
                onLocalObjectChange={updateLocalObject}
                onRefresh={refreshData}
              />
            ) : (
              <OSCard className="workspacePreviewPanel">
                <EmptyState icon={Layers3} title="Select an SOP to preview" description="Choose a folder or a SOP to preview its approved knowledge, evidence, and related work." />
              </OSCard>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
