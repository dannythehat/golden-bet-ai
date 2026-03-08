/**
 * Admin Dashboard - Trigger Data Aggregation
 * Access at: /api/admin/dashboard
 */

export default function handler(req, res) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Admin Dashboard - Data Aggregation</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #0a0a0a;
      color: #fff;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    button {
      background: #d4af37;
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 16px;
      margin: 10px 10px 10px 0;
    }
    button:hover {
      background: #f0c040;
    }
    button:disabled {
      background: #666;
      cursor: not-allowed;
    }
    .status {
      background: #2a2a2a;
      padding: 15px;
      border-radius: 6px;
      margin: 10px 0;
      font-family: monospace;
    }
    .success { color: #4ade80; }
    .error { color: #f87171; }
    .warning { color: #fbbf24; }
    .info { color: #60a5fa; }
    h1 { color: #d4af37; }
    h2 { color: #f0c040; }
  </style>
</head>
<body>
  <h1>⚽ Golden Bet AI - Admin Dashboard</h1>
  
  <div class="card">
    <h2>📊 Database Status</h2>
    <div id="status" class="status">Loading...</div>
    <button onclick="checkStatus()">Refresh Status</button>
  </div>
  
  <div class="card">
    <h2>🚀 Data Aggregation</h2>
    <p>This will fetch data from API-Football and populate MongoDB with:</p>
    <ul>
      <li>80+ major leagues worldwide</li>
      <li>1,500+ teams</li>
      <li>Stats for last 20 games per team</li>
      <li>Today's fixtures</li>
    </ul>
    <p class="warning">⚠️ First run takes 30-60 minutes. Daily updates are faster (5-10 min).</p>
    <button id="aggregateBtn" onclick="startAggregation()">Start Aggregation</button>
    <div id="aggregateStatus" class="status" style="display:none;"></div>
  </div>
  
  <div class="card">
    <h2>🧪 Test MongoDB Connection</h2>
    <button onclick="testConnection()">Test Connection</button>
    <div id="testStatus" class="status" style="display:none;"></div>
  </div>

  <script>
    async function checkStatus() {
      const statusDiv = document.getElementById('status');
      statusDiv.innerHTML = 'Loading...';
      
      try {
        const res = await fetch('/api/aggregate');
        const data = await res.json();
        
        statusDiv.innerHTML = \`
          <div class="success">✅ Status: \${data.status || 'Unknown'}</div>
          <div class="info">📅 Last Update: \${data.last_update ? new Date(data.last_update).toLocaleString() : 'Never'}</div>
          <div class="info">👥 Total Teams: \${data.total_teams || 0}</div>
          <div class="info">📊 Total Stats: \${data.total_stats || 0}</div>
          <div class="info">⚽ Today's Fixtures: \${data.todays_fixtures || 0}</div>
          \${data.error_message ? \`<div class="error">❌ Error: \${data.error_message}</div>\` : ''}
        \`;
      } catch (error) {
        statusDiv.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
      }
    }
    
    async function startAggregation() {
      const btn = document.getElementById('aggregateBtn');
      const statusDiv = document.getElementById('aggregateStatus');
      
      btn.disabled = true;
      btn.textContent = 'Starting...';
      statusDiv.style.display = 'block';
      statusDiv.innerHTML = '<div class="info">🚀 Starting aggregation...</div>';
      
      try {
        const res = await fetch('/api/aggregate', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          statusDiv.innerHTML = \`
            <div class="success">✅ \${data.message}</div>
            <div class="info">⏱️ This will take 30-60 minutes for first run.</div>
            <div class="info">💡 Refresh status above to check progress.</div>
          \`;
        } else {
          statusDiv.innerHTML = \`<div class="error">❌ Error: \${data.error || 'Unknown error'}</div>\`;
        }
      } catch (error) {
        statusDiv.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Start Aggregation';
      }
    }
    
    async function testConnection() {
      const statusDiv = document.getElementById('testStatus');
      statusDiv.style.display = 'block';
      statusDiv.innerHTML = '<div class="info">Testing connection...</div>';
      
      try {
        const res = await fetch('/api/test-db');
        const data = await res.json();
        
        if (data.success) {
          statusDiv.innerHTML = \`
            <div class="success">✅ \${data.message}</div>
            <div class="info">📦 Database: \${data.database}</div>
            <div class="info">📋 Collections: \${data.collections.join(', ') || 'None yet'}</div>
            <div class="info">📊 Document Counts: \${JSON.stringify(data.document_counts, null, 2)}</div>
          \`;
        } else {
          statusDiv.innerHTML = \`<div class="error">❌ Error: \${data.error}</div>\`;
        }
      } catch (error) {
        statusDiv.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
      }
    }
    
    // Load status on page load
    checkStatus();
  </script>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
