/**
 * Vercel Serverless Function - API-Football Proxy
 * Handles CORS and keeps API key secure on server-side
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY;
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, ...params } = req.query;

    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'Missing endpoint parameter' });
    }

    // Build query string from remaining params
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

    console.log(`🔄 Proxying request to: ${url}`);

    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        error: `API request failed: ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Check for API errors
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('❌ API returned errors:', data.errors);
      return res.status(400).json({
        error: 'API error',
        details: data.errors,
      });
    }

    console.log(`✅ Success: ${data.response?.length || 0} results`);

    // Return the API response
    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
