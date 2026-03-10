import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  TrendingUp, 
  Mail, 
  Zap,
  Crown,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import theGafferImage from '@/assets/the-gaffer.webp';

interface SignUpPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const benefits = [
  {
    icon: Bell,
    title: 'Live Match Alerts',
    description: 'Get notified when your bets hit key milestones',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: TrendingUp,
    title: 'Track Bet Progress',
    description: 'Monitor corners, cards & goals in real-time',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    icon: Mail,
    title: 'Daily Email Alerts',
    description: "Be first to know when The Gaffer's picks drop",
    color: 'text-gold',
    bgColor: 'bg-gold/10',
  },
  {
    icon: Zap,
    title: 'Instant Notifications',
    description: 'Golden Bets & Bet Builder alerts as they publish',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
];

export function SignUpPromptModal({ open, onOpenChange }: SignUpPromptModalProps) {
  const navigate = useNavigate();

  const handleSignUp = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-gold/30 bg-gradient-to-b from-card to-background overflow-hidden">
        {/* Decorative top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 gold-gradient" />
        
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full gold-gradient p-0.5">
                <img 
                  src={theGafferImage} 
                  alt="The Gaffer" 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            </div>
          </div>
          
          <DialogTitle className="text-xl font-bold">
            Join The Gaffer's Inner Circle
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a free account and never miss a winning opportunity
          </DialogDescription>
        </DialogHeader>

        {/* Benefits Grid */}
        <div className="grid gap-3 py-4">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30",
                "hover:border-gold/30 hover:bg-gold/5 transition-colors duration-200"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                benefit.bgColor
              )}>
                <benefit.icon className={cn("w-5 h-5", benefit.color)} />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-foreground">
                  {benefit.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button 
            onClick={handleSignUp}
            className="w-full gold-gradient text-primary-foreground font-semibold shadow-lg hover:opacity-90 transition-opacity"
            size="lg"
          >
            <Crown className="w-4 h-4 mr-2" />
            Create Free Account
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Maybe Later
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          100% free • No credit card required
        </p>
      </DialogContent>
    </Dialog>
  );
}
