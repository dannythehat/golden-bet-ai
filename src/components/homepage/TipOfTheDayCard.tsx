import { HOMEPAGE_APPROVED_ASSETS } from './assets';
import { useTipOfTheDay } from './useHomepageData';

function formatTipTime(value?: string | null) {
  if (!value) return 'Updated daily';
  return `Updated ${new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatOdds(odds: number | string) {
  return typeof odds === 'number' ? odds.toFixed(2) : odds;
}

/** Tip of the day — approved artwork with live pick data overlaid in-place. */
export function TipOfTheDayCard() {
  const { data: tip } = useTipOfTheDay();

  return (
    <section
      id="tip-of-the-day"
      className="relative overflow-hidden rounded-[1.15rem] border border-sky-400/45 bg-[#04111f] shadow-[0_0_70px_-20px_rgba(56,189,248,0.55)] md:rounded-[1.45rem]"
    >
      <img
        src={HOMEPAGE_APPROVED_ASSETS.tipOfDay}
        alt="Tip of the day panel"
        className="block w-full"
        loading="lazy"
        width={1752}
        height={968}
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[6.6%] top-[7.3%] rounded-[0.8rem] bg-[#07111d]/82 px-[1.1vw] py-[0.7vw] text-[clamp(8px,0.95vw,16px)] font-semibold text-white/92 shadow-[0_0_24px_-10px_rgba(56,189,248,0.9)] backdrop-blur-sm">
          {formatTipTime(tip?.updated_at)}
        </div>

        <div className="absolute left-[21.5%] top-[38.2%] w-[21%] rounded-[0.9rem] bg-[#07111d]/82 px-[1vw] py-[0.8vw] text-center shadow-[0_0_24px_-10px_rgba(56,189,248,0.9)] backdrop-blur-sm">
          <div className="text-[clamp(14px,2.35vw,40px)] font-black uppercase leading-none text-white">{tip?.home_team ?? 'Home'}</div>
        </div>

        <div className="absolute right-[10.5%] top-[38.2%] w-[23%] rounded-[0.9rem] bg-[#07111d]/82 px-[1vw] py-[0.8vw] text-center shadow-[0_0_24px_-10px_rgba(56,189,248,0.9)] backdrop-blur-sm">
          <div className="text-[clamp(14px,2.35vw,40px)] font-black uppercase leading-none text-white">{tip?.away_team ?? 'Away'}</div>
        </div>

        <div className="absolute left-1/2 top-[50.6%] w-[29%] -translate-x-1/2 rounded-[0.95rem] bg-[#07111d]/88 px-[1vw] py-[0.9vw] text-center shadow-[0_0_28px_-8px_rgba(56,189,248,0.95)] backdrop-blur-sm">
          <div className="text-[clamp(10px,1vw,16px)] font-black uppercase tracking-[0.18em] text-sky-300">Our Tip</div>
          <div className="mt-[0.2vw] text-[clamp(16px,2.2vw,38px)] font-black uppercase leading-none text-white">{tip?.market ?? 'Today\'s Pick'}</div>
          <div className="mt-[0.2vw] text-[clamp(16px,2.3vw,40px)] font-black leading-none text-sky-300">{tip ? formatOdds(tip.odds) : '—'}</div>
        </div>

        <div className="absolute bottom-[9.7%] left-[7.3%] right-[7.3%] grid grid-cols-4 overflow-hidden rounded-[1rem] border border-sky-400/20 bg-[#07111d]/78 text-center shadow-[0_0_26px_-10px_rgba(56,189,248,0.8)] backdrop-blur-sm">
          <div className="px-[0.8vw] py-[1vw] text-white/95">
            <div className="text-[clamp(13px,2vw,34px)] font-black leading-none text-sky-300">{tip?.confidence ?? 72}%</div>
            <div className="mt-[0.25vw] text-[clamp(8px,0.95vw,15px)] font-semibold uppercase tracking-[0.14em] text-white/70">Confidence</div>
          </div>
          <div className="px-[0.8vw] py-[1vw] text-white/95">
            <div className="text-[clamp(13px,2vw,34px)] font-black leading-none text-sky-300">8/10</div>
            <div className="mt-[0.25vw] text-[clamp(8px,0.95vw,15px)] font-semibold uppercase tracking-[0.14em] text-white/70">Form Guide</div>
          </div>
          <div className="px-[0.8vw] py-[1vw] text-white/95">
            <div className="text-[clamp(13px,2vw,34px)] font-black leading-none text-sky-300">4</div>
            <div className="mt-[0.25vw] text-[clamp(8px,0.95vw,15px)] font-semibold uppercase tracking-[0.14em] text-white/70">Tips Won</div>
          </div>
          <div className="px-[0.8vw] py-[1vw] text-white/95">
            <div className="text-[clamp(13px,2vw,34px)] font-black leading-none text-sky-300">9.4K+</div>
            <div className="mt-[0.25vw] text-[clamp(8px,0.95vw,15px)] font-semibold uppercase tracking-[0.14em] text-white/70">Following</div>
          </div>
        </div>
      </div>

      <a href="/fixtures" aria-label="View all today's tips" className="absolute bottom-[2.8%] left-[24%] h-[8%] w-[52%] rounded-[1rem]" />
    </section>
  );
}
