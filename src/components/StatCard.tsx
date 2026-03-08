import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'gold' | 'success' | 'destructive';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = 'default',
}: StatCardProps) {
  const valueColors = {
    default: 'text-foreground',
    gold: 'gold-text',
    success: 'text-success',
    destructive: 'text-destructive',
  };

  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      
      <div className={cn('text-3xl font-bold mb-1', valueColors[variant])}>
        {value}
      </div>
      
      {(subtitle || trendValue) && (
        <div className="flex items-center gap-2 text-sm">
          {trendValue && trend && (
            <span className={cn('font-medium', trendColors[trend])}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
