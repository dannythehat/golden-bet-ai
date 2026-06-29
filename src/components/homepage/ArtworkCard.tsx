import { Link } from 'react-router-dom';

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
};

function Overlay({ link }: { link: OverlayLink }) {
  const className = `absolute z-10 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] ${link.className}`;

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
}: ArtworkCardProps) {
  const artwork = (
    <div
      className={`relative overflow-hidden rounded-[14px] border border-white/10 bg-[#07000f] shadow-[0_18px_60px_-28px_rgba(0,0,0,0.95)] ${className}`}
    >
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`block h-auto w-full select-none ${imageClassName}`}
        draggable={false}
      />
      {overlayLinks.map((overlay) => (
        <Overlay key={overlay.label} link={overlay} />
      ))}
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