import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BarChart3, Menu, X, Home, Info, BookOpen, Target, Flag, CreditCard, Hammer, Layers, Crown, Trophy } from 'lucide-react';
import footyOracleLogo from '@/assets/footy-oracle-logo.webp';
import { UserMenu } from '@/components/UserMenu';
import { useSubscription } from '@/hooks/useSubscription';

type Section = 'home' | 'pnl' | 'about' | 'blog' | 'over-goals' | 'over-corners' | 'over-cards' | 'bet-builder' | 'acca-delight' | 'members' | 'world-cup';

interface NavigationProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

export function Navigation({ activeSection, onSectionChange }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { isActive: isMember } = useSubscription();

  const navItems = [
    { id: 'home' as Section, label: 'Home', icon: Home },
    { id: 'world-cup' as Section, label: 'World Cup', icon: Trophy, isRoute: true, path: '/world-cup', accent: true },
    { id: 'over-goals' as Section, label: 'Goals', icon: Target, isRoute: true, path: '/over-goals' },
    { id: 'over-corners' as Section, label: 'Corners', icon: Flag, isRoute: true, path: '/over-corners' },
    { id: 'over-cards' as Section, label: 'Cards', icon: CreditCard, isRoute: true, path: '/over-cards' },
    { id: 'bet-builder' as Section, label: 'Bet Builder', icon: Hammer, isRoute: true, path: '/bet-builder' },
    { id: 'acca-delight' as Section, label: 'ACCA Delight', icon: Layers, isRoute: true, path: '/acca-delight' },
    { id: 'pnl' as Section, label: 'P&L Hub', icon: BarChart3 },
    { id: 'blog' as Section, label: 'Blog', icon: BookOpen },
    { id: 'about' as Section, label: 'About', icon: Info },
    ...(isMember ? [{ id: 'members' as Section, label: 'Members', icon: Crown, isRoute: true, path: '/members', premium: true }] : []),
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    const id = item.id;
    if (id === 'blog') {
      navigate('/blog');
    } else if ((item as any).isRoute && (item as any).path) {
      navigate((item as any).path);
    } else {
      if (window.location.pathname !== '/') {
        navigate('/');
        setTimeout(() => onSectionChange(id), 100);
      } else {
        onSectionChange(id);
      }
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-background via-card/95 to-background border-b border-border/50 shadow-lg shadow-primary/5">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-18 py-2">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <img 
                  src={footyOracleLogo} 
                  alt="The Footy Oracle logo" 
                  className="relative w-20 h-20 rounded-xl object-cover border-2 border-primary/30 shadow-lg"
                  id="nav-logo"
                  width={80}
                  height={80}
                />
              </div>
              <div>
                <h1 className="font-extrabold text-2xl text-primary tracking-tight">The Footy Oracle</h1>
                <p className="text-sm text-ice font-semibold">✨ AI-Powered Predictions</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isPremium = (item as { premium?: boolean }).premium;
                return (
                  <Button
                    key={item.id}
                    variant={activeSection === item.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      'gap-2 transition-all duration-300',
                      activeSection === item.id && 'shadow-lg shadow-primary/20',
                      activeSection !== item.id && !isPremium && 'text-muted-foreground hover:text-foreground hover:bg-primary/10',
                      isPremium && activeSection !== item.id && 'text-gold border border-gold/30 bg-gold/5 hover:bg-gold/15 hover:text-gold',
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}
              <div className="ml-2 pl-2 border-l border-border/50">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-background via-card/95 to-background border-b border-border/50">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
              <img 
                src={footyOracleLogo} 
                alt="The Footy Oracle" 
                className="relative w-14 h-14 rounded-lg object-cover border-2 border-primary/30"
                width={56}
                height={56}
              />
            </div>
            <div>
              <h1 className="font-bold text-lg text-primary">The Footy Oracle</h1>
              <p className="text-xs text-ice font-medium">✨ AI Predictions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserMenu />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="hover:bg-primary/10"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border/50 p-4 space-y-2 bg-gradient-to-b from-card/90 to-background">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? 'default' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 transition-all",
                  activeSection === item.id && 'shadow-lg shadow-primary/20',
                  activeSection !== item.id && 'hover:bg-primary/10'
                )}
                onClick={() => {
                  handleNavClick(item);
                  setMobileOpen(false);
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
