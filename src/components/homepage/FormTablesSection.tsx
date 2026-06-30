import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function FormTablesSection() {
  return (
    <ArtworkCard
      id="form-tables"
      to="/form-tables"
      src={HOMEPAGE_APPROVED_ASSETS.formTables}
      alt="Footy Oracle form tables"
      label="Open form tables"
    />
  );
}
