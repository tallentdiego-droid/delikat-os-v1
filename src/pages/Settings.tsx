import { Settings2, ShieldCheck, Sparkles } from 'lucide-react';

export default function Settings() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Settings</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Configuration stays out of the way</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Technical settings will come back later if we need them. For now, the workspace stays focused on SOPs, drafts, and source evidence.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={Sparkles} title="Studio first" description="The homepage and Studio are the primary product surfaces." />
        <InfoCard icon={ShieldCheck} title="Data safety" description="Imported evidence and version history remain preserved behind the scenes." />
        <InfoCard icon={Settings2} title="Minimal surface area" description="We’re keeping the shell clean so the app stays usable and easy to understand." />
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
