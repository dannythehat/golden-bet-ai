import { GoldenBet } from '@/types/betting';
import { marketLabels, marketIcons } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ResultsTableProps {
  bets: GoldenBet[];
}

export function ResultsTable({ bets }: ResultsTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getStatusIcon = (status: GoldenBet['status']) => {
    switch (status) {
      case 'won':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'lost':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const calculateReturn = (bet: GoldenBet) => {
    if (bet.status === 'won' && bet.stake) {
      return `+£${(bet.stake * bet.bookmakerOdds - bet.stake).toFixed(2)}`;
    } else if (bet.status === 'lost' && bet.stake) {
      return `-£${bet.stake.toFixed(2)}`;
    }
    return '—';
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium">Date</TableHead>
            <TableHead className="text-muted-foreground font-medium">Match</TableHead>
            <TableHead className="text-muted-foreground font-medium">Market</TableHead>
            <TableHead className="text-muted-foreground font-medium text-center">ML %</TableHead>
            <TableHead className="text-muted-foreground font-medium text-center">Odds</TableHead>
            <TableHead className="text-muted-foreground font-medium text-center">Result</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">P/L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bets.map((bet) => (
            <TableRow key={bet.id} className="border-border/50 hover:bg-muted/30">
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(bet.kickoff)}
              </TableCell>
              <TableCell>
                <div className="font-medium text-foreground">
                  {bet.homeTeam} vs {bet.awayTeam}
                </div>
                <div className="text-xs text-muted-foreground">{bet.league}</div>
              </TableCell>
              <TableCell>
                <Badge variant="market">
                  <span className="mr-1">{marketIcons[bet.market]}</span>
                  {marketLabels[bet.market]}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="gold-text font-semibold">
                  {(bet.mlConfidence * 100).toFixed(0)}%
                </span>
              </TableCell>
              <TableCell className="text-center font-medium">
                {bet.bookmakerOdds.toFixed(2)}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {getStatusIcon(bet.status)}
                  {bet.result && (
                    <span className="text-sm text-muted-foreground">{bet.result}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold">
                <span className={bet.status === 'won' ? 'text-success' : bet.status === 'lost' ? 'text-destructive' : 'text-muted-foreground'}>
                  {calculateReturn(bet)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
