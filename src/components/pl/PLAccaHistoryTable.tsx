import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatTeamName } from '@/lib/teamNames';
import { Search, ChevronLeft, ChevronRight, Filter, CheckCircle2, XCircle, Database, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface AccaSelection {
  teamName: string;
  opposition: string;
  market: string;
  marketLabel: string;
  successPercent: number;
  isHome: boolean;
}

interface SettledAcca {
  id: string;
  status: 'won' | 'lost';
  profit_loss: number;
  combined_odds: number;
  selection_count: number;
  selections: AccaSelection[];
  prediction_date: string;
  stake: number;
  legs_won?: number;
  legs_lost?: number;
}

interface PLAccaHistoryTableProps {
  accas: SettledAcca[];
}

const ITEMS_PER_PAGE = 8;

export function PLAccaHistoryTable({ accas }: PLAccaHistoryTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'won' | 'lost'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter and search
  const filteredAccas = useMemo(() => {
    return accas.filter(acca => {
      const searchLower = search.toLowerCase();
      const selectionsText = acca.selections?.map(s => 
        `${s.teamName} ${s.opposition}`.toLowerCase()
      ).join(' ') || '';
      const matchesSearch = selectionsText.includes(searchLower);
      const matchesStatus = statusFilter === 'all' || acca.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [accas, search, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAccas.length / ITEMS_PER_PAGE);
  const paginatedAccas = filteredAccas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Stats
  const stats = useMemo(() => {
    const wins = filteredAccas.filter(a => a.status === 'won').length;
    const losses = filteredAccas.filter(a => a.status === 'lost').length;
    const profit = filteredAccas.reduce((sum, a) => sum + (a.profit_loss || 0), 0);
    return { wins, losses, profit, total: filteredAccas.length };
  }, [filteredAccas]);

  if (accas.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-muted/20 border border-border/50">
        <Database className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No settled ACCAs in this period yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Accas Database</h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} records • 
              <span className="text-success ml-1">{stats.wins}W</span> - 
              <span className="text-destructive ml-1">{stats.losses}L</span> • 
              <span className={cn("ml-1 font-semibold", stats.profit >= 0 ? "text-success" : "text-destructive")}>
                {stats.profit >= 0 ? '+' : ''}£{stats.profit.toFixed(2)}
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
            placeholder="Search teams..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            className="pl-9 bg-muted/30 border-border/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as 'all' | 'won' | 'lost'); handleFilterChange(); }}>
          <SelectTrigger className="w-[110px] bg-muted/30 border-border/50">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Acca List */}
      <div className="space-y-2">
        {paginatedAccas.map((acca) => (
          <Collapsible
            key={acca.id}
            open={expandedId === acca.id}
            onOpenChange={(open) => setExpandedId(open ? acca.id : null)}
          >
            <div className="rounded-xl border-2 border-border/50 overflow-hidden bg-card/50 hover:border-success/30 transition-colors">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      acca.status === 'won' ? "bg-success/20" : "bg-destructive/20"
                    )}>
                      {acca.status === 'won' ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {acca.selection_count}-Fold ACCA
                        </span>
                        <Badge variant="outline" className="text-xs">
                          @ {acca.combined_odds?.toFixed(2)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(acca.prediction_date).toLocaleDateString('en-GB', { 
                          weekday: 'short',
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                        {acca.legs_won !== undefined && (
                          <span className="ml-2">
                            • <span className="text-success">{acca.legs_won}</span>/<span>{acca.selection_count}</span> legs won
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-lg font-black tabular-nums",
                      acca.profit_loss >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {acca.profit_loss >= 0 ? '+' : ''}£{acca.profit_loss?.toFixed(2)}
                    </span>
                    {expandedId === acca.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border-t border-border/30 px-4 py-3 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Selections</p>
                  <div className="space-y-2">
                    {acca.selections?.map((sel, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-5 text-center">{idx + 1}.</span>
                          <span className="font-medium truncate">
                            {formatTeamName(sel.isHome ? sel.teamName : sel.opposition)} vs {formatTeamName(sel.isHome ? sel.opposition : sel.teamName)}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {sel.marketLabel || sel.market}
                        </Badge>
                      </div>
                    )) || (
                      <p className="text-sm text-muted-foreground">Selection details not available</p>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}

        {paginatedAccas.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-muted/20 border border-border/50">
            <p className="text-muted-foreground">No results match your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAccas.length)} of {filteredAccas.length}
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
