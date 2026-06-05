import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Bell, Sparkles, Crown, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InnerCircleBadge } from '@/components/InnerCircleBadge';
import { cn } from '@/lib/utils';

export function UserMenu() {
  const { user, isAuthenticated, signOut, loading } = useAuth();
  const { isActive } = useSubscription();

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" size="sm" className="hidden sm:flex">
        <Link to="/auth">
          <User className="w-4 h-4 mr-2" />
          Sign In
        </Link>
      </Button>
    );
  }

  const initials = user?.email?.split('@')[0]?.slice(0, 2)?.toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative rounded-full",
            isActive && "ring-2 ring-gold/50 ring-offset-2 ring-offset-background"
          )}
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback className={cn(
              "text-xs font-medium",
              isActive
                ? "bg-gradient-to-br from-gold/30 to-gold/10 text-gold"
                : "bg-primary/10 text-primary"
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {isActive && (
            <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5 text-gold drop-shadow" strokeWidth={2.5} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-start justify-between gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            {isActive ? (
              <InnerCircleBadge />
            ) : (
              <p className="text-xs text-muted-foreground">Free tier</p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        {isActive ? (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/members" className="flex items-center">
              <LayoutDashboard className="w-4 h-4 mr-2 text-gold" />
              Members Dashboard
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/pricing" className="flex items-center">
              <Sparkles className="w-4 h-4 mr-2" />
              Join Inner Circle
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/#in-play" className="flex items-center">
            <Bell className="w-4 h-4 mr-2" />
            My Alerts
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
