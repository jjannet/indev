# PROJECT_STATUS.md — INDEV Feature Status

> Last updated: 2026-03-03

## ✅ Done

### Auth
- [x] JWT login (email/password) → `POST /api/auth/login`
- [x] Auth middleware (Bearer token validation)
- [x] ForceResetMiddleware (blocks all endpoints except reset-password if force_reset_password=true)
- [x] AdminMiddleware (checks is_system_admin for /api/system-admin/* routes)
- [x] Profile endpoint → `GET /api/auth/profile`
- [x] Register endpoint → `POST /api/auth/register` (first user = system admin)
- [x] Force Reset Password → `PUT /api/auth/reset-password`
- [x] Change Password → `PUT /api/auth/change-password`
- [x] Seed admin user (`admin@indev.com` / `admin1234`)
- [x] Frontend login page with redirect (force_reset_password → /reset-password)
- [x] Frontend register page with validation
- [x] Frontend force reset password page (no navigation, standalone)
- [x] Frontend change password page (accessible from header)
- [x] authGuard / guestGuard / forceResetGuard / resetPageGuard / adminGuard
- [x] authInterceptor (auto-attach Bearer token)
- [x] Token + user state (is_system_admin, force_reset_password) stored in localStorage

### System Admin — User Management
- [x] User model: is_system_admin, force_reset_password, status fields
- [x] CRUD API: list (paginated, search), get, create, update, soft-delete (set inactive)
- [x] Admin sets password → force_reset_password = true automatically
- [x] Cannot change own admin status or deactivate self
- [x] Cannot delete last system admin
- [x] Frontend: user-list (table, search, status filter, pagination)
- [x] Frontend: user-form (create/edit with admin checkbox, password field)
- [x] Sidebar: System Admin menu visible only to is_system_admin users

### Layout & Theme
- [x] Sidebar (260px fixed) + Header (sticky) + Content area
- [x] Light/Dark theme toggle via CSS custom properties (`[data-theme]`)
- [x] ThemeService with signal + localStorage persistence
- [x] Sidebar menu: Dashboard, Work module, System Admin (conditional)
- [x] Header: Change Password link

### Customer Module
- [x] Model: id, code, name, short_name, status, description, user_id
- [x] CRUD API: list (paginated), get, create, update, soft-delete (active/inactive)
- [x] Active customers endpoint → `GET /api/customers/active`
- [x] Frontend: customer-list (table, filters, pagination) + customer-form (create/edit)

### Project Module
- [x] Model: id, code, name, start_date, end_date, status, description, user_id, customers (M:N)
- [x] CRUD API: list (paginated), get, create, update, soft-delete
- [x] Active projects endpoint → `GET /api/projects/active`
- [x] Many-to-many relation with customers via `project_customers` join table
- [x] Frontend: project-list + project-form (with multi-select customers)

### Job Code Module
- [x] Model: id, code, name, type (billable/non-billable), status, customer_id, project_id, user_id
- [x] CRUD API: list (paginated with customer/project filter), get, create, update, soft-delete
- [x] Frontend: job-code-list + job-code-form (with customer/project dropdowns)

### Work Period Config Module
- [x] Model: id, year, month, start_date, end_date, is_confirmed, user_id
- [x] Auto-generate 12 months per year (fill missing months on access)
- [x] API: get by year (auto-generate), update dates, confirm
- [x] Validation: dates must be within the month, end_date >= start_date
- [x] Lock check: months with timesheet status=done cannot be edited
- [x] Frontend: year-based view with prev/next year navigation
- [x] Inline edit start_date/end_date + Confirm button
- [x] Status badges: Pending / Confirmed / Locked

### Work Log Module
- [x] Model: id, date, start_time, end_time, duration, project_id, customer_id, job_code_id, ref_id, description, status, user_id
- [x] CRUD API: list (paginated, filtered by work_period/project/customer/status), get, create, update, delete
- [x] Duration auto-calculated from start_time/end_time
- [x] Validation: date must be in a confirmed work period; timesheet lock check
- [x] Summary endpoint → `GET /api/work-logs/summary`
- [x] Last used project endpoint → `GET /api/work-logs/last-project`
- [x] Frontend: work-log-list (table with period selector, filters, summary bar, double-click to edit)
- [x] Frontend: work-log-form (create/edit with rich text description, copy from existing log)
- [x] Work log list sorted by date ASC (oldest first)

### Timesheet Module
- [x] Model: id, work_period_id, user_id, status (in_progress/done)
- [x] API: get by period (auto-create if not exists), update status
- [x] Validation: all work logs must have job_code before closing timesheet
- [x] Frontend: timesheet-view (period selector, daily summaries, project/job-code breakdown)
- [x] Frontend: timesheet-report (printable report view)
- [x] Lock mechanism: closed timesheet prevents work log edits

### Dashboard
- [x] Today's work log summary (count, total duration, recent logs)
- [x] Quick actions: add work log, view all logs, go to timesheet
- [x] Timesheet lock status indicator

### Infrastructure
- [x] Docker multi-stage build (Dockerfile)
- [x] CORS configuration (env-based origins)
- [x] Static file serving (`/uploads`)
- [x] Pagination helper (PaginationParams, PaginatedResponse)
- [x] DB auto-migration with one-time column migrations
- [x] Shared CRUD styles (`shared/styles/crud.scss`)
- [x] Shared auth page styles (`shared/styles/_auth-page.scss`)

## 🚧 In Progress

_(No features currently in progress)_

## 📋 Todo

### User Management
- [x] ~~User profile edit (change name, password)~~ — Done via Change Password
- [x] ~~Multi-user support / user registration~~ — Done via Register + System Admin

### Reporting
- [ ] Export timesheet to PDF/Excel
- [ ] Monthly/yearly summary reports

### UX Improvements
- [ ] Confirmation dialog component (replace browser `confirm()`)
- [ ] Toast/notification system for success/error messages
- [ ] Loading skeleton components
- [ ] Responsive/mobile layout

### DevOps
- [ ] Docker Compose setup (API + optional services)
- [ ] Production environment configuration
- [ ] CI/CD pipeline

### Testing
- [ ] Backend unit tests (Go)
- [ ] Frontend unit tests (Vitest)
- [ ] E2E tests
