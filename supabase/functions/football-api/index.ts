import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    
    if (!API_KEY) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    
    if (!endpoint) {
      throw new Error('Missing endpoint parameter');
    }

    // Build query params for the API
    const params = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        params.append(key, value);
      }
    });

    const apiUrl = `${API_BASE_URL}${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
    
    console.log(`Fetching: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
