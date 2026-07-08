import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, RotateCcw, Search, Sparkles, Utensils, ClipboardList, FileText, Workflow } from 'lucide-react';
import Badge from '../components/Badge';
import { getKnowledgeEngineData, knowledgeOriginLabel, previewText, type KnowledgeEngineData, type KnowledgeObject } from '../lib/knowledge';

interface DashboardProps {
  onOpenKnowledgeBase?: () => void;
  onSearchKnowledge?: (query: string) => void;
  onCreateSOP?: () => void;
  onContinueLastDraft?: (id: string) => void;
}

function sortByUpdated(a: KnowledgeObject, b: KnowledgeObject): number {
  return b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title);
}

export default function Dashboard({
  onOpenKnowledgeBase,
  onSearchKnowledge,
  onCreateSOP,
  onContinueLastDraft,
}: DashboardProps): JSX.Element {
  const [knowledge, setKnowledge] = useState<KnowledgeEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  const loadKnowledge = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getKnowledgeEngineData();
      setKnowledge(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Dashboard could not reach the live knowledge base.');
    } finally {
      setIsLoading(false);
      setIsSlowLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setIsSlowLoading(true);
    }, 2500);

    void loadKnowledge();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadKnowledge]);

  const approvedSOPs = useMemo(
    () => (knowledge ? knowledge.objects.filter((object) => object.status === 'active' && object.approvedVersion.status === 'approved').sort(sortByUpdated) : []),
    [knowledge],
  );

  const drafts = useMemo(
    () =>
      knowledge
        ? knowledge.objects.filter((object) => object.sourceType === 'user_created' || object.status !== 'active' || object.approvedVersion.status !== 'approved').sort(sortByUpdated)
        : [],
    [knowledge],
  );

  const lastDraft = drafts[0] ?? null;

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed && onSearchKnowledge) {
      onSearchKnowledge(trimmed);
      return;
    }
    onOpenKnowledgeBase?.();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-soft">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Delikat Studio
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Search SOPs, recipes, procedures…</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Everything here comes from the live Supabase knowledge base. Browse the imported library, continue a draft, or create something new.
              </p>
            </div>

            <form className="space-y-3" onSubmit={handleSearch}>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 ring-1 ring-transparent transition focus-within:border-amber-300/60 focus-within:bg-white/15 focus-within:ring-amber-300/20">
                <Search className="shrink-0 text-slate-300" size={18} />
                <input
                  aria-label="Search SOPs, recipes, procedures"
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search SOPs, recipes, procedures…"
                  value={searchQuery}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300" type="submit">
                  <Search size={15} />
                  Search SOPs
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10" onClick={onCreateSOP} type="button">
                  <Plus size={15} />
                  New SOP
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10" onClick={() => lastDraft && onContinueLastDraft?.(lastDraft.id)} type="button" disabled={!lastDraft}>
                  <Workflow size={15} />
                  Continue last draft
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Live library</p>
              <p className="mt-2 text-3xl font-semibold">{knowledge ? knowledge.objects.length : '—'}</p>
              <p className="mt-1 text-sm text-slate-300">Approved SOP and knowledge records</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Drafts</p>
              <p className="mt-2 text-3xl font-semibold">{knowledge ? drafts.length : '—'}</p>
              <p className="mt-1 text-sm text-slate-300">User-created or in-progress SOPs</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100" onClick={loadKnowledge} type="button">
            <RotateCcw size={14} />
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="SOPs" value={String(knowledge ? knowledge.objects.length : 0)} helper="Live imported records in Supabase." icon={ClipboardList} />
            <MetricCard label="Drafts" value={String(knowledge ? drafts.length : 0)} helper="Draft or user-created SOPs." icon={FileText} />
            <MetricCard label="Manuals" value={String(knowledge ? knowledge.manuals.length : 0)} helper="Imported source manuals." icon={BookOpen} />
          </div>

          <Panel title="Recent SOPs" description="Recently updated approved SOPs from the live library." action={onOpenKnowledgeBase ? <button className="text-sm font-medium text-amber-600 hover:text-amber-700" onClick={onOpenKnowledgeBase} type="button">Open Knowledge Base</button> : null}>
            {error && !knowledge ? (
              <EmptyState title="Recent SOPs unavailable" description={error} action={<button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={loadKnowledge} type="button"><RotateCcw size={14} /> Retry</button>} />
            ) : isLoading && !knowledge ? (
              <EmptyState title={isSlowLoading ? 'Still loading recent SOPs' : 'Loading recent SOPs'} description={isSlowLoading ? 'Supabase is taking a moment to respond.' : 'We’re pulling live SOPs from Supabase.'} />
            ) : approvedSOPs.length > 0 ? (
              <div className="grid gap-3">
                {approvedSOPs.slice(0, 4).map((object) => (
                  <KnowledgeCard
                    key={object.id}
                    object={object}
                    action={<button className="text-sm font-medium text-amber-600 hover:text-amber-700" onClick={onOpenKnowledgeBase} type="button">Open</button>}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="No recent SOPs yet" description="Approved SOPs will appear here once the live library loads." />
            )}
          </Panel>

          <Panel title="Recent drafts" description="Drafts and user-created SOPs that need attention.">
            {error && !knowledge ? (
              <EmptyState title="Recent drafts unavailable" description={error} action={<button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={loadKnowledge} type="button"><RotateCcw size={14} /> Retry</button>} />
            ) : isLoading && !knowledge ? (
              <EmptyState title={isSlowLoading ? 'Still loading recent drafts' : 'Loading recent drafts'} description={isSlowLoading ? 'The live knowledge base is still coming in.' : 'We’re checking for draft SOPs in Supabase.'} />
            ) : drafts.length > 0 ? (
              <div className="grid gap-3">
                {drafts.slice(0, 4).map((object) => (
                  <KnowledgeCard
                    key={object.id}
                    object={object}
                    action={<button className="text-sm font-medium text-amber-600 hover:text-amber-700" onClick={() => onContinueLastDraft?.(object.id)} type="button">Continue</button>}
                    draft
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="No drafts yet" description="Create or edit an SOP to start a draft." />
            )}
          </Panel>
        </div>

        <div className="grid gap-4">
          <Panel title="Quick actions" description="Open the workspace or create a draft immediately.">
            <div className="grid gap-2">
              <ActionButton onClick={onOpenKnowledgeBase} icon={BookOpen} label="Open Knowledge Base" />
              <ActionButton onClick={onCreateSOP} icon={Plus} label="New SOP" />
              <ActionButton onClick={() => lastDraft && onContinueLastDraft?.(lastDraft.id)} icon={Workflow} label="Continue last draft" disabled={!lastDraft} />
            </div>
          </Panel>

          <Panel title="Import status" description="Source manuals and records are loaded from Supabase.">
            <div className="grid gap-3">
              <MiniStat label="Records loaded" value={String(knowledge ? knowledge.objects.length : 0)} />
              <MiniStat label="Manuals loaded" value={String(knowledge ? knowledge.manuals.length : 0)} />
              <MiniStat label="Evidence links" value={String(knowledge ? knowledge.objects.reduce((count, object) => count + object.evidence.length, 0) : 0)} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
          <Icon size={16} />
        </div>
        <Sparkles size={13} className="text-slate-300" />
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  onClick?: () => void;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
      type="button"
      disabled={disabled}
    >
      <span className="rounded-xl bg-slate-100 p-2 text-slate-700">
        <Icon size={15} />
      </span>
      {label}
    </button>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function KnowledgeCard({
  object,
  action,
  draft = false,
}: {
  object: KnowledgeObject;
  action?: React.ReactNode;
  draft?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-900">{object.title}</h4>
            <Badge label={knowledgeOriginLabel(object)} />
            {draft ? <Badge color="#F59E0B" label="Draft" /> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{object.summary ?? previewText(object.approvedVersion.body, 120)}</p>
        </div>
        {action}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-white px-2.5 py-1">{object.manualCode ?? object.manualTitle}</span>
        <span className="rounded-full bg-white px-2.5 py-1">{object.sourceSectionHeading}</span>
      </div>
    </article>
  );
}
