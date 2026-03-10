/**
 * CLI Script to run data aggregation
 * 
 * Usage:
 *   npm run aggregate        - Run full aggregation
 *   npm run aggregate:status - Check aggregation status
 */

import { aggregateAllData, getAggregationStatus } from '../services/dataAggregator';
import { closeDatabaseConnection } from '../services/database';

const command = process.argv[2] || 'run';

async function main() {
  try {
    if (command === 'status') {
      console.log('📊 Checking aggregation status...\n');
      const status = await getAggregationStatus();
      
      console.log('Status:', status.status);
      console.log('Last Update:', status.last_update || 'Never');
      console.log('Total Teams:', status.total_teams);
      console.log('Total Stats:', status.total_stats);
      console.log('Today\'s Fixtures:', status.todays_fixtures);
      
      if (status.error_message) {
        console.log('\n❌ Last Error:', status.error_message);
      }
      
    } else {
      console.log('🚀 Starting data aggregation...\n');
      console.log('This will:');
      console.log('  1. Update 80+ leagues');
      console.log('  2. Fetch 1,500+ teams');
      console.log('  3. Calculate stats for each team (last 20 games)');
      console.log('  4. Fetch today\'s fixtures');
      console.log('\n⏱️  Estimated time: 30-60 minutes\n');
      console.log('Press Ctrl+C to cancel...\n');
      
      // Wait 5 seconds before starting
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await aggregateAllData();
      
      console.log('\n✅ Aggregation complete!');
      console.log('\nYou can now query the data using the stats API.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
    process.exit(0);
  }
}

main();
