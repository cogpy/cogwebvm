# CLAUDE.md - OpenCog Dashboard

## Project Overview

OpenCog Dashboard (cogwebvm) is a full-stack web application that provides a visual interface for the OpenCog AGI framework running in a WebVM environment. It displays verification results, system specifications, and provides real-time CogServer connectivity with 3D AtomSpace visualization.

## Tech Stack

**Frontend:**
- React 19 with TypeScript
- Vite 7 for bundling
- Tailwind CSS 4 with custom cybernetic/brutalist theme
- wouter for routing
- react-force-graph-3d for AtomSpace visualization
- Radix UI components (shadcn/ui style)
- TanStack React Query for server state

**Backend:**
- Express.js server
- tRPC for type-safe API
- Drizzle ORM with MySQL
- AWS S3 for file storage
- Manus OAuth for authentication

**Testing:**
- Vitest for unit tests

## Project Structure

```
cogwebvm/
├── client/                 # Frontend React application
│   └── src/
│       ├── _core/          # Core utilities (auth hooks)
│       ├── components/     # React components
│       │   ├── ui/         # Reusable UI components (shadcn-style)
│       │   ├── AtomSpaceViz.tsx      # 3D graph visualization
│       │   └── DashboardLayout.tsx   # Main layout wrapper
│       ├── contexts/       # React contexts
│       │   ├── CogServerContext.tsx  # WebSocket connection to CogServer
│       │   └── ThemeContext.tsx      # Dark/light theme
│       ├── hooks/          # Custom hooks
│       ├── lib/            # Utilities (trpc client)
│       ├── pages/          # Page components
│       │   ├── Home.tsx    # Main dashboard
│       │   ├── FileManager.tsx # File upload/management
│       │   └── AtomSpaceExplorer.tsx # Interactive AtomSpace browser with REPL
│       └── index.css       # Tailwind + custom CSS variables
├── server/                 # Backend Express server
│   ├── _core/              # Core server utilities
│   │   ├── index.ts        # Server entry point
│   │   ├── trpc.ts         # tRPC setup with procedures
│   │   ├── context.ts      # tRPC context (auth)
│   │   ├── oauth.ts        # OAuth routes
│   │   └── vite.ts         # Vite dev middleware
│   ├── routers.ts          # tRPC app router (main API)
│   ├── db.ts               # Drizzle database connection
│   ├── storage.ts          # S3 storage utilities
│   └── fileDb.ts           # File CRUD operations
├── shared/                 # Shared types and utilities
│   ├── const.ts            # Constants (cookie names)
│   ├── types.ts            # Shared TypeScript types
│   ├── atomspace.ts        # AtomSpace utilities (atoms, graphs, filtering)
│   ├── atomspace.test.ts   # AtomSpace utility tests (77 tests)
│   ├── repl.ts             # Scheme REPL command execution
│   └── repl.test.ts        # REPL utility tests (35 tests)
├── drizzle/                # Database schema and migrations
│   ├── schema.ts           # Drizzle table definitions
│   └── migrations/         # SQL migration files
├── occ-build-webvm.sh      # OpenCog build script
└── start-opencog-webvm.sh  # Unified startup script
```

## Key Commands

```bash
# Development
pnpm dev                    # Start dev server with hot reload
pnpm build                  # Build for production
pnpm start                  # Run production build

# Code quality
pnpm check                  # TypeScript type checking
pnpm format                 # Prettier formatting
pnpm test                   # Run Vitest tests

# Database
pnpm db:push                # Generate and run migrations
```

## Database Schema

Located in `drizzle/schema.ts`:

- **users** - User accounts (id, openId, name, email, role, timestamps)
- **files** - File metadata for S3 storage (id, userId, filename, fileKey, url, mimeType, size)

## API Patterns

Uses tRPC with type-safe procedures defined in `server/routers.ts`:

```typescript
// Public procedures (no auth required)
auth.me              // Get current user
auth.logout          // Clear session

// Protected procedures (auth required)
files.list           // List user's files
files.upload         // Upload file (base64 content)
files.delete         // Delete file by ID
```

Client usage:
```typescript
import { trpc } from "@/lib/trpc";
const { data } = trpc.files.list.useQuery();
const mutation = trpc.files.upload.useMutation();
```

## Path Aliases

Configured in `tsconfig.json` and `vite.config.ts`:
- `@/` -> `client/src/`
- `@shared/` -> `shared/`
- `@assets/` -> `attached_assets/`

