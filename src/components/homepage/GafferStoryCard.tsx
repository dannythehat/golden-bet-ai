import { ArrowRight } from 'lucide-react';
import { SectionShell } from './primitives';
import { ASSETS } from './content';

/** The Gaffer feature — pink/magenta neon, distinct Gaffer pose (not the hero image). */
export function GafferStoryCard() {
  return (
    <SectionShell
      id="gaffer-story"
      glow={{ border: 'rgba(244,114,182,0.5)', glow: 'rgba(236,72,153,0.5)' }}
      className="bg-gradient-to-br from-[#1a0514] via-[#140410] to-[#0b0309]"
    >
      <div className="relative grid items-stretch gap-0 md:grid-cols-2">
        {/* Left — copy */}
        <div className="space-y-5 p-6 md:p-10">
          <div>
            <h2 className="font-display text-4xl tracking-wide text-white md:text-5xl">THE GAFFER</h2>
            <p className="mt-1 text-white/60">The man. The myth. The football addict.</p>
          </div>

          <p
            className="font-hand text-6xl font-bold leading-[0.85] text-pink-400 md:text-7xl"
            style={{ textShadow: '0 0 18px rgba(244,114,182,0.9), 0 0 40px rgba(236,72,153,0.5)' }}
          >
            Trust<br />the<br />Gaffer
          </p>

          <div className="h-px w-40 bg-gradient-to-r from-pink-500 to-transparent" />

          <div className="space-y-3 text-lg font-semibold text-white/90">
            <p>20+ years of living and breathing football.</p>
            <p>Bringing you the truth, the banter and the edge you need.</p>
          </div>

          <a href="/about" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-6 py-4 font-display text-xl tracking-wide text-white shadow-[0_10px_30px_-10px_rgba(236,72,153,0.9)] transition-transform hover:scale-[1.01] md:w-auto">
            Read The Gaffer's Story <ArrowRight className="h-5 w-5" />
          </a>
        </div>

        {/* Right — distinct Gaffer image */}
        <div className="relative min-h-[280px] overflow-hidden md:min-h-full">
          <img
            src={ASSETS.gaffer2}
            alt="The Gaffer"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: '50% 25%' }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#140410] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0309] via-transparent to-transparent" />
        </div>
      </div>
    </SectionShell>
  );
}
