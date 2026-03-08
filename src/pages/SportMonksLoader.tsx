import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Play, Pause, RefreshCw, CheckCircle, Database, Cpu } from 'lucide-react';

type Phase = 'ingest' | 'compute';

export default function SportMonksLoader() {
  const [phase, setPhase] = useState<Phase>('ingest');
  const [isRunning, setIsRunning] = useState(false);
  const [rawCount, setRawCount] = useState(0);
  const [featuresCount, setFeaturesCount] = useState(0);
  const [errors, setErrors] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Ingest config
  const [startDate, setStartDate] = useState('2015-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');

  // Refs for async loop
  const isRunningRef = useRef(false);
  const currentDateRef = useRef('');
  const computeOffsetRef = useRef(0);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-80), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const fetchCounts = useCallback(async () => {
    const [{ count: raw }, { count: feat }] = await Promise.all([
      supabase.from('sportmonks_matches').select('*', { count: 'exact', head: true }),
      supabase.from('sportmonks_ml_features').select('*', { count: 'exact', head: true }),
    ]);
    setRawCount(raw ?? 0);
    setFeaturesCount(feat ?? 0);
  }, []);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  // ===== INGEST PHASE =====
  const startIngest = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);
    setPhase('ingest');

    const start = new Date(startDate);
    const end = new Date(endDate);
    let current = currentDateRef.current ? new Date(currentDateRef.current) : new Date(start);

    addLog(`▶️ Starting ingestion from ${current.toISOString().split('T')[0]} to ${endDate}`);

    while (isRunningRef.current && current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      currentDateRef.current = dateStr;

      try {
        const { data, error } = await supabase.functions.invoke('sportmonks-ingest', {
          body: { startDate: dateStr, mode: 'single_date' },
        });

        if (error) throw error;

        if (data.processed > 0) {
          addLog(`✅ ${dateStr}: ${data.processed} fixtures (${data.skipped || 0} skipped)`);
          setRawCount(prev => prev + data.processed);
        }

        if (data.errors > 0) setErrors(prev => prev + data.errors);
      } catch (err) {
        addLog(`❌ ${dateStr}: ${err instanceof Error ? err.message : 'Error'}`);
        setErrors(prev => prev + 1);
      }

      current.setDate(current.getDate() + 1);
      // Small delay to avoid overwhelming the API
      await new Promise(r => setTimeout(r, 200));
    }

    if (isRunningRef.current) addLog('🎉 Ingestion complete!');
    else addLog('⏸️ Ingestion paused');
    isRunningRef.current = false;
    setIsRunning(false);
  }, [startDate, endDate, addLog]);

  // ===== COMPUTE PHASE =====
  const startCompute = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);
    setPhase('compute');
    addLog('▶️ Starting L10 feature computation...');

    while (isRunningRef.current) {
      try {
        const { data, error } = await supabase.functions.invoke('sportmonks-compute-features', {
          body: { batchSize: 200, startOffset: computeOffsetRef.current },
        });

        if (error) throw error;

        if (data.processed > 0) {
          computeOffsetRef.current = data.nextOffset;
          setFeaturesCount(prev => prev + data.processed);
          addLog(`✅ Computed features for ${data.processed} fixtures (offset: ${data.nextOffset})`);
        }

        if (data.errors > 0) setErrors(prev => prev + data.errors);
        if (!data.hasMore) {
          addLog('🎉 All features computed!');
          break;
        }
      } catch (err) {
        addLog(`❌ Compute error: ${err instanceof Error ? err.message : 'Error'}`);
        setErrors(prev => prev + 1);
        await new Promise(r => setTimeout(r, 2000));
      }

      await new Promise(r => setTimeout(r, 100));
    }

    isRunningRef.current = false;
    setIsRunning(false);
  }, [addLog]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚽ SportMonks ML Data Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{rawCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Raw Matches</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{featuresCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">ML Features</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-destructive">{errors}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{phase === 'ingest' ? '📥' : '🧠'}</p>
                <p className="text-sm text-muted-foreground">{phase === 'ingest' ? 'Ingesting' : 'Computing'}</p>
              </div>
            </div>

            {/* Date range config */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={isRunning} />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={isRunning} />
              </div>
            </div>

            {/* Progress */}
            {isRunning && phase === 'ingest' && currentDateRef.current && (
              <p className="text-sm text-muted-foreground text-center">
                Currently processing: <strong>{currentDateRef.current}</strong>
              </p>
            )}

            {/* Controls */}
            <div className="flex gap-4 justify-center flex-wrap">
              {!isRunning ? (
                <>
                  <Button onClick={startIngest} size="lg" className="gap-2">
                    <Database className="h-5 w-5" />
                    1. Ingest Matches
                  </Button>
                  <Button onClick={startCompute} size="lg" variant="secondary" className="gap-2">
                    <Cpu className="h-5 w-5" />
                    2. Compute L10 Features
                  </Button>
                </>
              ) : (
                <Button onClick={stop} variant="destructive" size="lg" className="gap-2">
                  <Pause className="h-5 w-5" />
                  Pause
                </Button>
              )}
              <Button onClick={fetchCounts} variant="outline" size="lg" className="gap-2">
                <RefreshCw className="h-5 w-5" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Processing Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm h-72 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Ready. Click "Ingest Matches" to start backfill...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={log.includes('❌') ? 'text-destructive' : log.includes('✅') ? 'text-primary' : 'text-foreground'}>{log}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