## CogServer Integration

The app connects to CogServer via WebSocket on port 18080 (`ws://host:18080/json`).

- Connection is optional - app works without CogServer running
- Max 3 reconnection attempts
- Uses `CogServerContext` for connection state management
- Status displayed on dashboard (ONLINE/OFFLINE)

## Design System

Cybernetic Brutalism theme with:
- Deep dark background (`#0a0f14`)
- Neon cyan primary (`#00f0ff`)
- Electric purple secondary
- Monospace fonts (JetBrains Mono style)
- Terminal-like UI elements
- CSS variables defined in `client/src/index.css`

Custom components in `client/src/components/ui/CyberComponents.tsx`:
- `StatusCard` - Status indicators with pass/fail states
- `TerminalBlock` - Code/output display
- `DataGrid` - Key-value data display

## Testing

Tests use Vitest. Example: `server/fileStorage.test.ts`

```bash
pnpm test              # Run all tests
pnpm test --watch      # Watch mode
```

## Environment Variables

Required (set via platform or `.env`):
- `DATABASE_URL` - MySQL connection string
- AWS S3 credentials (for file storage)
- OAuth credentials (for authentication)

## OpenCog Components

Built via `occ-build-webvm.sh` in dependency order:
1. CogUtil - Foundation utilities
2. AtomSpace - Hypergraph database
3. AtomSpace-Storage - Persistence layer
4. CogServer - Network server
5. URE - Unified Rule Engine
6. PLN - Probabilistic Logic Networks
7. AtomSpace-RocksDB - RocksDB backend

## AtomSpace Explorer

The AtomSpace Explorer (`/atomspace` route) provides interactive tools for working with the OpenCog hypergraph:

**Features:**
- **Atom Browser** - Search and filter atoms by name or type
- **3D Visualization** - Interactive force-directed graph of atoms and links
- **Scheme REPL** - Execute OpenCog Scheme commands directly
- **Atom Details** - View truth values, outgoing sets, and Scheme representation

**Supported REPL Commands (demo mode):**
```scheme
;; Atom Creation
(Concept "name")          ; Create/get ConceptNode
(Predicate "name")        ; Create/get PredicateNode
(Inheritance "A" "B")     ; Create InheritanceLink

;; AtomSpace Queries
(cog-atomspace)           ; Get current atomspace info
(cog-get-atoms 'Type)     ; List atoms by type
(cog-incoming-set "name") ; Get incoming links
(cog-outgoing-set "name") ; Get outgoing atoms
(cog-tv "name")           ; Get truth value

;; Utilities
(count-all)               ; Count all atoms with breakdown
(display "name")          ; Display atom representation
(clear)                   ; Reset to sample data
(help)                    ; Show all commands
```

**Atom Types Color Coding:**
- ConceptNode: Cyan (`#00f0ff`)
- PredicateNode: Purple (`#bd00ff`)
- InheritanceLink: Green (`#00ff88`)
- EvaluationLink: Amber (`#ffaa00`)

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Home | Main dashboard with system status |
| `/files` | FileManager | S3-backed file storage |
| `/atomspace` | AtomSpaceExplorer | Interactive AtomSpace browser |

## Shared Utilities

Located in `shared/`:

**atomspace.ts** - Core AtomSpace utilities:
- `Atom`, `TruthValue`, `GraphData` types
- `filterAtoms()` - Search and filter atoms
- `buildGraphData()` - Generate visualization data
- `atomToScheme()` - Convert atom to Scheme representation
- `SAMPLE_ATOMS` - Demo data with 14 atoms

**repl.ts** - Scheme REPL implementation:
- `createReplState()` - Initialize REPL with atoms
- `executeSchemeCommand()` - Execute Scheme expressions
- `isValidSchemeExpression()` - Validate input

Usage:
```typescript
import { filterAtoms, buildGraphData } from "@shared/atomspace";
import { createReplState, executeSchemeCommand } from "@shared/repl";

const state = createReplState();
const result = executeSchemeCommand('(Concept "Cat")', state);
```

## Notes for Development

- Server runs on port 3000 (auto-increments if busy)
- Body parser configured for 50MB file uploads
- File uploads sent as base64 in tRPC mutations
- Use `protectedProcedure` for authenticated endpoints
- Dark theme is default (configured in `App.tsx`)
- AtomSpace Explorer works in offline mode with sample data
- 113+ unit tests covering atomspace and REPL utilities
