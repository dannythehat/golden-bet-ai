import { Link } from 'react-router-dom';
import { Gift, Plane, ChevronRight, Sparkles } from 'lucide-react';
import { useFantasyPrizes } from '@/hooks/useFantasyLeague';
import type { FantasyPrize } from '@/types/footy';

const GAFFER = '/images/gaffer/gaffer-celebrating.png';

const CATEGORY_LABEL: Record<FantasyPrize['category'], string> = {
  seasonal: 'Season', weekly: 'Weekly', themed: 'Special', random: 'Wooden Spoon',
};

function PrizeTile({ p }: { p: FantasyPrize }) {
  const fun = p.category === 'random';
  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-[#0b0518]/70 transition-all hover:-translate-y-1 ${fun ? 'border-amber-400/30 hover:border-amber-400/60 hover:shadow-[0_0_34px_-10px_rgba(245,197,66,0.7)]' : 'border-violet-400/25 hover:border-violet-400/55 hover:shadow-[0_0_34px_-10px_rgba(139,92,246,0.7)]'}`}>
      <div className="relative h-28 overflow-hidden bg-[#160a24]">
        {p.image_url && <img src={p.image_url} alt={p.title} loading="lazy" draggable={false} className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${fun ? 'group-hover:-rotate-1' : ''}`} />}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0b0518] via-transparent to-transparent" />
        <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white/80 backdrop-blur">{CATEGORY_LABEL[p.category]}</span>
      </div>
      <div className="p-3.5">
        <div className="text-[13px] font-black uppercase tracking-wide text-white">{p.title}</div>
        <p className="mt-1 text-[12px] leading-snug text-white/55">{p.description}</p>
      </div>
    </div>
  );
}

/**
 * FantasyPrizes — "Prizes & Glory" from the prizes contract. The seasonal
 * headline gets the hero; the rest tile out. Photos are decorative; titles and
 * descriptions are live HTML.
 */
export function FantasyPrizes() {
  const { data, isLoading } = useFantasyPrizes();
  if (isLoading && !data) return <div className="h-[460px] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.03]" />;

  const prizes = data?.prizes ?? [];
  const grand = prizes.find((p) => p.category === 'seasonal') ?? prizes[0];
  const tiles = prizes.filter((p) => p.id !== grand?.id).slice(0, 4);

  return (
    <section id="prizes" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] shadow-[0_0_60px_-24px_rgba(124,58,237,0.7)] md:rounded-[2rem]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(124,58,237,0.28),transparent_45%),radial-gradient(circle_at_90%_110%,rgba(245,197,66,0.12),transparent_45%)]" />
      <img src={GAFFER} alt="" aria-hidden loading="lazy" draggable={false} className="pointer-events-none absolute -right-6 top-6 z-0 hidden h-[280px] w-auto select-none object-contain opacity-90 xl:block" />

      <div className="relative z-[1] p-5 md:p-7">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]"><Sparkles className="h-3.5 w-3.5" /> Prizes &amp; Glory</span>
          <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white md:text-5xl"><span className="text-[#f5c542]">Win big.</span> Laugh harder.</h2>
          <p className="mt-2 text-sm text-white/60">Real cash, real getaways, and the odd pair of donkey ears.</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          {grand && (
            <div className="group relative overflow-hidden rounded-2xl border border-[#f5c542]/35 bg-[#160a24] shadow-[0_0_44px_-16px_rgba(245,197,66,0.8)]">
              {grand.image_url && <img src={grand.image_url} alt={grand.title} loading="lazy" draggable={false} className="h-full min-h-[240px] w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#05020b] via-[#05020b]/40 to-transparent" />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/50 bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#f8e7a1] backdrop-blur"><Plane className="h-3.5 w-3.5" /> Grand Prize</span>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="font-display text-4xl uppercase leading-none text-white md:text-5xl">{grand.title}</div>
                <p className="mt-1.5 max-w-sm text-sm text-white/70">{grand.description}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {tiles.map((p) => <PrizeTile key={p.id} p={p} />)}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b0518]/60 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5c542]"><Gift className="h-5 w-5" /></span>
            <div className="leading-tight">
              <div className="text-[13px] font-black uppercase tracking-wide text-white">All prizes included with membership</div>
              <div className="text-[12px] text-white/55">One league. Weekly rewards. Season-long glory.</div>
            </div>
          </div>
          <Link to="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-[#16051f] transition-transform hover:-translate-y-0.5">Play Fantasy Now <ChevronRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}
