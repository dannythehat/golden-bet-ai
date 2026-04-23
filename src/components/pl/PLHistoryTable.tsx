import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatTeamName } from '@/lib/teamNames';
import { Search, ChevronLeft, ChevronRight, Filter, CheckCircle2, XCircle, Database, Minus } from 'lucide-react';
import type { SettlementStatus } from '@/hooks/usePLHistory';

interface SettledBet {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  market: string;
  bookmaker_odds: number;
  result: string;
  status: SettlementStatus;
  stake: number;
  profit_loss: number;
  gaffer_reasoning: string;
  kickoff: string;
  prediction_date?: string;
}

interface PLHistoryTableProps {
  bets: SettledBet[];
  title: string;
  icon: React.ReactNode;
  accentColor: string;
}

const marketLabels: Record<string, string> = {
  'over_2.5_goals': 'Over 2.5 Goals',
  'btts': 'BTTS Yes',
  'over_9.5_corners': 'Over 9.5 Corners',
  'over_9_5_corners': 'Over 9.5 Corners',
  'over_95_corners': 'Over 9.5 Corners',
  'over_3.5_cards': 'Over 3.5 Cards',
};

const ITEMS_PER_PAGE = 10;

export function PLHistoryTable({ bets, title, icon, accentColor }: PLHistoryTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'won' | 'lost' | 'void'>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Get unique markets for filter
  const uniqueMarkets = useMemo(() => {
    const markets = new Set(bets.map(b => b.market));
    return Array.from(markets);
  }, [bets]);

  // Filter and search
  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        bet.home_team.toLowerCase().includes(searchLower) ||
        bet.away_team.toLowerCase().includes(searchLower) ||
        bet.league.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === 'all' || bet.status === statusFilter;
      const matchesMarket = marketFilter === 'all' || bet.market === marketFilter;
      
      return matchesSearch && matchesStatus && matchesMarket;
    });
  }, [bets, search, statusFilter, marketFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredBets.length / ITEMS_PER_PAGE);
  const paginatedBets = filteredBets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Stats for filtered results
  const filteredStats = useMemo(() => {
    const wins = filteredBets.filter(b => b.status === 'won').length;
    const losses = filteredBets.filter(b => b.status === 'lost').length;
    const profit = filteredBets.reduce((sum, b) => sum + (b.profit_loss || 0), 0);
    return { wins, losses, profit, total: filteredBets.length };
  }, [filteredBets]);

  if (bets.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-muted/20 border border-border/50">
        <Database className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No settled bets in this period yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="font-bold text-lg text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {filteredStats.total} records • 
              <span className="text-success ml-1">{filteredStats.wins}W</span> - 
              <span className="text-destructive ml-1">{filteredStats.losses}L</span> • 
              <span className={cn("ml-1 font-semibold", filteredStats.profit >= 0 ? "text-success" : "text-destructive")}>
                {filteredStats.profit >= 0 ? '+' : ''}£{filteredStats.profit.toFixed(2)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search teams or league..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            className="pl-9 bg-muted/30 border-border/50"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as 'all' | 'won' | 'lost'); handleFilterChange(); }}>
            <SelectTrigger className="w-[110px] bg-muted/30 border-border/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
          <Select value={marketFilter} onValueChange={(v) => { setMarketFilter(v); handleFilterChange(); }}>
            <SelectTrigger className="w-[140px] bg-muted/30 border-border/50">
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="all">All Markets</SelectItem>
              {uniqueMarkets.map(m => (
                <SelectItem key={m} value={m}>{marketLabels[m] || m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border-2 border-border/50 overflow-hidden bg-card/50">
        {/* Table Header */}
        <div className="hidden md:grid md:grid-cols-[1fr_140px_80px_80px_100px] gap-4 px-4 py-3 bg-muted/40 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <div>Fixture</div>
          <div>Market</div>
          <div className="text-center">Odds</div>
          <div className="text-center">Result</div>
          <div className="text-right">P&L</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border/30">
          {paginatedBets.map((bet) => (
            <div
              key={bet.id}
              className={cn(
                "grid grid-cols-1 md:grid-cols-[1fr_140px_80px_80px_100px] gap-2 md:gap-4 px-4 py-3",
                "hover:bg-muted/20 transition-colors"
              )}
            >
              {/* Fixture */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                    bet.status === 'won' && "bg-success/20",
                    bet.status === 'lost' && "bg-destructive/20",
                    bet.status === 'void' && "bg-muted/40"
                  )}>
                    {bet.status === 'won' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    ) : bet.status === 'lost' ? (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="font-semibold text-sm text-foreground truncate">
                    {formatTeamName(bet.home_team)} vs {formatTeamName(bet.away_team)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 pl-7 truncate">
                  {bet.league} • {new Date(bet.kickoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {/* Market - Mobile shows inline */}
              <div className="flex md:block items-center gap-2 pl-7 md:pl-0">
                <Badge variant="outline" className="text-xs font-medium shrink-0">
                  {marketLabels[bet.market] || bet.market}
                </Badge>
              </div>

              {/* Odds */}
              <div className="hidden md:flex items-center justify-center">
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {bet.bookmaker_odds?.toFixed(2) || '-'}
                </span>
              </div>

              {/* Result */}
              <div className="hidden md:flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {bet.result || '-'}
                </span>
              </div>

              {/* P&L */}
              <div className="flex items-center justify-between md:justify-end pl-7 md:pl-0 mt-1 md:mt-0">
                <div className="md:hidden flex items-center gap-3 text-xs text-muted-foreground">
                  <span>@ {bet.bookmaker_odds?.toFixed(2)}</span>
                  <span>{bet.result}</span>
                </div>
                <span className={cn(
                  "text-sm font-black tabular-nums",
                  bet.profit_loss >= 0 ? "text-success" : "text-destructive"
                )}>
                  {bet.profit_loss >= 0 ? '+' : ''}£{bet.profit_loss?.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {paginatedBets.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No results match your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredBets.length)} of {filteredBets.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
              className="border-border/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
              className="border-border/50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
