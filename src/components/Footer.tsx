import { Mail, ExternalLink } from 'lucide-react';
import footyOracleLogo from '@/assets/footy-oracle-logo.webp';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-gradient-to-b from-card/60 to-background mt-16">
      <div className="container mx-auto px-4 md:px-6 py-10">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src={footyOracleLogo} 
                alt="The Footy Oracle logo" 
                className="w-16 h-16 rounded-xl object-cover border-2 border-primary/30"
                id="site-logo"
              />
              <div>
                <h3 className="font-bold text-lg text-primary">The Footy Oracle</h3>
                <p className="text-xs text-muted-foreground">AI-Powered Betting Intelligence</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Data-driven football insights across 200+ leagues worldwide. 
              Powered by The Gaffer — your AI betting analyst.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-1">
              <a href="https://x.com/TheFootyOracle" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Follow us on X">
                <XIcon className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/thefootyoracle" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Follow us on Instagram">
                <InstagramIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
                  BeGambleAware <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
                  GamCare <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact Us</h4>
            <a 
              href="mailto:contact@thefootyoracle.com" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
              contact@thefootyoracle.com
            </a>
            <p className="text-sm text-muted-foreground">
              Got questions or feedback? We'd love to hear from you.
            </p>
          </div>
        </div>

        <div className="border-t border-border/40 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} The Footy Oracle. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground text-center md:text-right">
            18+ Only. Please gamble responsibly. Betting involves risk.
          </p>
        </div>
      </div>
    </footer>
  );
}
