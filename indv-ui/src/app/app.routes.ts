import { Routes } from '@angular/router';
import { authGuard, guestGuard, forceResetGuard, resetPageGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register').then((m) => m.RegisterComponent),
  },
  // Force Reset Password (auth required, only accessible if force_reset_password=true)
  {
    path: 'reset-password',
    canActivate: [authGuard, resetPageGuard],
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then((m) => m.ResetPasswordComponent),
  },
  // Main app (auth + force-reset check)
  {
    path: 'dashboard',
    canActivate: [authGuard, forceResetGuard],
    loadComponent: () => import('./layout/layout').then((m) => m.LayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      // Change Password
      {
        path: 'change-password',
        loadComponent: () =>
          import('./pages/change-password/change-password').then((m) => m.ChangePasswordComponent),
      },
      // Work module - Customers
      {
        path: 'work/customers',
        loadComponent: () =>
          import('./pages/work/customers/customer-list/customer-list').then((m) => m.CustomerListComponent),
      },
      {
        path: 'work/customers/new',
        loadComponent: () =>
          import('./pages/work/customers/customer-form/customer-form').then((m) => m.CustomerFormComponent),
      },
      {
        path: 'work/customers/:id',
        loadComponent: () =>
          import('./pages/work/customers/customer-form/customer-form').then((m) => m.CustomerFormComponent),
      },
      // Work module - Projects
      {
        path: 'work/projects',
        loadComponent: () =>
          import('./pages/work/projects/project-list/project-list').then((m) => m.ProjectListComponent),
      },
      {
        path: 'work/projects/new',
        loadComponent: () =>
          import('./pages/work/projects/project-form/project-form').then((m) => m.ProjectFormComponent),
      },
      {
        path: 'work/projects/:id',
        loadComponent: () =>
          import('./pages/work/projects/project-form/project-form').then((m) => m.ProjectFormComponent),
      },
      // Work module - Job Codes
      {
        path: 'work/job-codes',
        loadComponent: () =>
          import('./pages/work/job-codes/job-code-list/job-code-list').then((m) => m.JobCodeListComponent),
      },
      {
        path: 'work/job-codes/new',
        loadComponent: () =>
          import('./pages/work/job-codes/job-code-form/job-code-form').then((m) => m.JobCodeFormComponent),
      },
      {
        path: 'work/job-codes/:id',
        loadComponent: () =>
          import('./pages/work/job-codes/job-code-form/job-code-form').then((m) => m.JobCodeFormComponent),
      },
      // Work module - Work Period Configs
      {
        path: 'work/work-period-configs',
        loadComponent: () =>
          import('./pages/work/work-period-configs/config-list/config-list').then((m) => m.ConfigListComponent),
      },
      // Work Logs
      {
        path: 'work/work-logs',
        loadComponent: () =>
          import('./pages/work/work-logs/work-log-list/work-log-list').then((m) => m.WorkLogListComponent),
      },
      {
        path: 'work/work-logs/new',
        loadComponent: () =>
          import('./pages/work/work-logs/work-log-form/work-log-form').then((m) => m.WorkLogFormComponent),
      },
      {
        path: 'work/work-logs/:id',
        loadComponent: () =>
          import('./pages/work/work-logs/work-log-form/work-log-form').then((m) => m.WorkLogFormComponent),
      },
      // Timesheet
      {
        path: 'work/timesheet',
        loadComponent: () =>
          import('./pages/work/timesheet/timesheet-view/timesheet-view').then((m) => m.TimesheetViewComponent),
      },
      {
        path: 'work/timesheet/report',
        loadComponent: () =>
          import('./pages/work/timesheet/timesheet-report/timesheet-report').then((m) => m.TimesheetReportComponent),
      },
      // System Admin (admin guard)
      {
        path: 'system-admin/users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/system-admin/user-list/user-list').then((m) => m.UserListComponent),
      },
      {
        path: 'system-admin/users/new',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/system-admin/user-form/user-form').then((m) => m.UserFormComponent),
      },
      {
        path: 'system-admin/users/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/system-admin/user-form/user-form').then((m) => m.UserFormComponent),
      },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
