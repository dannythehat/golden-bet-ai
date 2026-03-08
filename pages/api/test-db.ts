/**
 * Test MongoDB connection
 * 
 * Usage: GET /api/test-db
 */

import { connectToDatabase, getDatabase, COLLECTIONS } from '../../src/services/database';

export default async function handler(req, res) {
  try {
    console.log('🔌 Testing MongoDB connection...');
    
    // Try to connect
    const db = await connectToDatabase();
    
    // Try to list collections
    const collections = await db.listCollections().toArray();
    
    // Try to count documents in each collection
    const counts = {};
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      counts[collection.name] = count;
    }
    
    res.status(200).json({
      success: true,
      message: 'MongoDB connection successful',
      database: 'betting-stats',
      collections: collections.map(c => c.name),
      document_counts: counts,
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
