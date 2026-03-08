import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.6/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BetProofRequest {
  betType: 'golden_bet' | 'acca' | 'bet_builder';
  betId: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  market?: string;
  markets?: string[];
  confidence?: number;
  gafferReasoning?: string;
  kickoff?: string;
  odds?: number;
  selections?: Array<{
    teamName: string;
    market: string;
    confidence: number;
  }>;
}

// Market label formatting
const marketLabels: Record<string, string> = {
  'over_2.5_goals': 'Over 2.5 Goals',
  'over_2_5_goals': 'Over 2.5 Goals',
  'btts': 'BTTS Yes',
  'over_9.5_corners': 'Over 9.5 Corners',
  'over_9_5_corners': 'Over 9.5 Corners',
  'over_8_5_corners': 'Over 8.5 Corners',
  'over_3.5_cards': 'Over 3.5 Cards',
  'over_3_5_cards': 'Over 3.5 Cards',
  'over_2_5_cards': 'Over 2.5 Cards',
  'over_25_goals': 'Over 2.5 Goals',
  'over_85_corners': 'Over 8.5 Corners',
  'over_25_cards': 'Over 2.5 Cards',
};

function formatMarket(market: string): string {
  return marketLabels[market] || market.replace(/_/g, ' ').replace(/(\d)(\d)/g, '$1.$2');
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

// Generate Golden Bet proof image
function GoldenBetProof({ 
  homeTeam, 
  awayTeam, 
  league, 
  market, 
  confidence, 
  gafferReasoning,
  kickoff,
  odds,
  generatedAt 
}: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  confidence: number;
  gafferReasoning: string;
  kickoff: string;
  odds: number;
  generatedAt: string;
}) {
  return React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '600px',
        height: '400px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
        borderRadius: '16px',
        position: 'relative',
      },
    },
    // Header with timestamp
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          },
        },
        React.createElement('span', { style: { fontSize: '24px' } }, '🏆'),
        React.createElement(
          'span',
          { style: { fontSize: '18px', fontWeight: 'bold', color: '#ffd700' } },
          'GOLDEN BET'
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            fontSize: '11px',
            color: '#a0aec0',
          },
        },
        React.createElement('span', null, `Generated: ${formatDateTime(generatedAt)}`),
        React.createElement('span', null, `Kickoff: ${formatDateTime(kickoff)}`)
      )
    ),
    // Match info
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            fontSize: '22px',
            fontWeight: 'bold',
            marginBottom: '8px',
            textAlign: 'center',
          },
        },
        `${homeTeam} vs ${awayTeam}`
      ),
      React.createElement(
        'div',
        {
          style: {
            fontSize: '14px',
            color: '#a0aec0',
            textAlign: 'center',
          },
        },
        league
      )
    ),
    // Market & Odds
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            flex: 1,
            marginRight: '8px',
          },
        },
        React.createElement(
          'span',
          { style: { fontSize: '12px', color: '#86efac', marginBottom: '4px' } },
          'MARKET'
        ),
        React.createElement(
          'span',
          { style: { fontSize: '16px', fontWeight: 'bold' } },
          formatMarket(market)
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            alignItems: 'center',
          },
        },
        React.createElement(
          'span',
          { style: { fontSize: '12px', color: '#93c5fd', marginBottom: '4px' } },
          'CONFIDENCE'
        ),
        React.createElement(
          'span',
          { style: { fontSize: '20px', fontWeight: 'bold', color: '#60a5fa' } },
          `${Math.round(confidence)}%`
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(251, 191, 36, 0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginLeft: '8px',
            alignItems: 'center',
          },
        },
        React.createElement(
          'span',
          { style: { fontSize: '12px', color: '#fcd34d', marginBottom: '4px' } },
          'ODDS'
        ),
        React.createElement(
          'span',
          { style: { fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' } },
          odds?.toFixed(2) || 'N/A'
        )
      )
    ),
    // Gaffer Reasoning
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flex: 1,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '12px',
          overflow: 'hidden',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
          },
        },
        React.createElement('span', { style: { fontSize: '11px', color: '#a0aec0', marginBottom: '4px' } }, 'THE GAFFER SAYS:'),
        React.createElement(
          'span',
          { style: { fontSize: '13px', fontStyle: 'italic', lineHeight: '1.4' } },
          `"${gafferReasoning?.slice(0, 180) || 'Analysis coming soon...'}${(gafferReasoning?.length || 0) > 180 ? '...' : ''}"`
        )
      )
    ),
    // Verification watermark
    React.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          fontSize: '9px',
          color: 'rgba(255, 255, 255, 0.3)',
        },
      },
      'Footy Oracle • Verified Prediction'
    )
  );
}

