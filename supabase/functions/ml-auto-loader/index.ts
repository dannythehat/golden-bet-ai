import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'process'; // 'process', 'status', 'start', 'stop'

    // Check/manage loader state in a simple key-value approach using ml_models table metadata
    // We'll use a special "loader_state" record
    const { data: stateRecord } = await supabase
      .from('ml_models')
      .select('*')
      .eq('market', '__loader_state__')
      .single();

    const loaderState = stateRecord?.weights as { enabled: boolean; lastOffset: number; lastRun: string } | null;

    if (action === 'status') {
      const { count: v2Count } = await supabase
        .from('ml_training_data_v2')
        .select('*', { count: 'exact', head: true });

      const { count: totalCount } = await supabase
        .from('ml_training_data')
        .select('*', { count: 'exact', head: true });

      return new Response(JSON.stringify({
        success: true,
        enabled: loaderState?.enabled ?? false,
        processed: v2Count || 0,
        total: totalCount || 0,
        progress: totalCount ? Math.round(((v2Count || 0) / totalCount) * 100) : 0,
        lastRun: loaderState?.lastRun || null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'start') {
      // Enable the loader
      const newState = { enabled: true, lastOffset: loaderState?.lastOffset || 0, lastRun: new Date().toISOString() };
      
      if (stateRecord) {
        await supabase.from('ml_models').update({ weights: newState }).eq('market', '__loader_state__');
      } else {
        await supabase.from('ml_models').insert({
          market: '__loader_state__',
          weights: newState,
          feature_names: [],
          features_used: 0,
          training_samples: 0,
          test_samples: 0,
          is_active: false,
        });
      }

      console.log('🚀 Auto-loader ENABLED');
      return new Response(JSON.stringify({ success: true, message: 'Auto-loader started' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'stop') {
      if (stateRecord) {
        const newState = { ...loaderState, enabled: false };
        await supabase.from('ml_models').update({ weights: newState }).eq('market', '__loader_state__');
      }
      console.log('⏹️ Auto-loader DISABLED');
      return new Response(JSON.stringify({ success: true, message: 'Auto-loader stopped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: process a batch
    if (!loaderState?.enabled) {
      console.log('⏸️ Auto-loader is disabled, skipping');
      return new Response(JSON.stringify({ success: true, message: 'Loader disabled, skipping' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current progress
    const { count: currentV2Count } = await supabase
      .from('ml_training_data_v2')
      .select('*', { count: 'exact', head: true });

    const { count: totalRecords } = await supabase
      .from('ml_training_data')
      .select('*', { count: 'exact', head: true });

    const offset = currentV2Count || 0;

    if (offset >= (totalRecords || 0)) {
      // All done!
      const newState = { enabled: false, lastOffset: offset, lastRun: new Date().toISOString() };
      await supabase.from('ml_models').update({ weights: newState }).eq('market', '__loader_state__');
      
      console.log('🎉 All records processed! Auto-loader disabled.');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All records processed!',
        processed: offset,
        total: totalRecords,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call ml-compute-features to process a batch
    const batchSize = 500;
    console.log(`📊 Processing batch: offset=${offset}, size=${batchSize}`);

    const { data, error } = await supabase.functions.invoke('ml-compute-features', {
      body: { batchSize, startOffset: offset }
    });

    if (error) {
      console.error('❌ Batch error:', error.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        offset,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    // Update state
    const newState = { 
      enabled: true, 
      lastOffset: data.nextOffset || offset + batchSize, 
      lastRun: new Date().toISOString() 
    };
    await supabase.from('ml_models').update({ weights: newState }).eq('market', '__loader_state__');

    const progress = Math.round(((data.nextOffset || offset) / (totalRecords || 1)) * 100);
    console.log(`✅ Batch complete: ${data.processed} records, progress=${progress}%`);

    return new Response(JSON.stringify({
      success: true,
      processed: data.processed,
      errors: data.errors,
      nextOffset: data.nextOffset,
      progress,
      hasMore: data.hasMore,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Auto-loader error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
