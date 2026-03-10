#!/usr/bin/env node

/**
 * Test Script for API-Football Integration
 * Run this to verify your API key works and see sample data
 * 
 * Usage: node scripts/testApi.js
 */

const API_BASE_URL = 'https://v3.football.api-sports.io';

// Get API key from environment or prompt
const API_KEY = process.env.VITE_API_FOOTBALL_KEY || process.argv[2];

if (!API_KEY) {
  console.error('❌ Error: No API key provided!');
  console.log('\nUsage:');
  console.log('  node scripts/testApi.js YOUR_API_KEY');
  console.log('  OR set VITE_API_FOOTBALL_KEY in .env file');
  process.exit(1);
}

async function testApiConnection() {
  console.log('🔍 Testing API-Football connection...\n');

  try {
    // Test 1: Check API status
    console.log('Test 1: Checking API status...');
    const statusResponse = await fetch(`${API_BASE_URL}/status`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`API returned ${statusResponse.status}: ${statusResponse.statusText}`);
    }

    const statusData = await statusResponse.json();
    console.log('✅ API Status:', statusData.response);
    console.log(`   Requests today: ${statusData.response.requests.current}/${statusData.response.requests.limit_day}`);
    console.log('');

    // Test 2: Fetch Premier League teams
    console.log('Test 2: Fetching Premier League teams...');
    const teamsResponse = await fetch(`${API_BASE_URL}/teams?league=39&season=2024`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    const teamsData = await teamsResponse.json();
    console.log(`✅ Found ${teamsData.results} teams`);
    console.log('   Sample teams:');
    teamsData.response.slice(0, 5).forEach(item => {
      console.log(`   - ${item.team.name}`);
    });
    console.log('');

    // Test 3: Fetch recent fixtures for a team
    console.log('Test 3: Fetching recent fixtures for Manchester City...');
    const fixturesResponse = await fetch(`${API_BASE_URL}/fixtures?team=50&season=2024&last=5`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    const fixturesData = await fixturesResponse.json();
    console.log(`✅ Found ${fixturesData.results} recent fixtures`);
    console.log('   Recent matches:');
    fixturesData.response.forEach(fixture => {
      const home = fixture.teams.home.name;
      const away = fixture.teams.away.name;
      const score = `${fixture.goals.home}-${fixture.goals.away}`;
      console.log(`   - ${home} ${score} ${away}`);
    });
    console.log('');

    // Test 4: Fetch fixture statistics
    if (fixturesData.results > 0) {
      const fixtureId = fixturesData.response[0].fixture.id;
      console.log(`Test 4: Fetching statistics for fixture ${fixtureId}...`);
      
      const statsResponse = await fetch(`${API_BASE_URL}/fixtures/statistics?fixture=${fixtureId}`, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
      });

      const statsData = await statsResponse.json();
      if (statsData.results > 0) {
        console.log('✅ Statistics retrieved:');
        statsData.response.forEach(teamStats => {
          console.log(`   ${teamStats.team.name}:`);
          const corners = teamStats.statistics.find(s => s.type === 'Corner Kicks');
          const yellowCards = teamStats.statistics.find(s => s.type === 'Yellow Cards');
          const redCards = teamStats.statistics.find(s => s.type === 'Red Cards');
          console.log(`     Corners: ${corners?.value || 0}`);
          console.log(`     Yellow Cards: ${yellowCards?.value || 0}`);
          console.log(`     Red Cards: ${redCards?.value || 0}`);
        });
      }
    }

    console.log('\n✅ All tests passed! Your API key is working correctly.');
    console.log('\n📊 You can now use the app with real-time data!');
    console.log('   Run: npm run dev');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nPossible issues:');
    console.log('1. Invalid API key');
    console.log('2. API rate limit exceeded');
    console.log('3. Network connection issues');
    console.log('\nCheck your API key at: https://api-sports.io/');
    process.exit(1);
  }
}

// Run tests
testApiConnection();
