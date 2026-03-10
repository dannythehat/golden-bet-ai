/**
 * Script to collect statistics and store in Supabase
 * Run with: node scripts/collectStats.js
 */

import { fetchAndStoreStats } from '../src/services/statsCollector.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for write access
);

async function main() {
  console.log('🚀 Starting statistics collection...\n');

  try {
    // Fetch all stats from API-Football
    const allStats = await fetchAndStoreStats();

    console.log(`\n📊 Collected ${allStats.length} teams`);
    console.log('💾 Storing in Supabase...');

    // Upsert all stats (insert or update if exists)
    const { data, error } = await supabase
      .from('team_stats')
      .upsert(allStats, { onConflict: 'team_id' });

    if (error) {
      console.error('❌ Error storing data:', error);
      process.exit(1);
    }

    console.log('✅ Successfully stored all statistics!');
    console.log(`\n📈 Summary:`);
    console.log(`   Total teams: ${allStats.length}`);
    
    // Show top 5 for each category
    const top5Goals = allStats
      .sort((a, b) => b.over_2_5_goals_pct - a.over_2_5_goals_pct)
      .slice(0, 5);
    
    console.log(`\n🎯 Top 5 Over 2.5 Goals:`);
    top5Goals.forEach((team, i) => {
      console.log(`   ${i + 1}. ${team.team_name} (${team.league}) - ${team.over_2_5_goals_pct}%`);
    });

    const top5Corners = allStats
      .sort((a, b) => b.over_9_5_corners_pct - a.over_9_5_corners_pct)
      .slice(0, 5);
    
    console.log(`\n🚩 Top 5 Over 9.5 Corners:`);
    top5Corners.forEach((team, i) => {
      console.log(`   ${i + 1}. ${team.team_name} (${team.league}) - ${team.over_9_5_corners_pct}%`);
    });

    console.log('\n✅ Done! Your app is now ready to use.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
