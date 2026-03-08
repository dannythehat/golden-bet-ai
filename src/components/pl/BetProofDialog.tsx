import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, ExternalLink, Clock } from 'lucide-react';

interface BetProofDialogProps {
  proofUrl?: string | null;
  proofCapturedAt?: string | null;
  betType: 'golden_bet' | 'acca' | 'bet_builder';
  homeTeam?: string;
  awayTeam?: string;
}

export function BetProofDialog({
  proofUrl,
  proofCapturedAt,
  betType,
  homeTeam,
  awayTeam,
}: BetProofDialogProps) {
  if (!proofUrl) {
    return null;
  }

  const betTypeLabels = {
    golden_bet: 'Golden Bet',
    acca: 'ACCA',
    bet_builder: 'Bet Builder',
  };

  const formattedTimestamp = proofCapturedAt
    ? new Date(proofCapturedAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <Camera className="w-3.5 h-3.5" />
          View Proof
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {betTypeLabels[betType]} Proof
            {homeTeam && awayTeam && (
              <span className="text-muted-foreground font-normal">
                — {homeTeam} vs {awayTeam}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Timestamp */}
          {formattedTimestamp && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4" />
              <span>Captured: {formattedTimestamp}</span>
            </div>
          )}

          {/* Proof Image */}
          <div className="rounded-lg overflow-hidden border bg-muted/30">
            <img
              src={proofUrl}
              alt={`${betTypeLabels[betType]} proof screenshot`}
              className="w-full h-auto"
              loading="lazy"
            />
          </div>

          {/* Open in new tab */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(proofUrl, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Full Size
            </Button>
          </div>

          {/* Verification note */}
          <p className="text-xs text-muted-foreground text-center">
            This screenshot was automatically captured at the moment the prediction was generated.
            It serves as immutable proof that the bet was placed before the match.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
