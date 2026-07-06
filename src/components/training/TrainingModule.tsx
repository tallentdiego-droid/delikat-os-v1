import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, BookOpenText, GraduationCap, Search, ShieldAlert } from 'lucide-react';
import { getTrainingEngineData, type TrainingEngineData, type TrainingPath, type TrainingPathItem } from '../../lib/training';
import {
  CoverageBadge,
  EmptyState,
  MetricCard as SharedMetricCard,
  SOPCard,
  SOPCoverageWarning,
  SOPRelatedKnowledge,
  TrainingPathCard as SharedTrainingPathCard,
} from '../os';

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
    item.knowledgeObject?.title ? `SOP: ${item.knowledgeObject.title}` : null,
    item.process ? `Process: ${item.process.name}` : null,
    item.processStep ? `Step: ${item.processStep.title}` : null,
  ];

  return refs.filter((value): value is string => Boolean(value));
}

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }): JSX.Element {
  return <SharedMetricCard label={label} value={value} helper={helper} />;
}

function TrainingPathItemCard({
  item,
  onOpenKnowledgeBase,
}: {
  item: TrainingPathItem;
  onOpenKnowledgeBase?: () => void;
}): JSX.Element {
  const linkedKnowledge = item.matchedKnowledge[0] ?? item.knowledgeObject;
  const linkedKnowledgeItems = linkedKnowledge
    ? [
        {
          id: linkedKnowledge.id,
          title: linkedKnowledge.title,
          subtitle: linkedKnowledge.manualTitle,
          summary: linkedKnowledge.preview,
          status: linkedKnowledge.status,
          notes: linkedKnowledge.manualCode ?? linkedKnowledge.sourceSectionHeading,
        },
      ]
    : [];

  return (
    <SOPCard
      className="trainingItemCard"
      coverageLabel={item.coverageStatus === 'satisfied' ? 'SOP covered' : 'Missing SOP'}
      coveragePercent={item.coverageStatus === 'satisfied' ? 100 : 0}
      metadata={[
        { label: 'Step', value: `#${item.sortOrder}` },
        { label: 'Type', value: item.itemType },
        { label: 'Required', value: item.completionRequired ? 'Yes' : 'No' },
      ]}
      sourceDetail={item.requiredKnowledgeItem.code}
      sourceLabel="Training requirement"
      status={item.coverageStatus === 'satisfied' ? 'satisfied' : 'missing'}
      summary={item.requiredKnowledgeItem.description ?? item.gapSummary ?? 'Training requirement from the coverage engine.'}
      title={item.requiredKnowledgeItem.title}
    >
      <div className="trainingItemLinks">
        {itemReferences(item).length ? (
          itemReferences(item).map((label) => <span key={label}>{label}</span>)
        ) : (
          <span>No linked SOP or process record yet.</span>
        )}
      </div>
      {linkedKnowledgeItems.length > 0 ? (
        <SOPRelatedKnowledge emptyLabel="No linked SOP preview yet." items={linkedKnowledgeItems} title="Linked SOP" />
      ) : (
        <SOPCoverageWarning
          action={
            onOpenKnowledgeBase ? (
              <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
                <BookOpenText aria-hidden="true" size={16} />
                Open SOP coverage
              </button>
            ) : undefined
          }
          coveragePercent={0}
          description="This training requirement does not yet have an approved SOP linked to it."
          detail={item.gapSummary ?? 'No approved SOP currently satisfies this requirement.'}
          title="Missing SOP"
        />
      )}
    </SOPCard>
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
            <p>{path.description ?? 'Starter training path built from existing Delikat SOPs and operations data.'}</p>
          </div>
          <CoverageBadge coveragePercent={path.coveragePercent} label={path.missingItemCount > 0 ? `${path.missingItemCount} gaps` : 'fully covered'} />
        </div>
        <div className="summaryGrid">
          <MetricCard label="Department" value={valueOrDefault(path.department?.name)} helper={path.department?.code ?? undefined} />
          <MetricCard label="Role" value={valueOrDefault(path.role?.name)} helper={path.role?.code ?? undefined} />
          <MetricCard label="Area" value={valueOrDefault(path.area?.name)} helper={path.area?.code ?? undefined} />
          <MetricCard label="Coverage" value={`${path.coveragePercent}%`} helper={`${path.satisfiedItemCount} of ${path.requiredItemCount} items`} />
          <MetricCard label="SOP links" value={path.linkedKnowledgeCount} helper="Approved SOPs" />
          <MetricCard label="Process links" value={path.linkedProcessCount} helper={`${path.linkedProcessStepCount} step links`} />
        </div>
      </section>

      <section className="detailSection">
        <div className="trainingDetailBanner">
          <div>
            <strong>Read-only training foundation</strong>
            <p>Training paths are generated from live training requirements, operations processes, and coverage gaps.</p>
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
              <SOPCoverageWarning
                key={item.id}
                title={item.requiredKnowledgeItem.title}
                description="Training requirement is not yet satisfied by an approved SOP."
                detail={item.gapSummary ?? 'No approved SOP is linked yet.'}
                coveragePercent={0}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShieldAlert}
            title="No coverage gaps"
            description="No coverage gaps are currently detected for this starter path."
          />
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
            <p>Read-only training paths generated from live SOP, operations, and coverage data.</p>
          </div>
        </div>
        <EmptyState icon={AlertCircle} title="Training data could not load" description={error} />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="pageStack trainingEngine">
        <div className="sectionHeader">
          <div>
            <h2>Training</h2>
            <p>Read-only training paths generated from live SOP, operations, and coverage data.</p>
          </div>
        </div>
        <EmptyState
          icon={GraduationCap}
          title="Loading training foundation"
          description="Pulling starter paths, training requirements, and coverage gaps from Supabase."
        />
      </section>
    );
  }

  if (filteredPaths.length === 0) {
    return (
      <section className="pageStack trainingEngine">
        <div className="sectionHeader">
          <div>
            <h2>Training</h2>
            <p>Read-only training paths generated from live SOP, operations, and coverage data.</p>
          </div>
        </div>
        <div className="toolbar trainingToolbar">
          <label className="searchField">
            <Search aria-hidden="true" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search training paths or linked SOPs" />
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
        <EmptyState
          icon={GraduationCap}
          title="No matching training paths"
          description="Try a broader search or reset the filters to see the seeded onboarding paths."
        />
      </section>
    );
  }

  return (
    <section className="pageStack trainingEngine">
      <div className="sectionHeader">
        <div>
          <h2>Training</h2>
          <p>Read-only training paths generated from live SOP, operations, and coverage data.</p>
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
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search training paths or linked SOPs" />
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
                  <SharedTrainingPathCard key={path.id} path={path} selected={path.id === selectedPath?.id} onSelect={setSelectedPathId} />
                ))}
              </div>
            </section>
          ))}
        </aside>

        <div className="detailPanel trainingDetailPanel">
          {selectedPath ? (
            <TrainingPathDetail path={selectedPath} onOpenKnowledgeBase={onOpenKnowledgeBase} />
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No training path selected"
              description="Choose a seeded path to inspect linked SOPs, process steps, and coverage gaps."
            />
          )}
        </div>
      </div>
    </section>
  );
}
