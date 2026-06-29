import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function HeroBanner() {
  return (
    <section id="top" className="relative mx-auto w-full max-w-[1536px]">
      <ArtworkCard
        src={HOMEPAGE_APPROVED_ASSETS.heroBanner}
        alt="Footy Oracle homepage hero with The Gaffer"
        priority
        className="rounded-none border-x-0 border-t-0 md:rounded-b-[14px]"
        overlayLinks={[
          { label: 'Login', to: '/auth', className: 'left-[77%] top-[2.5%] h-[5%] w-[8%]' },
          { label: 'Join the Club', to: '/pricing', className: 'left-[86%] top-[2.5%] h-[5%] w-[12%]' },
          { label: 'Join the Club', to: '/pricing', className: 'left-[3.5%] top-[70.4%] h-[7%] w-[16%]' },
          { label: "Explore Today's Tips", to: '/predictions', className: 'left-[21%] top-[70.4%] h-[7%] w-[20%]' },
          { label: 'Form Tables', to: '/form-tables', className: 'left-[28%] top-[84.5%] h-[9%] w-[11%]' },
          { label: 'Fantasy League', to: '/fantasy-league', className: 'left-[56%] top-[84.5%] h-[9%] w-[12%]' },
        ]}
      />
    </section>
  );
}
