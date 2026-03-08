/**
 * Vercel Serverless Function: Incremental Bootstrap
 * Processes 50 teams per run, auto-resumes from where it left off
 * Runs every 6 hours via Vercel Cron
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const startTime = Date.now();
    
    // Import the incremental bootstrap logic
    const { incrementalBootstrap } = await import('../../scripts/incrementalBootstrap.js');
    
    // Run bootstrap
    const result = await incrementalBootstrap();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    return res.status(200).json({
      success: true,
      duration: `${duration}s`,
      ...result
    });
    
  } catch (error: any) {
    console.error('Incremental bootstrap error:', error);
    return res.status(500).json({
      error: 'Bootstrap failed',
      message: error.message
    });
  }
}
