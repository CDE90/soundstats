# Development Guidelines

## Build Commands
- `pnpm dev` - Start development server with Turbo
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix linting errors automatically
- `pnpm check` - Run lint + type checking
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm format:write` - Format code with Prettier
- `pnpm format:check` - Check formatting

## Database
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Run migrations

## Code Style
- TypeScript with strict type checking
- 4-space indentation (tabWidth: 4)
- Trailing commas in multi-line lists
- Path aliasing: import from `@/` for src directory
- Component-based architecture
- React server components by default
- Use Tailwind for styling
- Prefix unused variables with underscore
- Use Zod for validation
- Use React Query for data fetching
- Follow Next.js App Router conventions
- Prefer named exports over default exports
- Use server-only imports appropriately
- Organize imports: React/external, then internal (@/)