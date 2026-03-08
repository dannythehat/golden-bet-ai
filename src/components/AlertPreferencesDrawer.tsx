import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { 
  Bell, 
  BellOff, 
  CornerDownRight, 
  CreditCard, 
  Target, 
  Zap,
  Mail,
  Smartphone,
  AlertCircle,
  Download,
  LogIn
} from 'lucide-react';
import { 
  getRelevantAlertsForMarket, 
  extractThresholdFromMarket,
  CreateAlertPreference 
} from '@/hooks/useAlertPreferences';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

interface AlertPreferencesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixtureId: string;
  market: string;
  homeTeam: string;
  awayTeam: string;
  onSave: (preference: CreateAlertPreference) => Promise<void>;
}

export function AlertPreferencesDrawer({
  open,
  onOpenChange,
  fixtureId,
  market,
  homeTeam,
  awayTeam,
  onSave,
}: AlertPreferencesDrawerProps) {
  const relevantAlerts = getRelevantAlertsForMarket(market);
  const thresholds = extractThresholdFromMarket(market);
  const { supported, isIOSDevice, isPWA, permission } = useNotifications();
  const { user, loading: authLoading } = useAuth();
  
  const [alertCorners, setAlertCorners] = useState(relevantAlerts.corners);
  const [alertCards, setAlertCards] = useState(relevantAlerts.cards);
  const [alertGoals, setAlertGoals] = useState(relevantAlerts.goals);
  const [alertBtts, setAlertBtts] = useState(relevantAlerts.btts);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset to relevant alerts when market changes
  useEffect(() => {
    setAlertCorners(relevantAlerts.corners);
    setAlertCards(relevantAlerts.cards);
    setAlertGoals(relevantAlerts.goals);
    setAlertBtts(relevantAlerts.btts);
  }, [market, relevantAlerts.corners, relevantAlerts.cards, relevantAlerts.goals, relevantAlerts.btts]);

  // Check if user needs to sign in
  const needsAuth = !authLoading && !user;
  
  // Check if iOS needs PWA install
  const needsPWAInstall = isIOSDevice && !isPWA;
  
  // Push notifications available
  const pushAvailable = supported && !needsPWAInstall;

  const hasAnyAlert = alertCorners || alertCards || alertGoals || alertBtts;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        saved_fixture_id: fixtureId,
        alert_corners: alertCorners,
        alert_cards: alertCards,
        alert_goals: alertGoals,
        alert_btts: alertBtts,
        corners_threshold: alertCorners ? thresholds.corners : null,
        cards_threshold: alertCards ? thresholds.cards : null,
        goals_threshold: alertGoals ? thresholds.goals : null,
        push_enabled: pushEnabled,
        email_enabled: emailEnabled,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const alertOptions = [
    {
      id: 'corners',
      label: 'Corners',
      description: thresholds.corners ? `Alert at ${thresholds.corners} corners` : 'Corner kick updates',
      icon: CornerDownRight,
      enabled: alertCorners,
      setEnabled: setAlertCorners,
      relevant: relevantAlerts.corners,
      threshold: thresholds.corners,
    },
    {
      id: 'cards',
      label: 'Cards',
      description: thresholds.cards ? `Alert at ${thresholds.cards} cards` : 'Yellow/red card updates',
      icon: CreditCard,
      enabled: alertCards,
      setEnabled: setAlertCards,
      relevant: relevantAlerts.cards,
      threshold: thresholds.cards,
    },
    {
      id: 'goals',
      label: 'Goals',
      description: thresholds.goals ? `Alert at ${thresholds.goals} goals` : 'Goal updates',
      icon: Target,
      enabled: alertGoals,
      setEnabled: setAlertGoals,
      relevant: relevantAlerts.goals,
      threshold: thresholds.goals,
    },
    {
      id: 'btts',
      label: 'Both Teams Score',
      description: 'Alert when both teams have scored',
      icon: Zap,
      enabled: alertBtts,
      setEnabled: setAlertBtts,
      relevant: relevantAlerts.btts,
      threshold: null,
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-card border-border">
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Set Up Alerts
            </DrawerTitle>
            <DrawerDescription>
              {homeTeam} vs {awayTeam}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 space-y-6">
            {/* Auth Required Message */}
            {needsAuth && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-start gap-3">
                  <LogIn className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Sign in to set up alerts</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a free account to receive notifications when your bets are close to landing.
                    </p>
                    <Button asChild variant="gold" size="sm" className="mt-3">
                      <Link to="/auth" onClick={() => onOpenChange(false)}>
                        Sign In / Sign Up
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* iOS PWA Install Message */}
            {needsPWAInstall && !needsAuth && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-amber-600">Install app for push notifications</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      On iPhone, push notifications require installing the app. Tap the share button 
                      <span className="inline-block mx-1">⬆️</span> 
                      then "Add to Home Screen".
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      You can still enable email alerts below!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Market Badge */}
            {!needsAuth && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {market.replace(/_/g, ' ').toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Relevant alerts auto-selected
                </span>
              </div>
            )}

            {/* Alert Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">What to alert on:</Label>
              
              {alertOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    option.relevant 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      option.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <option.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{option.label}</span>
                        {option.relevant && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={option.enabled}
                    onCheckedChange={option.setEnabled}
                  />
                </div>
              ))}
            </div>

            {/* Delivery Method - Only show if authenticated */}
            {!needsAuth && (
              <div className="space-y-3 pt-2 border-t border-border">
                <Label className="text-sm font-medium">How to notify:</Label>
                
                {/* Push Notifications */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${
                  pushAvailable ? 'bg-muted/30 border-border' : 'bg-muted/20 border-border/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      pushEnabled && pushAvailable ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-sm">Push Notifications</span>
                      <p className="text-xs text-muted-foreground">
                        {needsPWAInstall 
                          ? 'Install app first (see above)' 
                          : permission === 'denied'
                            ? 'Blocked in browser settings'
                            : 'Browser alerts'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={pushEnabled && pushAvailable}
                    onCheckedChange={setPushEnabled}
                    disabled={!pushAvailable}
                  />
                </div>

                {/* Email Alerts - Now enabled! */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      emailEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-sm">Email Alerts</span>
                      <p className="text-xs text-muted-foreground">Get notified by email</p>
                    </div>
                  </div>
                  <Switch
                    checked={emailEnabled}
                    onCheckedChange={setEmailEnabled}
                  />
                </div>
              </div>
            )}
          </div>

          <DrawerFooter>
            {needsAuth ? (
              <Button asChild variant="gold" className="w-full">
                <Link to="/auth" onClick={() => onOpenChange(false)}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Enable Alerts
                </Link>
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                disabled={!hasAnyAlert || saving || (!pushEnabled && !emailEnabled)}
                className="w-full"
              >
                {saving ? (
                  'Setting up...'
                ) : !hasAnyAlert ? (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    Select at least one alert type
                  </>
                ) : !pushEnabled && !emailEnabled ? (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Choose a notification method
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Enable Alerts
                  </>
                )}
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
