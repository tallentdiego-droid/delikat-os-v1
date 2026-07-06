import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, ClipboardList, Search, ShieldAlert, ShieldCheck, Star } from 'lucide-react';
import {
  createAuditRunFromTemplate,
  getAuditEngineData,
  type AuditEngineData,
  type AuditRun,
  type AuditTemplate,
  type AuditTemplateItem,
} from '../../lib/audits';
import { EmptyState, KnowledgeGapCard, LinkedKnowledgePanel, MetricCard, OSCard, StatusBadge, CoverageBadge } from '../os';

interface AuditsModuleProps {
  onOpenKnowledgeBase?: () => void;
}

function friendlyError(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message;
  return 'Audits could not reach the live Supabase data. Ask an administrator to check the connection and read policies.';
}

function formatDate(value: string | null): string {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function todayBusinessDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function auditTypeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function checklistTemplateTitle(template: AuditTemplate): string {
  return template.checklistTemplate?.title ?? 'Linked checklist';
}

function searchText(template: AuditTemplate): string {
  return [
    template.title,
    template.description ?? '',
    template.auditType,
    template.code,
    template.checklistTemplate?.title ?? '',
    template.checklistTemplate?.description ?? '',
    template.checklistTemplate?.process?.name ?? '',
    template.checklistTemplate?.department?.title ?? '',
    template.checklistTemplate?.role?.title ?? '',
    template.checklistTemplate?.area?.title ?? '',
    ...template.items.flatMap((item) => [
      item.title,
      item.description ?? '',
      item.scoringType,
      item.requiredKnowledgeItem?.title ?? '',
      item.checklistTemplateItem?.processStep?.title ?? '',
      item.gapSummary ?? '',
    ]),
  ]
    .join(' ')
    .toLowerCase();
}

function matches(template: AuditTemplate, query: string): boolean {
  return query.trim().length === 0 || searchText(template).includes(query.trim().toLowerCase());
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: AuditTemplate;
  selected: boolean;
  onSelect: (id: string) => void;
}): JSX.Element {
  return (
    <OSCard className={selected ? 'auditTemplateCard active' : 'auditTemplateCard'}>
      <button className="auditTemplateButton" onClick={() => onSelect(template.id)} type="button">
        <div className="auditTemplateHeader">
          <div>
            <strong>{template.title}</strong>
            <p>{template.description ?? 'Audit scaffold derived from live checklist templates and process steps.'}</p>
          </div>
          <CoverageBadge coveragePercent={template.coveragePercent} label={template.missingKnowledgeCount > 0 ? `${template.missingKnowledgeCount} gaps` : 'fully covered'} />
        </div>
        <div className="auditTemplateMeta">
          <span>{auditTypeLabel(template.auditType)}</span>
          <span>{checklistTemplateTitle(template)}</span>
          <span>{template.itemCount} items</span>
          <span>{template.runCount} runs</span>
        </div>
        <div className="auditTemplateFooter">
          <StatusBadge status={template.status} />
          <span>{template.openRunCount} open</span>
          <span>Latest {formatDate(template.latestRunAt)}</span>
        </div>
      </button>
    </OSCard>
  );
}

