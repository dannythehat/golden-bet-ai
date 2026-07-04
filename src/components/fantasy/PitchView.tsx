import type { FantasyTeam, FantasyPosition } from '@/types/footy';
import { PlayerCard } from './PlayerCard';

// Rows front-to-back to match the pitch (attackers on top, keeper at the base).
const ROWS: FantasyPosition[] = ['FWD', 'MID', 'DEF', 'GK'];

/**
 * PitchView — renders a FantasyTeam's starting XI on the turf plus the bench.
 * Shared by My Team and Gameweek Results. Display-only; `metric` chooses whether
 * cards headline season points or this gameweek's points.
 */
export function PitchView({ team, metric = 'total' }: { team: FantasyTeam; metric?: 'total' | 'gameweek' }) {
  const starters = team.slots.filter((s) => s.is_starter);
  const bench = team.slots.filter((s) => !s.is_starter).sort((a, b) => (a.bench_order ?? 9) - (b.bench_order ?? 9));
  const byPos = (pos: FantasyPosition) => starters.filter((s) => s.player.position === pos);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,#0a3d24,#072a19)]" />
        <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0_44px,transparent_44px_88px)]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        <div className="relative flex flex-col gap-3 px-2 py-5 sm:gap-4 sm:px-4 sm:py-7">
          {ROWS.map((pos) => (
            <div key={pos} className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {byPos(pos).map((s) => (
                <PlayerCard key={s.player.id} player={s.player} size="sm" metric={metric} captain={s.is_captain} vice={s.is_vice_captain} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b0518]/60 p-3">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/45">Bench</div>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start sm:gap-3">
          {bench.map((s) => (
            <div key={s.player.id} className="relative">
              {s.bench_order && <span className="absolute -left-1 -top-1 z-10 grid h-4 w-4 place-items-center rounded-full bg-white/85 text-[9px] font-black text-[#16051f]">{s.bench_order}</span>}
              <PlayerCard player={s.player} size="sm" metric={metric} captain={s.is_captain} vice={s.is_vice_captain} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
