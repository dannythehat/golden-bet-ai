/**
 * Simple API endpoint to trigger data aggregation
 * Deploy this to Vercel and call it to populate your database
 * 
 * Usage: POST /api/aggregate
 */

import { aggregateAllData, getAggregationStatus } from '../../src/services/dataAggregator';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method === 'POST') {
    try {
      console.log('🚀 Starting data aggregation via API...');
      
      // Run aggregation in background (don't wait for completion)
      aggregateAllData()
        .then(() => {
          console.log('✅ Aggregation completed successfully');
        })
        .catch((error) => {
          console.error('❌ Aggregation failed:', error);
        });
      
      // Return immediately
      res.status(202).json({
        success: true,
        message: 'Aggregation started in background. Check /api/aggregate/status for progress.',
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } 
  
  // GET request - return status
  else if (req.method === 'GET') {
    try {
      const status = await getAggregationStatus();
      res.status(200).json(status);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
  
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Increase timeout for Vercel (max 60 seconds for hobby plan)
export const config = {
  maxDuration: 60,
};
