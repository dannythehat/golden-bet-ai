/**
 * Test endpoint to verify environment variables are working
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const apiKey = process.env.VITE_API_FOOTBALL_KEY;
  const cronSecret = process.env.CRON_SECRET;
  
  return res.status(200).json({
    status: 'Environment Check',
    mongodb: mongoUri ? '✅ Set' : '❌ Missing',
    apiKey: apiKey ? '✅ Set' : '❌ Missing',
    cronSecret: cronSecret ? '✅ Set' : '❌ Missing',
    // Show first 10 chars to verify
    mongoPreview: mongoUri ? mongoUri.substring(0, 20) + '...' : null,
    apiKeyPreview: apiKey ? apiKey.substring(0, 10) + '...' : null,
  });
}
