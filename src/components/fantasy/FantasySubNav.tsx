import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Users, ArrowLeftRight, ListOrdered, Gift } from 'lucide-react';

const TABS = [
  { to: '/fantasy-league', label: 'Overview', icon: LayoutGrid, exact: true },
  { to: '/fantasy-league/my-team', label: 'My Team', icon: Users },
  { to: '/fantasy-league/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { to: '/fantasy-league/results', label: 'Results', icon: ListOrdered },
  { to: '/fantasy-league#prizes', label: 'Prizes', icon: Gift },
];

/** Sub-navigation tab bar shared across the Fantasy pages. */
export function FantasySubNav() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#0b0518]/70 p-1.5 [scrollbar-width:none]">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to.split('#')[0]) && t.to !== '/fantasy-league';
          return (
            <Link key={t.to} to={t.to} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-black uppercase tracking-wide transition-colors ${active ? 'bg-[#f5c542] text-[#16051f]' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
