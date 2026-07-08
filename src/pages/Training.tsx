import { BookOpenCheck, GraduationCap, Search } from 'lucide-react';

interface TrainingProps {
  onOpenKnowledgeBase?: () => void;
}

export default function Training({ onOpenKnowledgeBase }: TrainingProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Training</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Training is waiting on SOP coverage</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Training paths will be built from the real SOP library after Studio is fully ready. For now, review the knowledge base and keep the imported source visible.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800" onClick={onOpenKnowledgeBase} type="button">
            <Search size={15} />
            Open Knowledge Base
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          icon={GraduationCap}
          title="Role-based paths later"
          description="Training paths will be assembled from existing roles, processes, and approved SOPs once the content editor is stable."
        />
        <InfoCard
          icon={BookOpenCheck}
          title="Coverage-aware"
          description="We’ll only create training around real SOP coverage so the output stays trustworthy."
        />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
        <Icon size={18} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}