// Generate ACCA proof image
function AccaProof({ 
  selections, 
  combinedOdds, 
  avgConfidence,
  gafferReasoning,
  generatedAt 
}: {
  selections: Array<{ teamName: string; market: string; confidence: number }>;
  combinedOdds: number;
  avgConfidence: number;
  gafferReasoning: string;
  generatedAt: string;
}) {
  return React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '600px',
        height: '500px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 50%, #4a1d6b 100%)',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
        borderRadius: '16px',
        position: 'relative',
      },
    },
    // Header
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement('span', { style: { fontSize: '24px' } }, '🎯'),
        React.createElement('span', { style: { fontSize: '18px', fontWeight: 'bold', color: '#c084fc' } }, 'ACCA DELIGHT')
      ),
      React.createElement(
        'span',
        { style: { fontSize: '11px', color: '#a0aec0' } },
        `Generated: ${formatDateTime(generatedAt)}`
      )
    ),
    // Selections
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '16px',
        },
      },
      ...selections.slice(0, 5).map((sel, i) =>
        React.createElement(
          'div',
          {
            key: i,
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '10px 14px',
            },
          },
          React.createElement('span', { style: { fontSize: '14px', fontWeight: '500' } }, sel.teamName),
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
            React.createElement('span', { style: { fontSize: '12px', color: '#a0aec0' } }, formatMarket(sel.market)),
            React.createElement('span', { style: { fontSize: '14px', fontWeight: 'bold', color: '#60a5fa' } }, `${Math.round(sel.confidence)}%`)
          )
        )
      )
    ),
    // Stats row
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-around',
          background: 'rgba(192, 132, 252, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '12px', color: '#e9d5ff' } }, 'LEGS'),
        React.createElement('span', { style: { fontSize: '24px', fontWeight: 'bold' } }, selections.length)
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '12px', color: '#e9d5ff' } }, 'COMBINED ODDS'),
        React.createElement('span', { style: { fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' } }, combinedOdds?.toFixed(2) || 'N/A')
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '12px', color: '#e9d5ff' } }, 'AVG CONFIDENCE'),
        React.createElement('span', { style: { fontSize: '24px', fontWeight: 'bold', color: '#60a5fa' } }, `${Math.round(avgConfidence)}%`)
      )
    ),
    // Gaffer
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flex: 1,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '12px',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        React.createElement('span', { style: { fontSize: '11px', color: '#a0aec0', marginBottom: '4px' } }, 'THE GAFFER SAYS:'),
        React.createElement('span', { style: { fontSize: '13px', fontStyle: 'italic' } }, `"${gafferReasoning?.slice(0, 150) || 'Trust the process!'}..."`)
      )
    ),
    React.createElement(
      'div',
      { style: { position: 'absolute', bottom: '8px', right: '12px', fontSize: '9px', color: 'rgba(255, 255, 255, 0.3)' } },
      'Footy Oracle • Verified Prediction'
    )
  );
}

