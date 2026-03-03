import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule, Plus, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, Clock,
} from 'lucide-angular';
import { WorkLogService, WorkLog, WorkLogSummary } from '../../../../services/work-log.service';
import { WorkPeriodConfigService, WorkPeriodConfig } from '../../../../services/work-period-config.service';
import { ProjectService, Project } from '../../../../services/project.service';
import { CustomerService, Customer } from '../../../../services/customer.service';
import { TimesheetService } from '../../../../services/timesheet.service';

@Component({
  selector: 'app-work-log-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './work-log-list.html',
  styleUrl: './work-log-list.scss',
})
export class WorkLogListComponent implements OnInit {
  readonly icons = { Plus, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, Clock };

  data = signal<WorkLog[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(50);
  totalPages = signal(0);
  loading = signal(false);

  workPeriods = signal<WorkPeriodConfig[]>([]);
  selectedPeriodId = 0;
  projects = signal<Project[]>([]);
  customers = signal<Customer[]>([]);

  timesheetStatus = signal('in_progress');
  summary = signal<WorkLogSummary | null>(null);

  projectFilter = '';
  customerFilter = '';
  statusFilter = '';

  constructor(
    private readonly workLogService: WorkLogService,
    private readonly wpService: WorkPeriodConfigService,
    private readonly projectService: ProjectService,
    private readonly customerService: CustomerService,
    private readonly timesheetService: TimesheetService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.projectService.getActive().subscribe((r) => this.projects.set(r.data || []));
    this.customerService.getActive().subscribe((r) => this.customers.set(r.data || []));
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.wpService.getAll({ page_size: '100', status: 'active' }).subscribe((r) => {
      const periods = (r.data || []).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      this.workPeriods.set(periods);
      if (periods.length > 0) {
        const now = new Date();
        const current = periods.find((p) => p.year === now.getFullYear() && p.month === now.getMonth() + 1);
        this.selectedPeriodId = current ? current.id : periods[0].id;
        this.loadAll();
      }
    });
  }

  onPeriodChange(): void {
    this.page.set(1);
    this.loadAll();
  }

  loadAll(): void {
    this.loadLogs();
    this.loadSummary();
    this.loadTimesheetStatus();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.workLogService.getAll({
      work_period_id: this.selectedPeriodId.toString(),
      page: this.page().toString(),
      page_size: this.pageSize().toString(),
      project_id: this.projectFilter,
      customer_id: this.customerFilter,
      status: this.statusFilter,
    }).subscribe({
      next: (res) => {
        this.data.set(res.data || []);
        this.total.set(res.total);
        this.totalPages.set(res.total_pages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadSummary(): void {
    if (!this.selectedPeriodId) return;
    this.workLogService.getSummary(this.selectedPeriodId).subscribe({
      next: (res) => this.summary.set(res.data),
    });
  }

  loadTimesheetStatus(): void {
    if (!this.selectedPeriodId) return;
    this.timesheetService.getByPeriod(this.selectedPeriodId).subscribe({
      next: (res) => this.timesheetStatus.set(res.data.timesheet.status),
      error: () => this.timesheetStatus.set('in_progress'),
    });
  }

  onFilter(): void {
    this.page.set(1);
    this.loadLogs();
  }

  goToPage(p: number): void {
    this.page.set(p);
    this.loadLogs();
  }

  create(): void {
    this.router.navigate(['/dashboard/work/work-logs/new']);
  }

  edit(id: number): void {
    this.router.navigate(['/dashboard/work/work-logs', id]);
  }

  copyLog(item: WorkLog): void {
    this.router.navigate(['/dashboard/work/work-logs/new'], {
      queryParams: { copy_from: item.id },
    });
  }

  remove(item: WorkLog): void {
    if (!confirm(`Delete work log "${item.description}"?`)) return;
    this.workLogService.delete(item.id).subscribe(() => this.loadAll());
  }

  get isLocked(): boolean {
    return this.timesheetStatus() === 'done';
  }

  get pages(): number[] {
    const p: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) p.push(i);
    return p;
  }

  formatDuration(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  formatDate(d: string): string {
    return d ? d.substring(0, 10) : '-';
  }

  periodLabel(p: WorkPeriodConfig): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${months[p.month - 1]} ${p.year}`;
  }
}
