/** BoardSection — the Value Board's section frame: the same premium
 *  gradient-rim + solid-panel boxing used on the homepage cards. */
const RIMS = {
  gold: 'linear-gradient(130deg,#f5c542 0%,#7c3aed 38%,#22d3ee 66%,#f5c542 100%)',
  violet: 'linear-gradient(130deg,#7c3aed 0%,#22d3ee 52%,#f5c542 100%)',
  cyan: 'linear-gradient(130deg,#22d3ee 0%,#7c3aed 52%,#f5c542 100%)',
  emerald: 'linear-gradient(130deg,#34d399 0%,#7c3aed 55%,#f5c542 100%)',
} as const;

export function BoardSection({ tone = 'gold', id, children }: {
  tone?: keyof typeof RIMS;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="relative rounded-[1.6rem] p-[1.5px] shadow-[0_30px_70px_-32px_rgba(0,0,0,0.95)]"
      style={{ background: RIMS[tone] }}
    >
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#130321]">
        <div aria-hidden className="pointer-events-none absolute inset-x-[12%] top-0 z-[5] h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        {children}
      </div>
    </section>
  );
}
