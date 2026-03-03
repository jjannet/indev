import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout').then((m) => m.LayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
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
      {
        path: 'work/work-period-configs/new',
        loadComponent: () =>
          import('./pages/work/work-period-configs/config-form/config-form').then((m) => m.ConfigFormComponent),
      },
      {
        path: 'work/work-period-configs/:id',
        loadComponent: () =>
          import('./pages/work/work-period-configs/config-form/config-form').then((m) => m.ConfigFormComponent),
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
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
