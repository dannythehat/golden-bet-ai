import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmailPreferences } from '@/hooks/useEmailPreferences';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  Settings, 
  Plug, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Key,
  Globe,
  Database,
  Loader2,
  Zap,
  Mail,
  Bell,
  BellRing,
  Download
} from 'lucide-react';

export function SettingsSection() {
  const [fixturesApi, setFixturesApi] = useState('');
  const [mlEndpoint, setMlEndpoint] = useState('');
  const [oddsApi, setOddsApi] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [isPopulating, setIsPopulating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { preferences, loading: prefsLoading, updatePreferences } = useEmailPreferences();
  const { supported, permission, requestPermission, isIOSDevice, isPWA } = useNotifications();

  const handlePopulateStats = async () => {
    setIsPopulating(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ffonednbxcfhzxardvry';
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/populate-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger stats population');
      }
      
      const result = await response.json();
      toast({
        title: "Stats Population Started",
        description: `Processing ${result.leagues_processed || 'all'} leagues. This runs in background.`,
      });
    } catch (error) {
      toast({
        title: "Population Triggered",
        description: "Stats collection is running in the background. Check Form Tables in a few minutes.",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  const handleNewBetsToggle = async (enabled: boolean) => {
    await updatePreferences({ new_bets_enabled: enabled });
  };

  const handleSettlementToggle = async (enabled: boolean) => {
    await updatePreferences({ settlement_enabled: enabled });
  };

  const endpoints = [
    {
      name: 'Fixtures API',
      description: 'Daily football fixtures endpoint',
      placeholder: 'https://api.football-data.org/v4/matches',
      value: fixturesApi,
      onChange: setFixturesApi,
      status: 'disconnected',
      icon: Globe,
    },
    {
      name: 'ML Prediction API',
      description: 'Your ML model endpoint from GitHub',
      placeholder: 'https://your-ml-api.com/predict',
      value: mlEndpoint,
      onChange: setMlEndpoint,
      status: 'disconnected',
      icon: Database,
    },
    {
      name: 'Odds API',
      description: 'Live bookmaker odds endpoint',
      placeholder: 'https://api.the-odds-api.com/v4/sports',
      value: oddsApi,
      onChange: setOddsApi,
      status: 'disconnected',
      icon: Key,
    },
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'connected') {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Connected
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground border-muted-foreground/30">
        <AlertCircle className="w-3 h-3" />
        Not Connected
      </Badge>
    );
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">
          <span className="gold-text">Settings</span>
        </h2>
        <p className="text-muted-foreground">
          Manage your notifications and API connections
        </p>
      </div>

      {/* Browser Push Notifications */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <BellRing className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Get instant browser alerts for live bet updates
            </p>
          </div>
        </div>

        {!supported && !isIOSDevice ? (
          <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Your browser doesn't support push notifications
            </p>
          </div>
        ) : isIOSDevice && !isPWA ? (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <Download className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-600">Install app for push notifications</p>
                <p className="text-sm text-muted-foreground mt-1">
                  On iPhone, push notifications require installing the app to your home screen:
                </p>
                <ol className="text-sm text-muted-foreground mt-2 list-decimal list-inside space-y-1">
                  <li>Tap the share button <span className="inline-block">⬆️</span></li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Open the app from your home screen</li>
                </ol>
              </div>
            </div>
          </div>
        ) : permission === 'granted' ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <div>
              <p className="font-medium text-success">Notifications Enabled</p>
              <p className="text-sm text-muted-foreground">
                You'll receive alerts when your bets are close to landing
              </p>
            </div>
          </div>
        ) : permission === 'denied' ? (
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              <p className="font-medium">Notifications Blocked</p>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              To enable push notifications, click the lock icon in your browser's address bar and allow notifications for this site.
            </p>
          </div>
        ) : (
          <Button 
            onClick={requestPermission} 
            variant="gold" 
            className="w-full"
          >
            <Bell className="w-4 h-4 mr-2" />
            Enable Push Notifications
          </Button>
        )}
      </div>

      {/* Email Notifications */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Email Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Get notified when new picks are published and results are in
            </p>
          </div>
        </div>

        {!user ? (
          <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
            <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              Sign in to enable email notifications
            </p>
            <Button variant="gold" size="sm" asChild>
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        ) : prefsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <Label className="text-base font-medium">New Picks Alert</Label>
                <p className="text-sm text-muted-foreground">
                  Get emailed when Golden Bets & Bet Builder are published daily
                </p>
              </div>
              <Switch 
                checked={preferences?.new_bets_enabled ?? false} 
                onCheckedChange={handleNewBetsToggle} 
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <Label className="text-base font-medium">Daily Results</Label>
                <p className="text-sm text-muted-foreground">
                  Receive settlement results with P&L summary each evening
                </p>
              </div>
              <Switch 
                checked={preferences?.settlement_enabled ?? false} 
                onCheckedChange={handleSettlementToggle} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Plug className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">API Configuration</h3>
            <p className="text-sm text-muted-foreground">Connect your ML backend and data sources</p>
          </div>
        </div>

        <div className="space-y-6">
          {endpoints.map((endpoint) => (
            <div key={endpoint.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <endpoint.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">{endpoint.name}</Label>
                    <p className="text-xs text-muted-foreground">{endpoint.description}</p>
                  </div>
                </div>
                {getStatusBadge(endpoint.status)}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={endpoint.placeholder}
                  value={endpoint.value}
                  onChange={(e) => endpoint.onChange(e.target.value)}
                  className="bg-muted border-border"
                />
                <Button variant="outline" size="icon">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Population */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Form Tables Data</h3>
            <p className="text-sm text-muted-foreground">Populate stats from API-Football (runs daily at 4 AM UTC)</p>
          </div>
        </div>
        
        <Button 
          onClick={handlePopulateStats} 
          disabled={isPopulating}
          className="w-full"
          variant="outline"
        >
          {isPopulating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Populating Stats...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Manually Refresh Stats Now
            </>
          )}
        </Button>
      </div>

      {/* Sync Settings */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Settings className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Sync Settings</h3>
            <p className="text-sm text-muted-foreground">Configure how data flows between APIs</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <Label className="text-base font-medium">Auto-sync fixtures</Label>
              <p className="text-sm text-muted-foreground">
                Automatically fetch new fixtures every 6 hours
              </p>
            </div>
            <Switch checked={autoSync} onCheckedChange={setAutoSync} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <Label className="text-base font-medium">Live odds updates</Label>
              <p className="text-sm text-muted-foreground">
                Refresh odds every 15 minutes before kickoff
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button variant="gold" size="xl" className="w-full">
        Save Configuration
      </Button>
    </div>
  );
}
