import { Trophy, Mail, ExternalLink } from 'lucide-react';
import footyOracleLogo from '@/assets/footy-oracle-logo.webp';

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-gradient-to-b from-card/60 to-background mt-16">
      <div className="container mx-auto px-4 md:px-6 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src={footyOracleLogo} 
                alt="The Footy Oracle" 
                className="w-16 h-16 rounded-xl object-cover border-2 border-primary/30"
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
