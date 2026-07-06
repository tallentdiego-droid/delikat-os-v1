import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, BookOpenText, GraduationCap, Search, ShieldAlert } from 'lucide-react';
import { getTrainingEngineData, type TrainingEngineData, type TrainingPath, type TrainingPathItem } from '../../lib/training';

interface TrainingModuleProps {
  onOpenKnowledgeBase?: () => void;
}

interface TrainingFilters {
  role: string;
  department: string;
  status: string;
}

const emptyFilters: TrainingFilters = {
  role: 'all',
  department: 'all',
  status: 'all',
};

function friendlyError(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message;
  return 'Training Engine could not reach the live Supabase data. Ask an administrator to check the connection and read policies.';
}

function formatDate(value: string | null): string {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function valueOrDefault(value: string | null | undefined): string {
  return value && value.length > 0 ? value : 'Unassigned';
}

function pathSearchText(path: TrainingPath): string {
  return [
    path.title,
    path.description ?? '',
    path.code,
    path.department?.name ?? '',
    path.role?.name ?? '',
    path.area?.name ?? '',
    ...path.items.flatMap((item) => [
      item.requiredKnowledgeItem.title,
      item.requiredKnowledgeItem.description ?? '',
      item.knowledgeObject?.title ?? '',
      item.process?.name ?? '',
      item.processStep?.title ?? '',
      item.gapSummary ?? '',
    ]),
  ]
    .join(' ')
    .toLowerCase();
}

function sortPaths(paths: TrainingPath[]): TrainingPath[] {
  return [...paths].sort((a, b) => a.title.localeCompare(b.title));
}

function groupPathsByRole(paths: TrainingPath[]): Array<{ role: string; paths: TrainingPath[] }> {
  const groups = new Map<string, TrainingPath[]>();
  for (const path of paths) {
    const role = path.role?.name ?? 'Unassigned';
    groups.set(role, [...(groups.get(role) ?? []), path]);
  }

  return Array.from(groups.entries())
    .map(([role, groupPaths]) => ({ role, paths: sortPaths(groupPaths) }))
    .sort((a, b) => a.role.localeCompare(b.role));
}

function itemReferences(item: TrainingPathItem): string[] {
  const refs = [
    item.knowledgeObject?.title ? `Knowledge: ${item.knowledgeObject.title}` : null,
    item.process ? `Process: ${item.process.name}` : null,
    item.processStep ? `Step: ${item.processStep.title}` : null,
  ];

  return refs.filter((value): value is string => Boolean(value));
}

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }): JSX.Element {
  return (
    <article className="metricCard">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <p className="quietText">{helper}</p>}
    </article>
  );
}

function TrainingPathCard({
  path,
  selected,
  onSelect,
}: {
  path: TrainingPath;
  selected: boolean;
  onSelect: (id: string) => void;
}): JSX.Element {
  return (
    <button className={selected ? 'trainingPathCard active' : 'trainingPathCard'} type="button" onClick={() => onSelect(path.id)}>
      <div className="trainingPathCardHeader">
        <strong>{path.title}</strong>
        <span>{path.coveragePercent}% covered</span>
      </div>
      <p>{path.description ?? 'No description provided.'}</p>
      <div className="trainingPathCardMeta">
        <span>{valueOrDefault(path.department?.name)}</span>
        <span>{valueOrDefault(path.area?.name)}</span>
        <span>{path.items.length} items</span>
      </div>
      <div className="trainingPathCardMeta">
        <span>{path.missingItemCount} gaps</span>
        <span>{path.linkedKnowledgeCount} knowledge links</span>
        <span>{path.linkedProcessCount} process links</span>
      </div>
    </button>
  );
}

function TrainingPathItemCard({
  item,
  onOpenKnowledgeBase,
}: {
  item: TrainingPathItem;
  onOpenKnowledgeBase?: () => void;
}): JSX.Element {
  return (
    <article className="trainingItemCard">
      <div className="trainingItemHeader">
        <div>
          <strong>{item.requiredKnowledgeItem.title}</strong>
          <p>{item.requiredKnowledgeItem.description ?? 'Required knowledge item from the coverage engine.'}</p>
        </div>
        <span className={item.coverageStatus === 'satisfied' ? 'gapBadge satisfied' : 'gapBadge missing'}>
          {item.coverageStatus}
        </span>
      </div>
      <div className="trainingItemMeta">
        <span>#{item.sortOrder}</span>
        <span>{item.itemType}</span>
        <span>{item.completionRequired ? 'Required' : 'Optional'}</span>
      </div>
      <div className="trainingItemLinks">
        {itemReferences(item).length ? (
          itemReferences(item).map((label) => <span key={label}>{label}</span>)
        ) : (
          <span>No linked knowledge or process record yet.</span>
        )}
      </div>
      <p className="previewText">
        {item.coverageStatus === 'satisfied'
          ? item.matchedKnowledge[0]
            ? item.matchedKnowledge[0].preview
            : 'Coverage is satisfied by existing approved knowledge.'
          : item.gapSummary ?? 'No approved knowledge currently satisfies this item.'}
      </p>
      {item.coverageStatus === 'missing' && onOpenKnowledgeBase && (
        <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
          <BookOpenText aria-hidden="true" size={16} />
          Open Knowledge coverage
        </button>
      )}
    </article>
  );
}

