import { Brain, ShieldCheck } from 'lucide-react';

export function CommandCenterPage(): JSX.Element {
  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>AI Command Center</h2>
          <p>Placeholder for future assisted workflows.</p>
        </div>
      </div>

      <div className="placeholderPanel">
        <Brain aria-hidden="true" size={30} />
        <h3>Retrieval foundation is ready</h3>
        <p>
          The app now has a live Supabase Knowledge Base. AI actions remain disabled until the retrieval and approval
          model is ready for agent use.
        </p>
        <div className="statusStrip">
          <ShieldCheck aria-hidden="true" size={18} />
          <span>No OpenAI calls, embeddings, generated SOPs, or markdown-file reads are active.</span>
        </div>
      </div>
    </section>
  );
}
