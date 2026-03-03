# Windsurf Rules — INDEV Project

## Before Starting Any Task

1. **Read `AGENTS.md`** to understand project structure, conventions, and tech stack.
2. **Read `PROJECT_STATUS.md`** to know which features are done, in progress, or pending.
3. Do NOT scan the entire codebase unless explicitly asked. Use targeted searches only.

## Working on Code

1. **List files to modify first** — before making any changes, tell the user which files will be affected and wait for confirmation.
2. **Follow existing conventions** found in `AGENTS.md`:
   - Backend: 1 controller per entity, 1 model per entity, user-scoped data, JSON responses with `gin.H{"data": ...}` / `gin.H{"error": "..."}`.
   - Frontend: Standalone Components, lazy-loaded routes, `<entity>-list/` + `<entity>-form/` pattern, signals for state, lucide-angular for icons, shared CRUD styles.
3. **Naming:**
   - Go: PascalCase structs, snake_case JSON tags.
   - TypeScript: camelCase variables/methods, PascalCase classes.
   - Files: kebab-case for frontend, snake_case for backend.
4. **Do not add or remove comments** unless the user explicitly asks.
5. **Do not create unnecessary files** — prefer editing existing files.

## After Completing a Feature

1. **Update `PROJECT_STATUS.md`** — move items between ✅ Done / 🚧 In Progress / 📋 Todo as needed.
2. **Update `AGENTS.md`** if the change affects project structure, modules, models, or conventions.

## Code Quality

1. All new endpoints must be user-scoped (`user_id` from JWT context).
2. All new models must be added to `models/migrate.go` AutoMigrate list.
3. All new routes must be added to `main.go` under the appropriate group.
4. Frontend services: one per entity in `services/` directory.
5. Frontend pages: always import shared styles `@use '...shared/styles/crud';`.
6. Prefer minimal, focused edits over large rewrites.

## Environment

- **Backend port:** 2001 (default)
- **Frontend port:** 2002 (default, `ng serve`)
- **Database:** PostgreSQL on host machine (not Docker), port 5432
- **Docker API:** uses `host.docker.internal` to reach host DB
