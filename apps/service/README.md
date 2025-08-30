# SoundStats Service

This service handles background tasks and cron jobs for the SoundStats application.

## Features

- **Cron Jobs**: Automated tasks for updating now-playing data, refetching stale data, and processing uploads
- **Database Operations**: Direct database access for background processing

## Cron Jobs

- **Process uploads**: Every 6 hours at 5 minutes past the hour
- **Now-playing updates**: Every minute for all users, with additional premium user updates at 20s and 40s past each minute
- **Stale data refetch**: Every hour at 15 minutes past the hour

## Environment Variables

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `SPOTIFY_CLIENT_ID` - Spotify API client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify API client secret
- `CLERK_SECRET_KEY` - Clerk authentication secret key
- `NODE_ENV` - Environment (development/production)

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Start production server
pnpm start
```

## Migration from Next.js

The process-uploads functionality was migrated from the Next.js app to this service to:

- Separate concerns between web UI and background processing
- Improve performance by avoiding Next.js overhead for heavy processing tasks
- Enable better monitoring and scaling of background tasks
- Centralize all cron jobs within the monorepo instead of relying on external services
