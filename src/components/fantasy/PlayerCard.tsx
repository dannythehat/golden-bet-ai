import { Plus, X } from 'lucide-react';
import type { FantasyPlayer, FantasyPosition } from '@/hooks/useFantasyLeague';

const POS_TONE: Record<FantasyPosition, { ring: string; chip: string; glow: string }> = {
  GK: { ring: 'ring-emerald-400/50', chip: 'bg-emerald-400/20 text-emerald-200', glow: 'shadow-[0_0_28px_-10px_rgba(16,185,129,0.7)]' },
  DEF: { ring: 'ring-sky-400/50', chip: 'bg-sky-400/20 text-sky-200', glow: 'shadow-[0_0_28px_-10px_rgba(56,189,248,0.7)]' },
  MID: { ring: 'ring-violet-400/55', chip: 'bg-violet-400/20 text-violet-200', glow: 'shadow-[0_0_28px_-10px_rgba(139,92,246,0.75)]' },
  FWD: { ring: 'ring-[#f5c542]/60', chip: 'bg-[#f5c542]/20 text-[#f8e7a1]', glow: 'shadow-[0_0_30px_-10px_rgba(245,197,66,0.85)]' },
};

/** Initials for the "player portrait" placeholder (no external headshots). */
function initials(name: string) {
  const parts = name.replace(/[^A-Za-z\s.'-]/g, '').split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  return last.slice(0, 2).toUpperCase();
}

type Props = {
  player: FantasyPlayer;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  affordable?: boolean;
};

/**
 * FUT-style player card — gold/purple foil, rating + position corner, name,
 * club and price. Used in the hero showcase, the pitch slots and the picker.
 * Purely presentational; all data comes from the fantasy players contract.
 */
export function PlayerCard({ player, size = 'md', onClick, onRemove, selected, affordable = true }: Props) {
  const tone = POS_TONE[player.position];
  const dims =
    size === 'lg' ? 'w-[132px] p-3' : size === 'sm' ? 'w-[92px] p-2' : 'w-[112px] p-2.5';
  const nameSize = size === 'lg' ? 'text-[13px]' : 'text-[11px]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative shrink-0 overflow-hidden rounded-2xl border text-left transition-all ${dims} ${
        selected ? 'border-[#f5c542]/70' : 'border-white/12 hover:border-white/25'
      } bg-[linear-gradient(155deg,#1a0f2e_0%,#0b0518_60%,#160a24_100%)] ${tone.glow} ${
        affordable ? '' : 'opacity-45 saturate-50'
      } ${onClick ? 'hover:-translate-y-0.5 active:translate-y-0' : ''}`}
    >
      {/* foil sheen */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_-10%,rgba(245,197,66,0.16),transparent_55%)]" />

      {/* rating + position */}
      <div className="relative flex items-start justify-between">
        <div className="leading-none">
          <div className="font-display text-2xl text-[#f8e7a1]">{player.rating}</div>
          <div className={`mt-0.5 inline-block rounded px-1 py-px text-[9px] font-black tracking-wide ${tone.chip}`}>{player.position}</div>
        </div>
        {onRemove ? (
          <span
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="grid h-5 w-5 place-items-center rounded-full bg-black/50 text-white/70 transition-colors hover:bg-red-500/80 hover:text-white"
            aria-label={`Remove ${player.name}`}
          >
            <X className="h-3 w-3" />
          </span>
        ) : onClick ? (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-white/60 transition-colors group-hover:bg-[#f5c542] group-hover:text-[#16051f]">
            <Plus className="h-3 w-3" />
          </span>
        ) : null}
      </div>

      {/* portrait medallion */}
      <div className={`relative mx-auto mt-1.5 grid ${size === 'sm' ? 'h-11 w-11' : 'h-14 w-14'} place-items-center rounded-full bg-black/40 ring-2 ${tone.ring}`}>
        <span className="font-display text-lg text-white/85">{initials(player.name)}</span>
      </div>

      {/* name + club */}
      <div className="relative mt-1.5 text-center">
        <div className={`truncate font-black uppercase tracking-wide text-white ${nameSize}`}>{player.name}</div>
        <div className="truncate text-[9px] font-semibold uppercase tracking-wider text-white/45">{player.teamShort}</div>
      </div>

      {/* price */}
      <div className="relative mt-1.5 flex items-center justify-center gap-1 rounded-lg bg-black/35 py-1">
        <span className="text-[11px] font-black text-emerald-300">£{player.price.toFixed(1)}m</span>
      </div>
    </button>
  );
}

/** Empty pitch slot — tap to add a player of the given position. */
export function EmptySlot({ position, onClick, size = 'md' }: { position: FantasyPosition; onClick?: () => void; size?: 'sm' | 'md' }) {
  const tone = POS_TONE[position];
  const dims = size === 'sm' ? 'w-[92px] h-[128px]' : 'w-[112px] h-[152px]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative shrink-0 rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.03] transition-all hover:-translate-y-0.5 hover:border-[#f5c542]/60 hover:bg-white/[0.06] ${dims}`}
    >
      <span className="flex h-full flex-col items-center justify-center gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-full ${tone.chip}`}>
          <Plus className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white/75">{position}</span>
      </span>
    </button>
  );
}
