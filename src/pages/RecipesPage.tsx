import { Download, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { EmptyState, OSCard } from '../components/os';

const templateLinks = [
  {
    title: 'Recipe import template',
    href: '/templates/recipe_import_template.csv',
    description: 'Use this CSV to map recipes before imports are wired to live records.',
  },
  {
    title: 'SOP import template',
    href: '/templates/sop_import_template.csv',
    description: 'Use this CSV to plan SOP imports in the same format.',
  },
];

export function RecipesPage(): JSX.Element {
  return (
    <section className="pageStack recipePage">
      <div className="sectionHeader">
        <div>
          <h2>Recipes</h2>
          <p>Recipe import is coming next. For now, we keep the workspace clean and ready.</p>
        </div>
      </div>

      <div className="recipePageGrid">
        <OSCard className="recipeHeroCard">
          <div className="homeHeroHeader">
            <div>
              <span className="eyebrow">Recipes</span>
              <h3>Plan recipe imports without touching live records</h3>
              <p>Download a template, map your fields, and bring recipes in carefully later.</p>
            </div>
          </div>

          <div className="homeHeroActions">
            <button className="iconTextButton primary" type="button" disabled>
              <Download aria-hidden="true" size={16} />
              Upload coming next
            </button>
            <button className="iconTextButton secondary" onClick={() => window.location.reload()} type="button">
              <RotateCcw aria-hidden="true" size={16} />
              Refresh
            </button>
          </div>
        </OSCard>

        <div className="recipeTemplateGrid">
          {templateLinks.map((item) => (
            <OSCard className="recipeTemplateCard" key={item.title}>
              <div className="hubCardHeader">
                <FileSpreadsheet aria-hidden="true" size={18} />
                <strong>{item.title}</strong>
              </div>
              <p>{item.description}</p>
              <a className="iconTextButton" href={item.href} download>
                <Download aria-hidden="true" size={16} />
                Download template
              </a>
            </OSCard>
          ))}
        </div>

        <EmptyState
          icon={FileSpreadsheet}
          title="Recipe import is not live yet"
          description="We’re keeping recipes as a clean placeholder until the import flow is ready."
        />
      </div>
    </section>
  );
}
