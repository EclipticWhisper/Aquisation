#!/bin/bash

# Development startup script for Acquisition App with Neon Local

set -e

echo "🚀 Starting Acquisition App in Development Mode"
echo "================================================"

# Check if .env.development exists
if [ ! -f .env.development ]; then
    echo "❌ Error: .env.development file not found!"
    echo "   Please copy .env.development.example to .env.development and update with your Neon credentials."
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

docker compose --env-file .env.development -f docker-compose.dev.yml up -d --build

# Wait for the Neon Local database proxy to be ready
echo "⏳ Waiting for the database proxy to be ready..."
until docker compose -f docker-compose.dev.yml exec -T neon-local pg_isready -h localhost -p 5432 -U neon >/dev/null 2>&1; do
    echo "   ...still initializing, waiting 2 seconds..."
    sleep 2
done

# Apply migrations inside the app container (which shares the compose network)
echo "📜 Applying latest schema with Drizzle..."
docker compose -f docker-compose.dev.yml exec -T app npm run db:migrate

echo ""
echo "🎉 Development environment started!"
echo "   Application: http://localhost:5173"
echo "   Database: postgres://neon:npg@localhost:5432/neondb"
echo ""
echo "Streaming application logs below (press Ctrl+C to detach without stopping services):"
docker compose -f docker-compose.dev.yml logs -f app
