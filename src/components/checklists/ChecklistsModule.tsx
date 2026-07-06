import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, ClipboardList, Search, ShieldAlert, Workflow } from 'lucide-react';
import {
  createChecklistRunFromTemplate,
  getChecklistEngineData,
  type ChecklistEngineData,
  type ChecklistTemplate,
  type ChecklistTemplateItem,
  type ChecklistRun,
} from '../../lib/checklists';
import { CoverageBadge, EmptyState, KnowledgeGapCard, LinkedKnowledgePanel, MetricCard as SharedMetricCard, OSCard, StatusBadge } from '../os';

interface ChecklistsModuleProps {
  onOpenKnowledgeBase?: () => void;
}

function friendlyError(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message;
  return 'Checklists could not reach the live Supabase data. Ask an administrator to check the connection and read policies.';
}

function formatDate(value: string | null): string {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function valueOrDefault(value: string | null | undefined): string {
  return value && value.length > 0 ? value : 'Unassigned';
}

function todayBusinessDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function searchText(template: ChecklistTemplate): string {
  return [
    template.title,
    template.description ?? '',
    template.code,
    template.frequency ?? '',
    template.status,
    template.department?.title ?? '',
    template.role?.title ?? '',
    template.area?.title ?? '',
    template.process?.name ?? '',
    ...template.items.flatMap((item) => [
      item.title,
      item.description ?? '',
      item.processStep?.title ?? '',
      item.requiredKnowledgeItem?.title ?? '',
      item.gapSummary ?? '',
    ]),
  ].join(' ').toLowerCase();
}

function matches(template: ChecklistTemplate, query: string): boolean {
  return query.trim().length === 0 || searchText(template).includes(query.trim().toLowerCase());
}

function groupByDepartment(templates: ChecklistTemplate[]): Array<{ department: string; templates: ChecklistTemplate[] }> {
  const grouped = new Map<string, ChecklistTemplate[]>();
  for (const template of templates) {
    const department = template.department?.title ?? 'Unassigned';
    grouped.set(department, [...(grouped.get(department) ?? []), template]);
  }
  return Array.from(grouped.entries())
    .map(([department, items]) => ({ department, templates: [...items].sort((a, b) => a.title.localeCompare(b.title)) }))
    .sort((a, b) => a.department.localeCompare(b.department));
}

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }): JSX.Element {
  return <SharedMetricCard label={label} value={value} helper={helper} />;
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: ChecklistTemplate;
  selected: boolean;
  onSelect: (id: string) => void;
}): JSX.Element {
  return (
    <OSCard className={selected ? 'checklistTemplateCard active' : 'checklistTemplateCard'}>
      <button className="checklistTemplateButton" onClick={() => onSelect(template.id)} type="button">
        <div className="checklistTemplateHeader">
          <div>
            <strong>{template.title}</strong>
            <p>{template.description ?? 'Checklist scaffold derived from live process steps.'}</p>
          </div>
          <CoverageBadge coveragePercent={template.coveragePercent} label={template.missingKnowledgeCount > 0 ? `${template.missingKnowledgeCount} gaps` : 'fully covered'} />
        </div>
        <div className="checklistTemplateMeta">
          <span>{template.process?.name ?? 'Linked process'}</span>
          <span>{template.itemCount} items</span>
          <span>{template.frequency ?? 'No frequency'}</span>
          <span>{template.runCount} runs</span>
        </div>
        <div className="checklistTemplateFooter">
          <StatusBadge status={template.status} />
          <span>{template.openRunCount} open</span>
          <span>Latest {formatDate(template.latestRunAt)}</span>
        </div>
      </button>
    </OSCard>
  );
}