function TrainingPathDetail({
  path,
  onOpenKnowledgeBase,
}: {
  path: TrainingPath;
  onOpenKnowledgeBase?: () => void;
}): JSX.Element {
  const activeItems = path.items.filter((item) => item.completionRequired);
  const missingItems = path.items.filter((item) => item.coverageStatus === 'missing');
  const latestProgress = path.progress
    .slice()
    .filter((item) => Boolean(item.completedAt))
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());

  return (
    <div className="detailStack trainingDetail">
      <section className="detailSection">
        <div className="trainingDetailHeader">
          <div>
            <h3>{path.title}</h3>
            <p>{path.description ?? 'Starter training path built from existing Delikat knowledge and operations data.'}</p>
          </div>
          <span className={path.missingItemCount > 0 ? 'gapBadge missing' : 'gapBadge satisfied'}>
            {path.missingItemCount > 0 ? `${path.missingItemCount} gaps` : 'fully covered'}
          </span>
        </div>
        <div className="summaryGrid">
          <MetricCard label="Department" value={valueOrDefault(path.department?.name)} helper={path.department?.code ?? undefined} />
          <MetricCard label="Role" value={valueOrDefault(path.role?.name)} helper={path.role?.code ?? undefined} />
          <MetricCard label="Area" value={valueOrDefault(path.area?.name)} helper={path.area?.code ?? undefined} />
          <MetricCard label="Coverage" value={`${path.coveragePercent}%`} helper={`${path.satisfiedItemCount} of ${path.requiredItemCount} items`} />
          <MetricCard label="Knowledge links" value={path.linkedKnowledgeCount} helper="Approved knowledge objects" />
          <MetricCard label="Process links" value={path.linkedProcessCount} helper={`${path.linkedProcessStepCount} step links`} />
        </div>
      </section>

      <section className="detailSection">
        <div className="trainingDetailBanner">
          <div>
            <strong>Read-only training foundation</strong>
            <p>Training paths are generated from live required knowledge, operations processes, and coverage gaps.</p>
          </div>
          {missingItems.length > 0 && onOpenKnowledgeBase && (
            <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
              <ArrowRight aria-hidden="true" size={16} />
              Review gaps in Knowledge
            </button>
          )}
        </div>
      </section>

      <section className="detailSection">
        <h4>Path items</h4>
        <div className="trainingItemList">
          {activeItems.length > 0 ? (
            activeItems.map((item) => <TrainingPathItemCard item={item} key={item.id} onOpenKnowledgeBase={onOpenKnowledgeBase} />)
          ) : (
            <div className="emptyInline">No training items are linked yet.</div>
          )}
        </div>
      </section>

      <section className="detailSection">
        <h4>Coverage gaps</h4>
        {missingItems.length > 0 ? (
          <div className="trainingGapList">
            {missingItems.map((item) => (
              <article className="trainingGapCard" key={item.id}>
                <div className="trainingGapHeader">
                  <strong>{item.requiredKnowledgeItem.title}</strong>
                  <span className="gapBadge missing">missing</span>
                </div>
                <p>{item.gapSummary ?? 'No approved knowledge object is linked yet.'}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyInline">No coverage gaps are currently detected for this starter path.</div>
        )}
      </section>

      <section className="detailSection">
        <h4>Assignments and progress</h4>
        <div className="trainingProgressGrid">
          <article className="metricCard">
            <span>Assignments</span>
            <strong>{path.assignments.length}</strong>
            <p className="quietText">Starter catalog only, no active user assignments yet.</p>
          </article>
          <article className="metricCard">
            <span>Progress entries</span>
            <strong>{path.progress.length}</strong>
            <p className="quietText">Completion records will appear once training is tracked.</p>
          </article>
          <article className="metricCard">
            <span>Latest update</span>
            <strong>{formatDate(path.updatedAt)}</strong>
            <p className="quietText">{latestProgress.length ? `Most recent progress state: ${latestProgress[0].status}` : 'No progress activity yet.'}</p>
          </article>
        </div>
      </section>
    </div>
  );
}

export function TrainingModule({ onOpenKnowledgeBase }: TrainingModuleProps = {}): JSX.Element {
  const [data, setData] = useState<TrainingEngineData | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TrainingFilters>(emptyFilters);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getTrainingEngineData()
      .then((nextData) => {
        if (!isMounted) return;
        setData(nextData);
        setSelectedPathId((current) => current ?? nextData.paths[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (isMounted) setError(friendlyError(reason));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const availableRoles = useMemo(
    () => Array.from(new Map((data?.paths ?? []).map((path) => [path.role?.id ?? 'unassigned', path.role?.name ?? 'Unassigned']))).map(([id, name]) => ({
      id,
      name,
    })),
    [data],
  );

  const availableDepartments = useMemo(
    () => Array.from(new Map((data?.paths ?? []).map((path) => [path.department?.id ?? 'unassigned', path.department?.name ?? 'Unassigned']))).map(([id, name]) => ({
      id,
      name,
    })),
    [data],
  );

  const filteredPaths = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.paths ?? []).filter((path) => {
      const matchesQuery = !needle || pathSearchText(path).includes(needle);
      const matchesRole = filters.role === 'all' || (path.role?.id ?? 'unassigned') === filters.role;
      const matchesDepartment = filters.department === 'all' || (path.department?.id ?? 'unassigned') === filters.department;
      const matchesStatus = filters.status === 'all' || path.status === filters.status;
      return matchesQuery && matchesRole && matchesDepartment && matchesStatus;
    });
  }, [data, filters.department, filters.role, filters.status, query]);

  useEffect(() => {
    if (filteredPaths.length === 0) return;
    if (!selectedPathId || !filteredPaths.some((path) => path.id === selectedPathId)) {
      setSelectedPathId(filteredPaths[0].id);
    }
  }, [filteredPaths, selectedPathId]);

  const selectedPath = useMemo(
    () => filteredPaths.find((path) => path.id === selectedPathId) ?? filteredPaths[0] ?? null,
    [filteredPaths, selectedPathId],
  );

  const groupedPaths = useMemo(() => groupPathsByRole(filteredPaths), [filteredPaths]);

  if (error) {
    return (
      <section className="pageStack trainingEngine">
        <div className="sectionHeader">
          <div>
            <h2>Training</h2>
            <p>Read-only training paths generated from live knowledge and operations data.</p>
          </div>
        </div>
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="pageStack trainingEngine">
        <div className="sectionHeader">
          <div>
            <h2>Training</h2>
            <p>Read-only training paths generated from live knowledge and operations data.</p>
          </div>
        </div>
        <div className="loadingPanel">
          <div className="loadingPulse" />
          <div>
            <strong>Loading training foundation</strong>
            <p>Pulling starter paths, required knowledge items, and coverage gaps from Supabase.</p>
          </div>
        </div>
      </section>
    );
  }

  if (filteredPaths.length === 0) {
    return (
      <section className="pageStack trainingEngine">
        <div className="sectionHeader">
          <div>
            <h2>Training</h2>
            <p>Read-only training paths generated from live knowledge and operations data.</p>
          </div>
        </div>
        <div className="toolbar trainingToolbar">
          <label className="searchField">
            <Search aria-hidden="true" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search training paths or linked knowledge" />
          </label>
          <label className="selectField">
            <span>Role</span>
            <select value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
              <option value="all">All</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label className="selectField">
            <span>Department</span>
            <select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>
              <option value="all">All</option>
              {availableDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="emptyState refined">
          <GraduationCap aria-hidden="true" size={18} />
          <h3>No matching training paths</h3>
          <p>Try a broader search or reset the filters to see the seeded onboarding paths.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pageStack trainingEngine">
      <div className="sectionHeader">
        <div>
          <h2>Training</h2>
          <p>Read-only training paths generated from live knowledge and operations data.</p>
        </div>
        <div className="engineStats">
          <span>{data.stats.totalPaths} paths</span>
          <span>{data.stats.totalItems} items</span>
          <span>{data.stats.pathsWithGaps} paths with gaps</span>
          <span>{data.stats.itemsMissingCoverage} missing coverage</span>
        </div>
      </div>

      <div className="toolbar trainingToolbar">
        <label className="searchField">
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search training paths or linked knowledge" />
        </label>
        <label className="selectField">
          <span>Role</span>
          <select value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
            <option value="all">All</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="selectField">
          <span>Department</span>
          <select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>
            <option value="all">All</option>
            {availableDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="trainingLayout">
        <aside className="listPanel trainingList">
          {groupedPaths.map((group) => (
            <section className="trainingRoleGroup" key={group.role}>
              <div className="trainingRoleHeader">
                <strong>{group.role}</strong>
                <span>{group.paths.length} paths</span>
              </div>
              <div className="trainingPathList">
                {group.paths.map((path) => (
                  <TrainingPathCard key={path.id} path={path} selected={path.id === selectedPath?.id} onSelect={setSelectedPathId} />
                ))}
              </div>
            </section>
          ))}
        </aside>

        <div className="detailPanel trainingDetailPanel">
          {selectedPath ? (
            <TrainingPathDetail path={selectedPath} onOpenKnowledgeBase={onOpenKnowledgeBase} />
          ) : (
            <div className="emptyState refined">
              <ShieldAlert aria-hidden="true" size={18} />
              <h3>No training path selected</h3>
              <p>Choose a seeded path to inspect linked knowledge, process steps, and coverage gaps.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
