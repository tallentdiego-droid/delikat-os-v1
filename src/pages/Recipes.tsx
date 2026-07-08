import { Download, FileSpreadsheet, Sparkles } from 'lucide-react';

export default function Recipes() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Recipes</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Recipe import is coming next</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Recipes will be imported from spreadsheet and CSV templates in the next sprint. For now, this workspace stays clean and ready for structure.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800" type="button">
            <Download size={15} />
            Download template
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50" type="button">
            <FileSpreadsheet size={15} />
            Import Center
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InfoCard
          icon={Sparkles}
          title="Draft-first"
          description="Imported recipes will land as drafts so the team can review and polish them before publishing."
        />
        <InfoCard
          icon={FileSpreadsheet}
          title="Spreadsheet-ready"
          description="The import flow will accept CSV and Excel structures using a simple, human-editable template."
        />
        <InfoCard
          icon={Download}
          title="Template link"
          description="The recipe template file is available in public/templates for manual downloads."
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
