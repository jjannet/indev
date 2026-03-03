import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  LayoutDashboard,
  Users,
  Settings,
  FolderOpen,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Building2,
  FolderKanban,
  Code2,
  CalendarClock,
  ClipboardList,
  FileSpreadsheet,
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  readonly icons = {
    LayoutDashboard, Users, Settings, FolderOpen, Briefcase,
    ChevronDown, ChevronRight, Building2, FolderKanban, Code2, CalendarClock,
    ClipboardList, FileSpreadsheet,
  };

  readonly menuItems = [
    { label: 'Dashboard', icon: this.icons.LayoutDashboard, route: '/dashboard', exact: true },
  ];

  readonly workMenuItems = [
    { label: 'Customers', icon: this.icons.Building2, route: '/dashboard/work/customers' },
    { label: 'Projects', icon: this.icons.FolderKanban, route: '/dashboard/work/projects' },
    { label: 'Job Codes', icon: this.icons.Code2, route: '/dashboard/work/job-codes' },
    { label: 'Period Configs', icon: this.icons.CalendarClock, route: '/dashboard/work/work-period-configs' },
    { label: 'Work Logs', icon: this.icons.ClipboardList, route: '/dashboard/work/work-logs' },
    { label: 'Timesheet', icon: this.icons.FileSpreadsheet, route: '/dashboard/work/timesheet' },
  ];

  workExpanded = signal(true);

  toggleWork(): void {
    this.workExpanded.update((v) => !v);
  }
}
