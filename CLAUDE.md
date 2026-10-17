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

## Frontend Design

- For frontend work, read and follow Anthropic's [frontend-design skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md).
- Apply it within the requested scope. Incremental changes should fit SoundStats' existing typography, themes, components, and spacing; a full redesign is separate work.
- Let music artwork, titles, and useful listening data lead. Avoid unnecessary uppercase labels, explanatory filler, and columns that don't help users.
- Check the result in the browser at desktop and mobile sizes, including keyboard focus and empty states.