function ChecklistItemCard({ item, onOpenKnowledgeBase }: { item: ChecklistTemplateItem; onOpenKnowledgeBase?: () => void }): JSX.Element {
  const hasGap = item.coverageStatus === 'missing';
  const matchedKnowledge = item.matchedKnowledge[0] ?? null;

  return (
    <OSCard className={hasGap ? 'checklistItemCard gap' : 'checklistItemCard'}>
      <div className="checklistItemHeader">
        <div>
          <strong>{item.title}</strong>
          <p>{item.processStep?.title ?? 'Derived from a seeded process step.'}</p>
        </div>
        <CoverageBadge coveragePercent={hasGap ? 0 : 100} label={hasGap ? 'missing' : 'covered'} />
      </div>
      <div className="checklistItemMeta">
        <span>#{item.sortOrder}</span>
        <span>{item.completionRequired ? 'Required' : 'Optional'}</span>
        <span>{item.evidenceRequired ? 'Evidence required' : 'No evidence requirement'}</span>
      </div>
      <p className="previewText">{item.description ?? item.processStep?.description ?? item.gapSummary ?? 'Process-step-derived checklist item.'}</p>
      <div className="checklistItemLinks">
        {matchedKnowledge ? <span>Knowledge: {matchedKnowledge.title}</span> : <span>No required knowledge linked yet.</span>}
        {item.processStep && <span>Process step: {item.processStep.title}</span>}
      </div>
      {hasGap && onOpenKnowledgeBase && (
        <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
          <ArrowRight aria-hidden="true" size={16} />
          Review knowledge coverage
        </button>
      )}
    </OSCard>
  );
}

function ChecklistRunCard({ run }: { run: ChecklistRun }): JSX.Element {
  return (
    <OSCard className="checklistRunCard">
      <div className="checklistRunHeader">
        <div>
          <strong>{run.templateTitle ?? 'Checklist run'}</strong>
          <p>{run.businessDate ? `Business date ${formatDate(run.businessDate)}` : 'No business date recorded'}</p>
        </div>
        <StatusBadge status={run.status} />
      </div>
      <div className="checklistRunMeta">
        <span>{run.itemCount} items</span>
        <span>{run.completedCount} completed</span>
        <span>Started {formatDate(run.startedAt)}</span>
      </div>
    </OSCard>
  );
}

