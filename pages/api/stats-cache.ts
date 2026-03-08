/**
 * Vercel Serverless Function - Get Cached Stats
 * Returns cached stats data from Vercel KV with 24-hour refresh cycle
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

const CACHE_KEY = 'football-stats-cache';

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
    // Get cached data from Vercel KV
    const cachedData = await kv.get(CACHE_KEY);
    
    if (!cachedData) {
      console.error('❌ Cache not found in Vercel KV');
      return res.status(404).json({
        error: 'Cache not initialized',
        message: 'Stats cache has not been generated yet. Please trigger the cron job manually or wait for the next 4 AM refresh.',
        hint: 'Call /api/cron/refresh-stats with proper authorization to generate cache',
      });
    }

    const data = cachedData as any;
    
    // Check if cache is still valid (less than 24 hours old)
    const cacheAge = Date.now() - data.timestamp;
    const hoursOld = (cacheAge / 1000 / 60 / 60).toFixed(1);
    
    console.log(`📦 Serving cached data (${hoursOld} hours old)`);
    
    return res.status(200).json({
      success: true,
      data: {
        goals: data.goals,
        corners: data.corners,
        cards: data.cards,
        btts: data.btts,
      },
      meta: {
        cached: true,
        lastRefresh: new Date(data.timestamp).toISOString(),
        nextRefresh: data.nextRefresh,
        cacheAge: `${hoursOld} hours`,
      },
    });
  } catch (error) {
    console.error('❌ Error reading cache:', error);
    return res.status(500).json({
      error: 'Failed to read cache',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