function AuditItemCard({ item, onOpenKnowledgeBase }: { item: AuditTemplateItem; onOpenKnowledgeBase?: () => void }): JSX.Element {
  const hasGap = item.coverageStatus === 'missing';
  const sourceStep = item.checklistTemplateItem?.processStep?.title ?? 'Derived from a process step';

  return (
    <OSCard className={hasGap ? 'auditItemCard gap' : 'auditItemCard'}>
      <div className="auditItemHeader">
        <div>
          <strong>{item.title}</strong>
          <p>{item.description ?? sourceStep}</p>
        </div>
        <CoverageBadge coveragePercent={hasGap ? 0 : 100} label={hasGap ? 'missing' : 'covered'} />
      </div>
      <div className="auditItemMeta">
        <span>#{item.sortOrder}</span>
        <span>{item.scoringType.replace(/[_-]+/g, ' ')}</span>
        <span>{item.maxScore ?? 1} max</span>
        <span>{item.weight ?? 1} weight</span>
        <span>{item.evidenceRequired ? 'Evidence required' : 'No evidence requirement'}</span>
        <span>{item.requiredKnowledgeItem ? item.requiredKnowledgeItem.title : 'No knowledge link'}</span>
      </div>
      <p className="previewText">
        {item.gapSummary ?? item.checklistTemplateItem?.gapSummary ?? item.checklistTemplateItem?.description ?? 'Audit item derived from the live checklist foundation.'}
      </p>
      <div className="auditItemLinks">
        {item.checklistTemplateItem && <span>Checklist item: {item.checklistTemplateItem.title}</span>}
        {item.checklistTemplateItem?.processStep && <span>Process step: {item.checklistTemplateItem.processStep.title}</span>}
        {item.matchedKnowledge[0] ? <span>Knowledge: {item.matchedKnowledge[0].title}</span> : <span>No approved knowledge linked yet.</span>}
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

function AuditRunCard({ run }: { run: AuditRun }): JSX.Element {
  return (
    <OSCard className="auditRunCard">
      <div className="auditRunHeader">
        <div>
          <strong>{run.templateTitle ?? 'Audit run'}</strong>
          <p>{run.businessDate ? `Business date ${formatDate(run.businessDate)}` : 'No business date recorded'}</p>
        </div>
        <StatusBadge status={run.status} />
      </div>
      <div className="auditRunMeta">
        <span>{run.itemCount} items</span>
        <span>{run.completedCount} completed</span>
        <span>{run.totalScore ?? 'No score yet'}</span>
        <span>Started {formatDate(run.startedAt)}</span>
      </div>
    </OSCard>
  );
}

function AuditTemplateDetail({
  template,
  onOpenKnowledgeBase,
  onCreateRun,
  creatingTemplateId,
  todayRuns,
}: {
  template: AuditTemplate;
  onOpenKnowledgeBase?: () => void;
  onCreateRun: (templateId: string) => Promise<void>;
  creatingTemplateId: string | null;
  todayRuns: AuditRun[];
}): JSX.Element {
  const missingItems = template.items.filter((item) => item.coverageStatus === 'missing');
  const linkedKnowledgeItems = template.items
    .flatMap((item) => item.matchedKnowledge.map((knowledge) => ({ item, knowledge })))
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.knowledge.id === entry.knowledge.id) === index);
  const templateRunsToday = todayRuns.filter((run) => run.auditTemplateId === template.id);

  return (
    <div className="detailStack auditDetail">
      <section className="detailSection">
        <div className="auditDetailHeader">
          <div>
            <h3>{template.title}</h3>
            <p>{template.description ?? 'Read-only audit foundation built from live checklist templates and process steps.'}</p>
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
          <MetricCard label="Linked checklist" value={template.checklistTemplate?.title ?? 'None'} helper={template.checklistTemplate?.code ?? undefined} />
          <MetricCard label="Linked process" value={template.checklistTemplate?.process?.name ?? 'None'} helper={template.checklistTemplate?.process?.code ?? undefined} />
          <MetricCard label="Department" value={template.checklistTemplate?.department?.title ?? 'Unassigned'} helper={template.checklistTemplate?.department?.code ?? undefined} />
          <MetricCard label="Role" value={template.checklistTemplate?.role?.title ?? 'Unassigned'} helper={template.checklistTemplate?.role?.code ?? undefined} />
          <MetricCard label="Area" value={template.checklistTemplate?.area?.title ?? 'Unassigned'} helper={template.checklistTemplate?.area?.code ?? undefined} />
          <MetricCard label="Items" value={template.itemCount} helper={`${template.linkedKnowledgeCount} linked knowledge items`} />
          <MetricCard label="Today" value={templateRunsToday.length} helper={templateRunsToday.length === 0 ? 'Execution not started' : 'Active today'} />
        </div>
      </section>

      {missingItems.length > 0 && (
        <KnowledgeGapCard
          title="Audit coverage gaps"
          description="Some audit items still point at missing approved knowledge."
          coveragePercent={template.coveragePercent}
          detail="The audit engine shows the gap instead of inventing a missing control."
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
        emptyLabel="No audit items currently point at approved knowledge."
      />

      <section className="detailSection">
        <h4>Audit items</h4>
        <div className="auditItemList">
          {template.items.length > 0 ? (
            template.items.map((item) => <AuditItemCard key={item.id} item={item} onOpenKnowledgeBase={onOpenKnowledgeBase} />)
          ) : (
            <EmptyState icon={ShieldAlert} title="No audit items" description="Template items will appear once the linked checklist foundation is available." />
          )}
        </div>
      </section>

      <section className="detailSection">
        <div className="detailSectionHeader">
          <h4>Audit runs</h4>
          <span>{template.runCount} total</span>
        </div>
        {template.runs.length > 0 ? (
          <div className="auditRunList">
            {template.runs.map((run) => (
              <AuditRunCard key={run.id} run={run} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No audit runs yet"
            description="There are no live audit executions yet. The structure is ready, but Delikat has not created any run records."
          />
        )}
      </section>

      <section className="detailSection">
        <h4>Today’s runs</h4>
        {templateRunsToday.length > 0 ? (
          <div className="auditRunList">
            {templateRunsToday.map((run) => (
              <AuditRunCard key={run.id} run={run} />
            ))}
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="No run created today" description="The template is ready, but no audit run exists for today yet." />
        )}
      </section>
    </div>
  );
}

export function AuditsModule({ onOpenKnowledgeBase }: AuditsModuleProps = {}): JSX.Element {
  const [data, setData] = useState<AuditEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [runSummary, setRunSummary] = useState<AuditRun | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAuditEngineData()
      .then((nextData) => {
        if (isMounted) setData(nextData);
      })
      .catch((reason: unknown) => {
        if (isMounted) setError(friendlyError(reason));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const reloadData = async (): Promise<void> => {
    const nextData = await getAuditEngineData();
    setData(nextData);
    setSelectedAuditId((current) => {
      if (current && nextData.templates.some((template) => template.id === current)) return current;
      return nextData.templates[0]?.id ?? null;
    });
  };

  const handleCreateRun = async (templateId: string): Promise<void> => {
    setCreatingTemplateId(templateId);
    setError(null);
    try {
      const result = await createAuditRunFromTemplate(templateId, todayBusinessDate());
      setRunSummary(result.run);
      await reloadData();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const filteredTemplates = useMemo(() => {
    const templates = data?.templates ?? [];
    return templates.filter((template) => matches(template, query)).sort((a, b) => a.title.localeCompare(b.title));
  }, [data, query]);

  const selectedTemplate = useMemo(() => {
    if (selectedAuditId) {
      return filteredTemplates.find((template) => template.id === selectedAuditId) ?? null;
    }
    return filteredTemplates[0] ?? null;
  }, [filteredTemplates, selectedAuditId]);
  const today = todayBusinessDate();
  const todayRuns = useMemo(() => (data?.runs ?? []).filter((run) => run.businessDate === today), [data?.runs, today]);

  useEffect(() => {
    if (!selectedTemplate) {
      setSelectedAuditId(null);
      return;
    }
    if (selectedAuditId !== selectedTemplate.id) {
      setSelectedAuditId(selectedTemplate.id);
    }
  }, [selectedTemplate, selectedAuditId]);

  const templatesWithGaps = data?.stats.templatesWithGaps ?? 0;
  const runsTotal = data?.stats.runCount ?? 0;
  const noRunsYet = runsTotal === 0;

  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>Audits</h2>
          <p>Audit scaffolds derived from live checklist templates, process steps, and approved knowledge.</p>
        </div>
        <div className="toolbar">
          <div className="searchInput">
            <Search aria-hidden="true" size={16} />
            <input
              aria-label="Filter audits"
              placeholder="Search audit templates"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="metricGrid auditSummaryGrid">
        <MetricCard label="Audit templates" value={data?.stats.totalTemplates ?? '...'} helper="Structural audit scaffolds" />
        <MetricCard label="Audit items" value={data?.stats.totalItems ?? '...'} helper={`${templatesWithGaps} templates with gaps`} />
        <MetricCard label="Open runs" value={data?.stats.openRunCount ?? '...'} helper={noRunsYet ? 'No audit runs yet' : 'Live audit execution records'} />
        <MetricCard label="Completed runs" value={data?.stats.completedRunCount ?? '...'} helper="Closed audit records" />
        <MetricCard label="Today’s runs" value={todayRuns.length} helper={todayRuns.length === 0 ? 'Execution not started today' : 'Active today'} />
      </div>

      {runSummary && (
        <OSCard className="notice success">
          <div className="noticeText">
            <strong>Audit run ready</strong>
            <p>
              {runSummary.templateTitle ?? 'Audit'} was created for {runSummary.businessDate} with {runSummary.itemCount} items.
            </p>
          </div>
          <div className="noticeMeta">
            <StatusBadge status={runSummary.status} />
            <span>{runSummary.createdAt ? `Created ${formatDate(runSummary.createdAt)}` : 'Created just now'}</span>
          </div>
        </OSCard>
      )}

      {data && filteredTemplates.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No matching audit templates"
          description="The current filter does not match any audit scaffolds. Try a different search term."
        />
      ) : null}

      <div className="auditLayout">
        <section className="auditListPanel">
          <div className="detailSectionHeader">
            <h4>Audit templates</h4>
            <span>{filteredTemplates.length} shown</span>
          </div>
          <div className="auditTemplateList">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} selected={template.id === selectedTemplate?.id} onSelect={setSelectedAuditId} />
            ))}
          </div>
        </section>

        <section className="auditDetailPanel">
          {selectedTemplate ? (
            <AuditTemplateDetail
              template={selectedTemplate}
              onOpenKnowledgeBase={onOpenKnowledgeBase}
              onCreateRun={handleCreateRun}
              creatingTemplateId={creatingTemplateId}
              todayRuns={todayRuns}
            />
          ) : (
            <EmptyState
              icon={Star}
              title="Select an audit template"
              description="Choose a template on the left to inspect its linked checklist, process steps, evidence requirements, and knowledge coverage."
            />
          )}
        </section>
      </div>
    </section>
  );
}
