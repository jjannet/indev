# AGENTS.md — INDEV Project Reference

## Project Overview

INDEV is a full-stack **personal work management / timesheet** web application. It allows a user to manage customers, projects, job codes, log daily work hours, configure work periods, and generate timesheets.

## Tech Stack

### Backend (`indv-api/`)
- **Language:** Go 1.25
- **Web Framework:** Gin Gonic v1.12 (`github.com/gin-gonic/gin`)
- **ORM:** GORM v1.31 (`gorm.io/gorm`)
- **Database:** PostgreSQL (via `gorm.io/driver/postgres`, pgx driver)
- **Auth:** JWT (`github.com/golang-jwt/jwt/v5`) + bcrypt (`golang.org/x/crypto/bcrypt`)
- **CORS:** `github.com/gin-contrib/cors`
- **Env:** `github.com/joho/godotenv` (`.env.development`)
- **Containerization:** Docker multi-stage build (Alpine)

### Frontend (`indv-ui/`)
- **Framework:** Angular 21 (Standalone Components)
- **Language:** TypeScript 5.9
- **Icons:** lucide-angular v0.576
- **Rich Text:** ngx-quill v30 + Quill v2
- **Styling:** SCSS with CSS custom properties (`[data-theme]` for light/dark)
- **Test:** Vitest v4
- **Formatter:** Prettier v3.8

## Folder Structure

### Backend — `indv-api/`
```
indv-api/
├── main.go                  # Entry point, router setup, CORS, routes
├── Dockerfile               # Multi-stage Docker build
├── go.mod / go.sum
├── config/
│   └── database.go          # PostgreSQL connection (GORM)
├── controllers/
│   ├── auth_controller.go
│   ├── customer_controller.go
│   ├── project_controller.go
│   ├── job_code_controller.go
│   ├── work_period_config_controller.go
│   ├── work_log_controller.go
│   ├── timesheet_controller.go
│   └── system_admin_controller.go
├── helpers/
│   ├── pagination.go        # PaginationParams, PaginatedResponse
│   └── user.go              # GetUserID from gin context
├── middleware/
│   └── auth.go              # AuthMiddleware + ForceResetMiddleware + AdminMiddleware
├── models/
│   ├── user.go
│   ├── customer.go
│   ├── project.go           # includes ProjectCustomer join model
│   ├── job_code.go
│   ├── work_period_config.go
│   ├── work_log.go
│   ├── timesheet.go
│   └── migrate.go           # AutoMigrate + one-time migrations
└── seeds/
    └── seed.go              # Seed admin user
```

### Frontend — `indv-ui/`
```
indv-ui/
├── package.json
├── src/
│   ├── environments/
│   │   └── environment.ts       # apiUrl config
│   ├── main.ts
│   ├── styles.scss              # Global styles + CSS variables
│   └── app/
│       ├── app.ts / app.html / app.scss / app.routes.ts / app.config.ts
│       ├── guards/
│       │   └── auth.guard.ts    # authGuard, guestGuard, forceResetGuard, resetPageGuard, adminGuard
│       ├── interceptors/
│       │   └── auth.interceptor.ts  # HttpInterceptorFn, Bearer token
│       ├── layout/
│       │   ├── layout.ts/html/scss      # Sidebar + Header + RouterOutlet
│       │   ├── header/                  # Header component (theme toggle, logout)
│       │   └── sidebar/                 # Sidebar component (menu items)
│       ├── pages/
│       │   ├── login/                   # Login page
│       │   ├── register/               # Register page
│       │   ├── reset-password/          # Force reset password page
│       │   ├── change-password/         # Change password page
│       │   ├── dashboard/               # Dashboard (today's logs summary)
│       │   ├── system-admin/
│       │   │   ├── user-list/           # User management list
│       │   │   └── user-form/           # User create/edit form
│       │   └── work/
│       │       ├── customers/           # customer-list + customer-form
│       │       ├── projects/            # project-list + project-form
│       │       ├── job-codes/           # job-code-list + job-code-form
│       │       ├── work-period-configs/ # config-list (inline edit, year-based)
│       │       ├── work-logs/           # work-log-list + work-log-form
│       │       └── timesheet/           # timesheet-view + timesheet-report
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── theme.service.ts
│       │   ├── customer.service.ts
│       │   ├── project.service.ts
│       │   ├── job-code.service.ts
│       │   ├── work-period-config.service.ts
│       │   ├── work-log.service.ts
│       │   ├── timesheet.service.ts
│       │   └── user.service.ts
│       └── shared/
│           └── styles/
│               ├── crud.scss        # Shared CRUD page styles
│               └── _auth-page.scss  # Shared auth page styles (login/register/reset)
```

## File Conventions

### Backend
- **1 controller file per entity** → `controllers/<entity>_controller.go`
- **1 model file per entity** → `models/<entity>.go`
- Controller functions: `Get<Entity>s`, `Get<Entity>`, `Create<Entity>`, `Update<Entity>`, `Delete<Entity>`
- All endpoints return JSON: `gin.H{"data": ...}` for success, `gin.H{"error": "..."}` for errors
- Pagination via `helpers.GetPaginationParams(c)` → `helpers.NewPaginatedResponse(data, total, params)`
- All data is **user-scoped** via `user_id` column and `helpers.GetUserID(c)`
- Soft-delete pattern: entities with `status` field use `active`/`inactive` (Customer, Project, JobCode)

