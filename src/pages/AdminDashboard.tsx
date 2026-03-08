import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Play, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aggregating, setAggregating] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Load status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/aggregate');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const startAggregation = async () => {
    setAggregating(true);
    try {
      const res = await fetch('/api/aggregate', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Aggregation started! This will take 30-60 minutes. Refresh status to check progress.');
        checkStatus();
      } else {
        alert('❌ Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setAggregating(false);
    }
  };

  const testConnection = async () => {
    setTestLoading(true);
    try {
      const res = await fetch('/api/test-db');
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-primary mb-2">⚽ Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage data aggregation and database status</p>
        </div>

        {/* Database Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Status
            </CardTitle>
            <CardDescription>Current state of your MongoDB database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading status...
              </div>
            ) : status ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {status.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : status.status === 'failed' ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="font-medium">Status: {status.status || 'Unknown'}</span>
                </div>
                
                {status.last_update && (
                  <p className="text-sm text-muted-foreground">
                    Last Update: {new Date(status.last_update).toLocaleString()}
                  </p>
                )}
                
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-2xl font-bold">{status.total_teams || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Teams</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-2xl font-bold">{status.total_stats || 0}</p>
                    <p className="text-sm text-muted-foreground">Team Stats</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-2xl font-bold">{status.todays_fixtures || 0}</p>
                    <p className="text-sm text-muted-foreground">Today's Fixtures</p>
                  </div>
                </div>

                {status.error_message && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                    ❌ Error: {status.error_message}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No status available</p>
            )}

            <Button onClick={checkStatus} disabled={loading} variant="outline" className="w-full">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </CardContent>
        </Card>

        {/* Data Aggregation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Data Aggregation
            </CardTitle>
            <CardDescription>Fetch and calculate statistics from API-Football</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-medium">This will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Fetch 80+ major leagues worldwide</li>
                <li>Get 1,500+ teams from all leagues</li>
                <li>Calculate stats for last 20 games per team</li>
                <li>Fetch today's fixtures</li>
              </ul>
            </div>

            <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 p-3 rounded-lg text-sm">
              ⚠️ First run takes 30-60 minutes. Daily updates are faster (5-10 min).
            </div>

            <Button 
              onClick={startAggregation} 
              disabled={aggregating}
              className="w-full"
              size="lg"
            >
              {aggregating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Aggregation...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Aggregation
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test MongoDB Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Test MongoDB Connection
            </CardTitle>
            <CardDescription>Verify database connectivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-500/10 text-green-600 dark:text-green-500' : 'bg-red-500/10 text-red-600 dark:text-red-500'}`}>
                {testResult.success ? (
                  <div className="space-y-2">
                    <p className="font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {testResult.message}
                    </p>
                    <p className="text-sm">Database: {testResult.database}</p>
                    {testResult.collections && testResult.collections.length > 0 && (
                      <p className="text-sm">Collections: {testResult.collections.join(', ')}</p>
                    )}
                    {testResult.document_counts && (
                      <pre className="text-xs mt-2 bg-black/20 p-2 rounded overflow-auto">
                        {JSON.stringify(testResult.document_counts, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Connection Failed
                    </p>
                    <p className="text-sm">{testResult.error}</p>
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={testConnection} 
              disabled={testLoading}
              variant="outline"
              className="w-full"
            >
              {testLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
