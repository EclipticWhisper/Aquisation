#!/bin/bash

# Development startup script for Acquisition App with Neon Local
# This script starts the application in development mode with Neon Local

echo "🚀 Starting Acquisition App in Development Mode"
echo "================================================"

# Check if .env.development exists
if [ ! -f .env.development ]; then
    echo "❌ Error: .env.development file not found!"
    echo "   Please copy .env.development from the template and update with your Neon credentials."
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "   Please start Docker Desktop and try again."
    exit 1
fi

# Create .neon_local directory if it doesn't exist
mkdir -p .neon_local

# Add .neon_local to .gitignore if not already present
if ! grep -q ".neon_local/" .gitignore 2>/dev/null; then
    echo ".neon_local/" >> .gitignore
    echo "✅ Added .neon_local/ to .gitignore"
fi

echo "📦 Building and starting development containers..."
echo "   - Neon Local proxy will create an ephemeral database branch"
echo "   - Application will run with hot reload enabled"
echo ""

# 1. Start up the containers in the background first so they exist
docker compose -f docker-compose.dev.yml up -d --build

# 2. Wait for the Neon database container health check to pass
echo "⏳ Waiting for the database proxy to be fully ready..."
until docker compose -f docker-compose.dev.yml exec -T neon-local pg_isready -h localhost -U neon >/dev/null 2>&1; do
    echo "   ...still initialization checking, waiting 2 seconds..."
    sleep 2
done

# 3. Apply migrations INSIDE the active container context now that it's online
echo "📜 Applying latest schema with Drizzle inside container..."
docker compose -f docker-compose.dev.yml exec -T app npm run db:migrate

echo ""
echo "🎉 Development environment successfully configured!"
echo "   Application: http://localhost:5173"
echo "   Database: postgres://neon:npg@localhost:5432/neondb"
echo ""
echo "Streaming live application logs below (Press Ctrl+C to detach without stopping services):"
echo "=========================================================================================="

# 4. Stream the live console logs to your terminal window
docker compose -f docker-compose.dev.yml logs -f app
