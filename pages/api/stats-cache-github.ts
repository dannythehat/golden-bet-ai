/**
 * Simple Cache Storage using GitHub Repository
 * Stores cache as a JSON file in the repo
 * No Vercel KV needed - works out of the box!
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'dannythehat';
const REPO_NAME = 'golden-bet-ai';
const CACHE_FILE_PATH = 'cache/stats-cache.json';

async function getCacheFromGitHub() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CACHE_FILE_PATH}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null; // Cache doesn't exist yet
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return JSON.parse(content);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cachedData = await getCacheFromGitHub();
    
    if (!cachedData) {
      return res.status(404).json({
        error: 'Cache not initialized',
        message: 'Stats cache has not been generated yet. Please trigger the cron job.',
        hint: 'Call /api/cron/refresh-stats with proper authorization',
      });
    }

    const cacheAge = Date.now() - cachedData.timestamp;
    const hoursOld = (cacheAge / 1000 / 60 / 60).toFixed(1);
    
    console.log(`📦 Serving cached data (${hoursOld} hours old)`);
    
    return res.status(200).json({
      success: true,
      data: {
        goals: cachedData.goals,
        corners: cachedData.corners,
        cards: cachedData.cards,
        btts: cachedData.btts,
      },
      meta: {
        cached: true,
        lastRefresh: new Date(cachedData.timestamp).toISOString(),
        nextRefresh: cachedData.nextRefresh,
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
