#!/usr/bin/env bash
# Sea Morris — Additional Scope Order Manager
# One-time setup script. Run from the repo root.
set -e

echo ""
echo "=== Sea Morris Setup ==="
echo ""

# 1. Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "npm is required."; exit 1; }

# 2. Install deps
echo "Installing dependencies..."
cd app && npm install && cd ..

# 3. Check for .env.local
if [ ! -f app/.env.local ]; then
  echo ""
  echo "Creating app/.env.local from template..."
  cp app/.env.example app/.env.local
  echo ""
  echo "⚠️  Edit app/.env.local and fill in:"
  echo "    SUPABASE_URL"
  echo "    SUPABASE_SERVICE_ROLE_KEY"
  echo "    JWT_SECRET  (any long random string)"
  echo "    NEXT_PUBLIC_APP_URL  (e.g. http://localhost:3000 for local)"
  echo ""
  echo "Then run this script again, or: cd app && npm run dev"
else
  echo "app/.env.local already exists — skipping."
fi

# 4. Remind about migrations
echo ""
echo "=== Database Migrations ==="
echo "Run these SQL files in order against your Supabase project:"
ls app/supabase/migrations/*.sql | sort | while read f; do
  echo "  • $(basename $f)"
done
echo ""
echo "Use the Supabase dashboard SQL editor or: npx supabase db push"
echo ""
echo "=== Done ==="
echo "Start the dev server: cd app && npm run dev"
echo "Verify deployment:    curl https://your-domain.com/api/health"
echo ""
