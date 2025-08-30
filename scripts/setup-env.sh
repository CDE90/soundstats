#!/bin/bash

# Setup environment variable symlinks for the monorepo
# This script creates symlinks from the root .env file to each package

echo "Setting up environment variable symlinks..."

# Remove existing symlinks if they exist
rm -f apps/web/.env
rm -f apps/service/.env
rm -f packages/database/.env

# Create symlinks to the root .env file
ln -s ../../.env apps/web/.env
ln -s ../../.env apps/service/.env
ln -s ../../.env packages/database/.env

echo "✅ Environment symlinks created:"
echo "  apps/web/.env -> ../../.env"
echo "  apps/service/.env -> ../../.env"
echo "  packages/database/.env -> ../../.env"
echo ""
echo "Note: Make sure you have a .env file in the root directory with all required variables."
echo "The .env file should contain:"
echo "  - DATABASE_URL"
echo "  - SPOTIFY_CLIENT_ID"
echo "  - SPOTIFY_CLIENT_SECRET"
echo "  - CLERK_SECRET_KEY"
echo "  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
echo "  - UPLOADTHING_TOKEN"
echo "  - NEXT_PUBLIC_POSTHOG_KEY"
echo "  - NEXT_PUBLIC_POSTHOG_HOST"
