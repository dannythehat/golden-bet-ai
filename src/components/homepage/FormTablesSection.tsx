import { ArtworkCard } from './ArtworkCard';
import { MobileSectionCard } from './MobileSectionCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function FormTablesSection() {
  return (
    <>
      <div className="md:hidden">
        <MobileSectionCard
          eyebrow="Form Tables"
          title="See who's hot, who's not"
          body="Live-weighted form tables for the Premier League, Championship, La Liga and more — updated every matchweek."
          image={HOMEPAGE_APPROVED_ASSETS.formTables}
          imageAlt="Footy Oracle form tables"
          imagePosition="object-[center_30%]"
          tone="emerald"
          ctas={[{ label: 'Open Form Tables', to: '/form-tables' }]}
        />
      </div>
      <div className="hidden md:block">
        <ArtworkCard
          id="form-tables"
          to="/form-tables"
          src={HOMEPAGE_APPROVED_ASSETS.formTables}
          alt="Footy Oracle form tables"
          label="Open form tables"
        />
      </div>
    </>
  );
}
