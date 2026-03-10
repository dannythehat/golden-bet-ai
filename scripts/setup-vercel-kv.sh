#!/bin/bash

# Automated Setup Script for Vercel KV and Daily Cache
# Run this script to set up everything automatically

set -e

echo "🚀 Starting Vercel KV and Daily Cache Setup..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

echo "✅ Vercel CLI ready"
echo ""

# Login to Vercel (if not already logged in)
echo "🔐 Checking Vercel authentication..."
vercel whoami || vercel login

echo ""
echo "📦 Step 1: Creating Vercel KV Database..."
echo "Please follow these steps manually:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Select your project: golden-bet-ai"
echo "3. Click 'Storage' tab"
echo "4. Click 'Create Database'"
echo "5. Select 'KV' (Key-Value Store)"
echo "6. Name it: football-stats-cache"
echo "7. Click 'Create'"
echo ""
read -p "Press Enter once you've created the KV database..."

echo ""
echo "🔑 Step 2: Setting Environment Variables..."

# Generate CRON_SECRET
CRON_SECRET=***REMOVED*** rand -base64 32)
echo "Generated CRON_SECRET: $CRON_SECRET"

# Set environment variables
echo "Setting CRON_SECRET..."
vercel env add CRON_SECRET production <<< "$CRON_SECRET"

echo "Setting VITE_API_FOOTBALL_KEY..."
vercel env add VITE_API_FOOTBALL_KEY production <<< "***REMOVED***"

echo "✅ Environment variables set"
echo ""

echo "🚀 Step 3: Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""

# Get the deployment URL
DEPLOYMENT_URL=$(vercel ls --prod | grep "golden-bet-ai" | head -1 | awk '{print $2}')

echo "🔄 Step 4: Triggering Initial Cache Population..."
echo "This will take 5-10 minutes..."
echo ""

curl -X GET "https://${DEPLOYMENT_URL}/api/cron/refresh-stats" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -v

echo ""
echo "✅ Initial cache population triggered!"
echo ""

echo "🔍 Step 5: Verifying Cache..."
sleep 5

curl "https://${DEPLOYMENT_URL}/api/stats-cache" | jq '.'

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📊 Your Form Tables will now:"
echo "  - Load instantly (< 1 second)"
echo "  - Refresh daily at 4 AM UTC"
echo "  - Cover 250+ leagues worldwide"
echo ""
echo "🔑 Save this CRON_SECRET for manual refreshes:"
echo "   $CRON_SECRET"
echo ""
echo "🌐 Your site: https://${DEPLOYMENT_URL}"
echo ""
