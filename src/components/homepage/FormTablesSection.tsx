import { HOMEPAGE_APPROVED_ASSETS } from './assets';

/** Approved form tables artwork — clickable as a single panel. */
export function FormTablesSection() {
  return (
    <a
      id="form-tables"
      href="/form-tables"
      className="group block overflow-hidden rounded-[1.35rem] border border-emerald-400/40 bg-[#06140d] shadow-[0_0_65px_-24px_rgba(101,255,84,0.45)] md:rounded-[1.65rem]"
    >
      <img
        src={HOMEPAGE_APPROVED_ASSETS.formTables}
        alt="Footy Oracle form tables panel"
        className="block w-full transition-transform duration-300 group-hover:scale-[1.01]"
        loading="lazy"
        width={1536}
        height={1024}
      />
    </a>
  );
}
