import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RefreshCw, CheckCircle } from 'lucide-react';

export default function MLDataLoader() {
  const [isRunning, setIsRunning] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalRecords] = useState(281666);
  const [v2Count, setV2Count] = useState(0);
  const [errors, setErrors] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Use refs for values that need to be current inside the async loop
  const offsetRef = useRef(0);
  const batchSizeRef = useRef(500);
  const isRunningRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const fetchCounts = useCallback(async () => {
    const { count: v2 } = await supabase
      .from('ml_training_data_v2')
      .select('*', { count: 'exact', head: true });
    
    if (v2 !== null) {
      setV2Count(v2);
      offsetRef.current = v2;
      setTotalProcessed(v2);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const processBatch = useCallback(async (): Promise<boolean> => {
    try {
      const currentOffset = offsetRef.current;
      const batchSize = batchSizeRef.current;
      
      const { data, error } = await supabase.functions.invoke('ml-compute-features', {
        body: { batchSize, startOffset: currentOffset }
      });

      if (error) throw error;

      if (data.processed > 0) {
        offsetRef.current = data.nextOffset;
        setTotalProcessed(data.nextOffset);
        addLog(`✅ Processed ${data.processed} records (offset: ${data.nextOffset})`);
      }

      if (data.errors > 0) {
        setErrors(prev => prev + data.errors);
      }

      return data.hasMore;
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setErrors(prev => prev + 1);

      // If the backend starts timing out, automatically back off
      const newSize = Math.max(50, Math.floor(batchSizeRef.current / 2));
      if (newSize !== batchSizeRef.current) {
        batchSizeRef.current = newSize;
        addLog(`⚠️ Reducing batch size to ${newSize} for stability`);
      }

      return true; // Continue trying
    }
  }, [addLog]);

  const startProcessing = useCallback(async () => {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    setIsRunning(true);
    addLog('▶️ Started processing...');

    while (isRunningRef.current) {
      const hasMore = await processBatch();
      
      if (!isRunningRef.current) {
        addLog('⏸️ Paused');
        break;
      }
      
      if (!hasMore) {
        addLog('🎉 All records processed!');
        isRunningRef.current = false;
        setIsRunning(false);
        break;
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [processBatch, addLog]);

  const stopProcessing = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
  }, []);

  const progress = Math.round((totalProcessed / totalRecords) * 100);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🧠 ML Training Data V2 Loader
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{v2Count.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">V2 Records</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{totalRecords.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Target</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{totalProcessed.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Current Offset</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-destructive">{errors}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-4" />
              <p className="text-sm text-muted-foreground text-center">
                {totalProcessed.toLocaleString()} / {totalRecords.toLocaleString()} records
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              {!isRunning ? (
                <Button onClick={startProcessing} size="lg" className="gap-2">
                  <Play className="h-5 w-5" />
                  Start Processing
                </Button>
              ) : (
                <Button
                  onClick={stopProcessing}
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                >
                  <Pause className="h-5 w-5" />
                  Pause
                </Button>
              )}
              <Button onClick={fetchCounts} variant="outline" size="lg" className="gap-2">
                <RefreshCw className="h-5 w-5" />
                Refresh Counts
              </Button>
            </div>

            {progress >= 100 && (
              <div className="flex items-center justify-center gap-2 text-primary text-lg font-semibold">
                <CheckCircle className="h-6 w-6" />
                All records processed!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Processing Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Click "Start Processing" to begin...</p>
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
