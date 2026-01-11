# NIN Validator Hub - AI Agent Instructions

## Project Overview
This is a **Vite + React + TypeScript** application for validating Nigerian National Identification Numbers (NIN) via the RobostTech API. It uses **Supabase** for authentication, database, and edge functions, with **shadcn/ui** components and **TailwindCSS** for styling.

## Architecture & Data Flow

### Core Components
- **Frontend**: React SPA with client-side routing (`react-router-dom`)
- **Backend**: Supabase Edge Functions (Deno runtime) proxy API calls to RobostTech
- **Database**: PostgreSQL via Supabase with RLS policies
- **State Management**: TanStack Query for server state, Context API for auth

### Key Data Flow
1. User submits NIN in [ValidationForm.tsx](src/components/dashboard/ValidationForm.tsx)
2. Frontend calls Supabase Edge Function at [supabase/functions/robosttech-api/index.ts](supabase/functions/robosttech-api/index.ts)
3. Edge function forwards request to RobostTech API with API key from env
4. Response saved to `validation_history` or `personalization_history` tables
5. UI updates via TanStack Query cache invalidation

### Authentication Pattern
[useAuth.tsx](src/hooks/useAuth.tsx) wraps the app with auth context. Auth state listener is set up **before** checking existing session to avoid race conditions. Auth checks are temporarily disabled in [Dashboard.tsx](src/pages/Dashboard.tsx) (see commented redirect).

## Development Workflows

### Running the App
```bash
bun dev        # Starts Vite dev server on port 8080
bun run build  # Production build
bun run lint   # ESLint check
```

### Environment Variables
Required in `.env.local`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `ROBOSTTECH_API_KEY` - Set in Supabase Edge Function secrets

### Database Schema
See [migrations](supabase/migrations/20260102100521_f00b8047-6116-40ac-8c3e-c741818d3604.sql):
- `profiles` - User profile data
- `user_roles` - Separate table for role-based access (enum: 'admin', 'user')
- `validation_history` - Stores NIN validation requests/responses
- `personalization_history` - Stores personalization requests

All tables have RLS enabled. Types auto-generated in [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts).

## Project Conventions

### Component Patterns
- **UI Components**: Use shadcn/ui from [src/components/ui/](src/components/ui/) - import via `@/components/ui/*`
- **Forms**: Combine `react-hook-form` + `zod` + shadcn Form components (see [ValidationForm.tsx](src/components/dashboard/ValidationForm.tsx))
- **Styling**: Use `cn()` utility from [lib/utils.ts](src/lib/utils.ts) for conditional classes
- **Icons**: Import from `lucide-react`

### Path Aliases
Configured in [vite.config.ts](vite.config.ts) and [components.json](components.json):
- `@/` → `src/`
- `@/components` → `src/components`
- `@/hooks` → `src/hooks`
- `@/lib` → `src/lib`

### Validation Pattern
NIN validation uses Zod schema: 11-digit numeric string. Error handling distinguishes between validation errors and RobostTech billing/balance errors (see balance message check in [ValidationForm.tsx](src/components/dashboard/ValidationForm.tsx#L88-L93)).

### Supabase Edge Functions
- Action-based routing pattern with switch statement
- CORS headers required for all responses
- API key stored in Deno env, never exposed to client
- Handle both POST requests and OPTIONS preflight

### Routing
Centralized in [App.tsx](src/App.tsx). Add new routes **above** the catch-all `"*"` route. Default redirects `/` to `/dashboard`.

## Common Tasks

### Adding a New shadcn Component
```bash
npx shadcn@latest add <component-name>
```
This auto-adds to [src/components/ui/](src/components/ui/) with proper path aliases.

### Querying Supabase
```typescript
import { supabase } from "@/integrations/supabase/client";
const { data, error } = await supabase
  .from("table_name")
  .select("*")
  .eq("user_id", userId);
```

### Adding TanStack Query
Wrap in `useQuery` or `useMutation`, use `queryKey` arrays for cache management. Refetch via `refetch()` or `invalidateQueries()`.

## Critical Notes
- **Authentication**: Fully enabled - redirects to /auth if not logged in
- **Lovable integration**: Changes via Lovable platform auto-commit to this repo
- **Bun runtime**: Uses Bun instead of npm (see lockfile)
- **Component tagger**: Runs only in dev mode for Lovable editor integration
- **Tracking IDs**: Displayed after validation with copy button, saved to validation_history table
- **Tab Navigation**: Four main sections with responsive mobile design - Validate NIN, Check Status, Personalization, Profile
- **Mobile First**: Responsive grid layouts, collapsible tabs, and touch-friendly UI elements
