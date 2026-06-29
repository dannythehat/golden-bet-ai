import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type OverlayLink = {
  label: string;
  className: string;
  to?: string;
  href?: string;
};

type ArtworkCardProps = {
  id?: string;
  src: string;
  alt: string;
  to?: string;
  href?: string;
  label?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  overlayLinks?: OverlayLink[];
  /** Disable the 3D tilt/float effect for this card */
  flat?: boolean;
};

function Overlay({ link }: { link: OverlayLink }) {
  const className = `absolute z-20 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] ${link.className}`;

  if (link.href) {
    return (
      <a href={link.href} aria-label={link.label} className={className}>
        <span className="sr-only">{link.label}</span>
      </a>
    );
  }

  return (
    <Link to={link.to ?? '/'} aria-label={link.label} className={className}>
      <span className="sr-only">{link.label}</span>
    </Link>
  );
}

export function ArtworkCard({
  id,
  src,
  alt,
  to,
  href,
  label,
  priority = false,
  className = '',
  imageClassName = '',
  overlayLinks = [],
  flat = false,
}: ArtworkCardProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Scroll reveal — entrance animation when the card comes into view
  useEffect(() => {
    if (flat || !wrapRef.current) {
      setRevealed(true);
      return;
    }
    const el = wrapRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [flat]);

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (flat) return;
    const el = wrapRef.current;
    const inner = innerRef.current;
    const sheen = sheenRef.current;
    if (!el || !inner) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const y = (e.clientY - rect.top) / rect.height; // 0..1
    const maxTilt = e.pointerType === 'touch' ? 4 : 8;
    const rotY = (x - 0.5) * 2 * maxTilt;
    const rotX = -(y - 0.5) * 2 * maxTilt;
    inner.style.transform = `perspective(1100px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.015)`;
    if (sheen) {
      sheen.style.opacity = '1';
      sheen.style.background = `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.18), transparent 55%)`;
    }
  };

  const handlePointerLeave = () => {
    const inner = innerRef.current;
    const sheen = sheenRef.current;
    if (inner) inner.style.transform = '';
    if (sheen) sheen.style.opacity = '0';
  };

  const artwork = (
    <div
      ref={wrapRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      className={`group relative [perspective:1100px] transition-all duration-700 ease-out ${
        revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ willChange: 'transform, opacity' }}
    >
      <div
        ref={innerRef}
        className={`relative overflow-hidden rounded-[14px] border border-white/10 bg-[#07000f] shadow-[0_22px_70px_-30px_rgba(0,0,0,0.95)] transition-transform duration-300 ease-out ${className}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* soft glow halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[14px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              'linear-gradient(135deg, rgba(245,197,66,0.35), rgba(124,58,237,0.35) 50%, rgba(56,189,248,0.35))',
            filter: 'blur(18px)',
            zIndex: -1,
          }}
        />
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`block h-auto w-full select-none ${imageClassName}`}
          draggable={false}
        />
        {/* sheen */}
        <div
          ref={sheenRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300"
        />
        {/* edge gloss */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[14px]"
          style={{
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.5)',
          }}
        />
        {overlayLinks.map((overlay) => (
          <Overlay key={overlay.label} link={overlay} />
        ))}
      </div>
    </div>
  );

  if (href) {
    return (
      <a id={id} href={href} aria-label={label ?? alt} className="block">
        {artwork}
      </a>
    );
  }

  if (to) {
    return (
      <Link id={id} to={to} aria-label={label ?? alt} className="block">
        {artwork}
      </Link>
    );
  }

  return <section id={id}>{artwork}</section>;
}