// Generate Bet Builder proof image
function BetBuilderProof({ 
  homeTeam, 
  awayTeam, 
  league, 
  markets, 
  combinedOdds, 
  avgConfidence,
  gafferReasoning,
  kickoff,
  generatedAt 
}: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  markets: string[];
  combinedOdds: number;
  avgConfidence: number;
  gafferReasoning: string;
  kickoff: string;
  generatedAt: string;
}) {
  return React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '600px',
        height: '450px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #1e3a5f 50%, #0d4a3f 100%)',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
        borderRadius: '16px',
        position: 'relative',
      },
    },
    // Header
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement('span', { style: { fontSize: '24px' } }, '🔧'),
        React.createElement('span', { style: { fontSize: '18px', fontWeight: 'bold', color: '#34d399' } }, 'BET BUILDER')
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px', color: '#a0aec0' } },
        React.createElement('span', null, `Generated: ${formatDateTime(generatedAt)}`),
        React.createElement('span', null, `Kickoff: ${formatDateTime(kickoff)}`)
      )
    ),
    // Match
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          textAlign: 'center',
        },
      },
      React.createElement('div', { style: { fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' } }, `${homeTeam} vs ${awayTeam}`),
      React.createElement('div', { style: { fontSize: '13px', color: '#a0aec0' } }, league)
    ),
    // Markets
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '16px',
        },
      },
      ...markets.map((m, i) =>
        React.createElement(
          'div',
          {
            key: i,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(52, 211, 153, 0.15)',
              borderRadius: '8px',
              padding: '10px 14px',
            },
          },
          React.createElement('span', { style: { fontSize: '16px' } }, '✓'),
          React.createElement('span', { style: { fontSize: '14px' } }, formatMarket(m))
        )
      )
    ),
    // Stats
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-around',
          background: 'rgba(52, 211, 153, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '12px', color: '#a7f3d0' } }, 'LEGS'),
        React.createElement('span', { style: { fontSize: '24px', fontWeight: 'bold' } }, markets.length)
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '12px', color: '#a7f3d0' } }, 'COMBINED ODDS'),
        React.createElement('span', { style: { fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' } }, combinedOdds?.toFixed(2) || 'N/A')
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '12px', color: '#a7f3d0' } }, 'AVG CONFIDENCE'),
        React.createElement('span', { style: { fontSize: '24px', fontWeight: 'bold', color: '#60a5fa' } }, `${Math.round(avgConfidence)}%`)
      )
    ),
    // Gaffer
    React.createElement(
      'div',
      {
        style: { display: 'flex', flex: 1, background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '12px' },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        React.createElement('span', { style: { fontSize: '11px', color: '#a0aec0', marginBottom: '4px' } }, 'THE GAFFER SAYS:'),
        React.createElement('span', { style: { fontSize: '13px', fontStyle: 'italic' } }, `"${gafferReasoning?.slice(0, 140) || 'Let\'s build this winner!'}..."`)
      )
    ),
    React.createElement(
      'div',
      { style: { position: 'absolute', bottom: '8px', right: '12px', fontSize: '9px', color: 'rgba(255, 255, 255, 0.3)' } },
      'Footy Oracle • Verified Prediction'
    )
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: BetProofRequest = await req.json();
    const { betType, betId } = body;
    const generatedAt = new Date().toISOString();

    console.log(`📸 Capturing proof for ${betType}: ${betId}`);

    let imageResponse: ImageResponse;
    let width = 600;
    let height = 400;

    if (betType === 'golden_bet') {
      imageResponse = new ImageResponse(
        GoldenBetProof({
          homeTeam: body.homeTeam || 'Home',
          awayTeam: body.awayTeam || 'Away',
          league: body.league || 'League',
          market: body.market || 'over_2.5_goals',
          confidence: body.confidence || 0,
          gafferReasoning: body.gafferReasoning || '',
          kickoff: body.kickoff || generatedAt,
          odds: body.odds || 0,
          generatedAt,
        }),
        { width, height }
      );
    } else if (betType === 'acca') {
      height = 500;
      imageResponse = new ImageResponse(
        AccaProof({
          selections: body.selections || [],
          combinedOdds: body.odds || 0,
          avgConfidence: body.confidence || 0,
          gafferReasoning: body.gafferReasoning || '',
          generatedAt,
        }),
        { width, height }
      );
    } else if (betType === 'bet_builder') {
      height = 450;
      imageResponse = new ImageResponse(
        BetBuilderProof({
          homeTeam: body.homeTeam || 'Home',
          awayTeam: body.awayTeam || 'Away',
          league: body.league || 'League',
          markets: body.markets || [],
          combinedOdds: body.odds || 0,
          avgConfidence: body.confidence || 0,
          gafferReasoning: body.gafferReasoning || '',
          kickoff: body.kickoff || generatedAt,
          generatedAt,
        }),
        { width, height }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid betType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the image as ArrayBuffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageData = new Uint8Array(imageBuffer);

    // Generate filename with timestamp
    const timestamp = generatedAt.replace(/[:.]/g, '-');
    const filename = `${betType}/${betId}_${timestamp}.png`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bet-proofs')
      .upload(filename, imageData, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload screenshot', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('bet-proofs')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;
    console.log(`✅ Proof captured: ${publicUrl}`);

    // Update the bet record with the proof URL
    let updateTable: string;
    if (betType === 'golden_bet') {
      updateTable = 'golden_bet_history';
    } else if (betType === 'acca') {
      updateTable = 'acca_history';
    } else {
      updateTable = 'bet_builder_history';
    }

    const { error: updateError } = await supabase
      .from(updateTable)
      .update({
        proof_screenshot_url: publicUrl,
        proof_captured_at: generatedAt,
      })
      .eq('id', betId);

    if (updateError) {
      console.warn('⚠️ Failed to update bet record:', updateError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        proofUrl: publicUrl,
        capturedAt: generatedAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Proof capture error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
