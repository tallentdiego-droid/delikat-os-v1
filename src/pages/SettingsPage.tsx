import { Settings2 } from 'lucide-react';
import { EmptyState, OSCard } from '../components/os';

export function SettingsPage(): JSX.Element {
  return (
    <section className="pageStack settingsPage">
      <div className="sectionHeader">
        <div>
          <h2>Settings</h2>
          <p>Simple workspace preferences and product housekeeping live here later.</p>
        </div>
      </div>

      <div className="settingsGrid">
        <OSCard className="settingsCard">
          <div className="hubCardHeader">
            <Settings2 aria-hidden="true" size={18} />
            <strong>Workspace settings</strong>
          </div>
          <p>We’re keeping this area quiet for now so the core workspace stays focused.</p>
        </OSCard>

        <EmptyState
          icon={Settings2}
          title="Nothing to configure yet"
          description="Once the studio is stable, we can add preference controls here without clutter."
        />
      </div>
    </section>
  );
}
