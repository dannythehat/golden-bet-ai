import {
  Newspaper, Flame, BarChart3, Gift, Trophy, Users, Crown, Goal, Swords, Flag,
  FlagTriangleRight, RectangleVertical, House, Plane, Clock, UserRound, TrendingUp,
  CalendarDays, Palmtree, Star, FerrisWheel, Utensils, BedDouble, Wine, Ticket,
  BadgeCheck, MessageCircle, Lock, Facebook, Send, Instagram, Youtube, Circle,
  type LucideIcon,
} from 'lucide-react';

/** Map of the icon names used across homepage content -> lucide components. */
const ICONS: Record<string, LucideIcon> = {
  newspaper: Newspaper, flame: Flame, 'bar-chart-3': BarChart3, gift: Gift,
  trophy: Trophy, users: Users, crown: Crown, goal: Goal, swords: Swords,
  flag: Flag, 'flag-triangle-right': FlagTriangleRight, 'rectangle-vertical': RectangleVertical,
  house: House, plane: Plane, clock: Clock, 'user-round': UserRound, 'trending-up': TrendingUp,
  'calendar-days': CalendarDays, palmtree: Palmtree, star: Star, 'ferris-wheel': FerrisWheel,
  utensils: Utensils, 'bed-double': BedDouble, wine: Wine, ticket: Ticket,
  'badge-check': BadgeCheck, 'message-circle': MessageCircle, lock: Lock,
  facebook: Facebook, send: Send, instagram: Instagram, youtube: Youtube,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Circle;
  return <Cmp className={className} />;
}