function ChecklistTemplateDetail({
  template,
  onOpenKnowledgeBase,
  onCreateRun,
  creatingTemplateId,
  todayRuns,
}: {
  template: ChecklistTemplate;
  onOpenKnowledgeBase?: () => void;
  onCreateRun: (templateId: string) => Promise<void>;
  creatingTemplateId: string | null;
  todayRuns: ChecklistRun[];
}): JSX.Element {
  const missingItems = template.items.filter((item) => item.coverageStatus === 'missing');
  const linkedKnowledgeItems = template.items
    .flatMap((item) => item.matchedKnowledge.map((knowledge) => ({ item, knowledge })))
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.knowledge.id === entry.knowledge.id) === index);
  const templateRunsToday = todayRuns.filter((run) => run.checklistTemplateId === template.id);

  return (
    <div className="detailStack checklistDetail">
      <section className="detailSection">
        <div className="checklistDetailHeader">
          <div>
            <h3>{template.title}</h3>
            <p>{template.description ?? 'Read-only checklist foundation built from live operational processes.'}</p>
          </div>
          <div className="detailHeaderActions">
            <CoverageBadge coveragePercent={template.coveragePercent} label={template.missingKnowledgeCount > 0 ? `${template.missingKnowledgeCount} gaps` : 'fully covered'} />
            <button
              className="iconTextButton"
              disabled={creatingTemplateId === template.id}
              onClick={() => void onCreateRun(template.id)}
              type="button"
            >
              {creatingTemplateId === template.id ? 'Creating run...' : 'Create today’s run'}
            </button>
          </div>
        </div>
        <div className="summaryGrid">
          <MetricCard label="Linked process" value={template.process?.name ?? 'None'} helper={template.process?.code ?? undefined} />
          <MetricCard label="Department" value={valueOrDefault(template.department?.title)} helper={template.department?.code ?? undefined} />
          <MetricCard label="Role" value={valueOrDefault(template.role?.title)} helper={template.role?.code ?? undefined} />
          <MetricCard label="Area" value={valueOrDefault(template.area?.title)} helper={template.area?.code ?? undefined} />
          <MetricCard label="Items" value={template.itemCount} helper={`${template.linkedKnowledgeCount} linked knowledge items`} />
          <MetricCard label="Runs" value={template.runCount} helper={`${template.openRunCount} open runs`} />
          <MetricCard label="Today" value={templateRunsToday.length} helper={templateRunsToday.length === 0 ? 'Execution not started' : 'Active today'} />
        </div>
      </section>

      {missingItems.length > 0 && (
        <KnowledgeGapCard
          title="Checklist coverage gaps"
          description="Some checklist items do not yet point at approved knowledge."
          coveragePercent={template.coveragePercent}
          detail="We are showing the gap instead of inventing a missing procedure."
          action={
            onOpenKnowledgeBase ? (
              <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
                <ArrowRight aria-hidden="true" size={16} />
                Open Knowledge Base
              </button>
            ) : undefined
          }
        />
      )}

      <LinkedKnowledgePanel
        title="Linked knowledge"
        items={linkedKnowledgeItems.map((entry) => ({
          id: `${entry.knowledge.id}:${entry.item.id}`,
          title: entry.knowledge.title,
          subtitle: entry.item.title,
          preview: entry.knowledge.preview,
          status: entry.knowledge.status,
          notes: entry.knowledge.manualTitle,
        }))}
        emptyLabel="No checklist items currently point at approved knowledge."
      />

      <section className="detailSection">
        <h4>Checklist items</h4>
        <div className="checklistItemList">
          {template.items.length > 0 ? (
            template.items.map((item) => <ChecklistItemCard key={item.id} item={item} onOpenKnowledgeBase={onOpenKnowledgeBase} />)
          ) : (
            <EmptyState icon={ClipboardList} title="No checklist items" description="Template items will appear once the linked process steps are seeded." />
          )}
        </div>
      </section>

      <section className="detailSection">
        <h4>Run summary</h4>
        {template.runs.length > 0 ? (
          <div className="checklistRunList">
            {template.runs.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((run) => (
              <ChecklistRunCard key={run.id} run={run} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Workflow} title="No runs yet" description="Checklist run history will appear once the catalog is executed in Supabase." />
        )}
      </section>

      <section className="detailSection">
        <h4>Today’s runs</h4>
        {templateRunsToday.length > 0 ? (
          <div className="checklistRunList">
            {templateRunsToday.map((run) => (
              <ChecklistRunCard key={run.id} run={run} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Workflow} title="No run created today" description="The template is ready, but no checklist run exists for today yet." />
        )}
      </section>
    </div>
  );
}

export function ChecklistsModule({ onOpenKnowledgeBase }: ChecklistsModuleProps = {}): JSX.Element {
  const [data, setData] = useState<ChecklistEngineData | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [runSummary, setRunSummary] = useState<ChecklistRun | null>(null);

  useEffect(() => {
    let isMounted = true;

    getChecklistEngineData()
      .then((nextData) => {
        if (!isMounted) return;
        setData(nextData);
        setSelectedTemplateId(nextData.templates[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (isMounted) setError(friendlyError(reason));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const reloadData = async (): Promise<void> => {
    const nextData = await getChecklistEngineData();
    setData(nextData);
    setSelectedTemplateId((current) => {
      if (current && nextData.templates.some((template) => template.id === current)) return current;
      return nextData.templates[0]?.id ?? null;
    });
  };

  const handleCreateRun = async (templateId: string): Promise<void> => {
    setCreatingTemplateId(templateId);
    setError(null);
    try {
      const result = await createChecklistRunFromTemplate(templateId, todayBusinessDate());
      setRunSummary(result.run);
      await reloadData();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const filteredTemplates = useMemo(() => (data?.templates ?? []).filter((template) => matches(template, query)), [data, query]);
  const groupedTemplates = useMemo(() => groupByDepartment(filteredTemplates), [filteredTemplates]);
  const selectedTemplate = useMemo(
    () => filteredTemplates.find((template) => template.id === selectedTemplateId) ?? filteredTemplates[0] ?? null,
    [filteredTemplates, selectedTemplateId],
  );
  const today = todayBusinessDate();
  const todayRuns = useMemo(() => (data?.runs ?? []).filter((run) => run.businessDate === today), [data?.runs, today]);

  useEffect(() => {
    if (!selectedTemplate || selectedTemplate.id === selectedTemplateId) return;
    setSelectedTemplateId(selectedTemplate.id);
  }, [selectedTemplate, selectedTemplateId]);

  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>Checklists</h2>
          <p>Read-only checklist foundation generated from live operational processes.</p>
        </div>
        <div className="resultsMeta">{data ? <span>{data.stats.totalTemplates} templates, {data.stats.totalItems} items</span> : <span>Loading live checklist data</span>}</div>
      </div>

      {error && (
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="toolbar checklistToolbar">
        <label className="searchField">
          <Search aria-hidden="true" size={16} />
          <input
            aria-label="Search checklist templates"
            placeholder="Search checklist templates and items"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
          />
        </label>
      </div>

      <div className="metricGrid checklistSummaryGrid">
        <MetricCard label="Templates" value={data?.stats.totalTemplates ?? '...'} helper="Starter templates from seeded processes" />
        <MetricCard label="Checklist items" value={data?.stats.totalItems ?? '...'} helper="Derived from live process steps" />
        <MetricCard label="Templates with gaps" value={data?.stats.templatesWithGaps ?? '...'} helper="Need knowledge coverage" />
        <MetricCard label="Missing coverage" value={data?.stats.itemsMissingCoverage ?? '...'} helper="Checklist items without approved knowledge" />
        <MetricCard label="Today's runs" value={todayRuns.length} helper={todayRuns.length === 0 ? 'Execution not started today' : 'Active today'} />
        <MetricCard label="Open runs" value={data?.stats.openRunCount ?? '...'} helper="Scheduled or in progress" />
      </div>

      {runSummary && (
        <OSCard className="notice success">
          <div className="noticeText">
            <strong>Checklist run ready</strong>
            <p>
              {runSummary.templateTitle ?? 'Checklist'} was created for {runSummary.businessDate ?? today} with {runSummary.itemCount} items.
            </p>
          </div>
          <div className="noticeMeta">
            <StatusBadge status={runSummary.status} />
            <span>{runSummary.createdAt ? `Created ${formatDate(runSummary.createdAt)}` : 'Created just now'}</span>
          </div>
        </OSCard>
      )}

      <div className="checklistLayout">
        <section className="listPanel checklistListPanel">
          {groupedTemplates.length > 0 ? (
            groupedTemplates.map((group) => (
              <section className="checklistGroup" key={group.department}>
                <div className="checklistGroupHeader">
                  <strong>{group.department}</strong>
                  <span>{group.templates.length} templates</span>
                </div>
                <div className="checklistTemplateList">
                  {group.templates.map((template) => (
                    <TemplateCard key={template.id} template={template} selected={template.id === selectedTemplate?.id} onSelect={setSelectedTemplateId} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <EmptyState icon={ClipboardList} title="No checklist templates" description="Once starter processes are seeded in Supabase, checklist templates will appear here." />
          )}
        </section>

        <section className="detailPanel checklistDetailPanel">
          {selectedTemplate ? (
            <ChecklistTemplateDetail
              template={selectedTemplate}
              onOpenKnowledgeBase={onOpenKnowledgeBase}
              onCreateRun={handleCreateRun}
              creatingTemplateId={creatingTemplateId}
              todayRuns={todayRuns}
            />
          ) : (
            <EmptyState icon={ShieldAlert} title="Select a checklist template" description="Choose a template to inspect its steps, linked knowledge, and coverage gaps." />
          )}
        </section>
      </div>
    </section>
  );
}