### Frontend
- **Standalone Components** (no NgModules)
- **Lazy-loaded routes** via `loadComponent` in `app.routes.ts`
- **Pattern:** `<entity>-list/` (list page) + `<entity>-form/` (create/edit page)
- Each page component: `.ts` + `.html` + `.scss`
- SCSS imports shared styles: `@use '../../../../shared/styles/crud';`
- Services: one per entity in `services/` directory
- Icons: import from `lucide-angular`, declare in component `icons` readonly object
- Signals used for reactive state (`signal<T>()`)

## Module List

| Module | Backend Controller | Frontend Pages | Description |
|--------|-------------------|---------------|-------------|
| **Auth** | `auth_controller.go` | `login/`, `register/`, `reset-password/`, `change-password/` | JWT login, register, force reset, change password, profile |
| **System Admin** | `system_admin_controller.go` | `system-admin/user-list/`, `system-admin/user-form/` | User management (CRUD, admin-only) |
| **Customer** | `customer_controller.go` | `customers/` | CRUD for customers |
| **Project** | `project_controller.go` | `projects/` | CRUD for projects (many-to-many with customers) |
| **Job Code** | `job_code_controller.go` | `job-codes/` | CRUD for job codes (linked to customer + project) |
| **Work Period Config** | `work_period_config_controller.go` | `work-period-configs/` | Auto-generated 12-month periods per year, confirm/edit inline |
| **Work Log** | `work_log_controller.go` | `work-logs/` | Daily work time entries with duration calc |
| **Timesheet** | `timesheet_controller.go` | `timesheet/` | Monthly summary, close/reopen, report view |
| **Dashboard** | — | `dashboard/` | Today's work log summary widget |

## Data Relations (from Models)

```
User (1) ──→ (N) Customer
User (1) ──→ (N) Project
User (1) ──→ (N) JobCode
User (1) ──→ (N) WorkPeriodConfig
User (1) ──→ (N) WorkLog
User (1) ──→ (N) Timesheet

Project (M) ←──→ (N) Customer       [via project_customers join table]

JobCode (N) ──→ (1) Customer
JobCode (N) ──→ (1) Project

WorkLog (N) ──→ (1) Project
WorkLog (N) ──→ (1) Customer         [optional]
WorkLog (N) ──→ (1) JobCode          [optional]

Timesheet (N) ──→ (1) WorkPeriodConfig
```

### Key Model Fields

- **User:** id, email, password, full_name, role, is_system_admin, force_reset_password, status(active/inactive), user_id
- **Customer:** id, code, name, short_name, status, description, user_id
- **Project:** id, code, name, start_date, end_date, status, description, user_id, customers[]
- **JobCode:** id, code, name, type(billable/non-billable), status, customer_id, project_id, user_id
- **WorkPeriodConfig:** id, year, month, start_date, end_date, is_confirmed, user_id
- **WorkLog:** id, date, start_time, end_time, duration, project_id, customer_id, job_code_id, ref_id, description, status(new/in_progress/wait_for_test/re_open/done), user_id
- **Timesheet:** id, work_period_id, user_id, status(in_progress/done)

## Key Conventions

- **Naming:** snake_case for JSON fields, PascalCase for Go structs, camelCase for TypeScript
- **API prefix:** `/api/` — all routes under `/api/` group
- **Auth:** Bearer JWT token in Authorization header
- **Status pattern:** `active`/`inactive` for master data and users; `is_confirmed` bool for work periods; `in_progress`/`done` for timesheets
- **Middleware chain:** AuthMiddleware → ForceResetMiddleware → AdminMiddleware
- **Guards (FE):** guestGuard (public), authGuard (login required), forceResetGuard (blocks if force_reset), resetPageGuard (only if force_reset), adminGuard (system admin only)
- **Date format:** `YYYY-MM-DD` string in API, `time.Time` in Go
- **Time format:** `HH:MM` string (start_time/end_time)
- **Duration:** integer in minutes, calculated from start_time/end_time
- **Pagination:** query params `page`, `page_size`, `sort_by`, `sort_dir`, `search`, `status`
- **Theme:** CSS custom properties on `[data-theme="light"|"dark"]`, toggled via ThemeService

## Environment Config

### Backend (`.env.development`)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (or `DB_CONNECTION_STRING`)
- `JWT_SECRET`
- `APP_PORT` (default: `2001`)
- `CORS_ORIGINS` (default: `http://localhost:2002`)
- `ENV_FILE` (default: `.env.development`)

### Frontend (`src/environments/environment.ts`)
- `apiUrl`: `http://localhost:2001/api`

### Docker
- Dockerfile exposes port `2051`
- Use `host.docker.internal` to connect from Docker to host PostgreSQL
