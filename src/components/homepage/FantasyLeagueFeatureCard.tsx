import { FeaturePanel, Accent } from './FeaturePanel';
import { FANTASY_HIGHLIGHTS, FANTASY_BENEFITS } from './content';
import { Icon } from './icons';

/** Fantasy League — native card: highlights + benefits, links to /fantasy-league. */
export function FantasyLeagueFeatureCard() {
  return (
    <FeaturePanel
      id="fantasy-league"
      tone="violet"
      eyebrow="Fantasy League"
      title={<>Pick your XI. <Accent tone="violet">Beat the Gaffer.</Accent></>}
      body="The club's flagship fantasy league — weekly prizes, live leaderboards and Gaffer-powered insight. All in with your membership."
      character={{ src: '/images/gaffer/gaffer-celebrating.png', alt: 'The Gaffer celebrating', className: 'w-[38%] max-w-[210px] opacity-90' }}
      ctas={[{ label: 'Play Fantasy', to: '/fantasy-league' }]}
    >
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-2">
          {FANTASY_HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
              <Icon name={h.icon} className="mx-auto h-5 w-5 text-violet-300" />
              <div className="mt-1.5 text-[11px] font-black leading-tight text-white">{h.title}</div>
              <div className="text-[10px] leading-tight text-white/45">{h.sub}</div>
            </div>
          ))}
        </div>
        <ul className="space-y-1.5">
          {FANTASY_BENEFITS.slice(0, 3).map((b) => (
            <li key={b.title} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <Icon name={b.icon} className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <span className="text-[12px] leading-snug text-white/75"><span className="font-bold text-white">{b.title}.</span> {b.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </FeaturePanel>
  );
}
