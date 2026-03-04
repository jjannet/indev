import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule, Plus, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, Clock,
  ChevronDown, ChevronUp,
} from 'lucide-angular';
import { WorkLogService, WorkLog, WorkLogSummary } from '../../../../services/work-log.service';
import { WorkPeriodConfigService, WorkPeriodConfig } from '../../../../services/work-period-config.service';
import { ProjectService, Project } from '../../../../services/project.service';
import { CustomerService, Customer } from '../../../../services/customer.service';
import { TimesheetService } from '../../../../services/timesheet.service';

export interface DateGroup {
  date: string;
  label: string;
  totalDuration: number;
  count: number;
  expanded: boolean;
  logs: WorkLog[];
}

@Component({
  selector: 'app-work-log-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './work-log-list.html',
  styleUrl: './work-log-list.scss',
})
export class WorkLogListComponent implements OnInit {
  readonly icons = { Plus, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, Clock, ChevronDown, ChevronUp };

  private readonly thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

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

  dateGroups = signal<DateGroup[]>([]);

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
    this.wpService.getAll({ page_size: '100', status: 'confirmed' }).subscribe((r) => {
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
        const logs = res.data || [];
        this.data.set(logs);
        this.total.set(res.total);
        this.totalPages.set(res.total_pages);
        this.buildGroups(logs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildGroups(logs: WorkLog[]): void {
    const map = new Map<string, WorkLog[]>();
    for (const log of logs) {
      const key = log.date.substring(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }

    const groups: DateGroup[] = [];
    let first = true;
    for (const [date, items] of map) {
      groups.push({
        date,
        label: this.formatGroupDate(date),
        totalDuration: items.reduce((sum, l) => sum + (l.duration || 0), 0),
        count: items.length,
        expanded: first,
        logs: items,
      });
      first = false;
    }
    this.dateGroups.set(groups);
  }

  private formatGroupDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const dayName = this.thaiDays[d.getDay()];
    return `${dd}/${mm}/${yyyy} (${dayName})`;
  }

  toggleGroup(group: DateGroup): void {
    group.expanded = !group.expanded;
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
    const plain = this.stripHtml(item.description).substring(0, 50);
    if (!confirm(`Delete work log "${plain}"?`)) return;
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

  get colSpan(): number {
    return this.isLocked ? 8 : 9;
  }

  formatDuration(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  formatGroupDuration(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  stripHtml(html: string): string {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  truncateDescription(html: string, max = 50): string {
    const plain = this.stripHtml(html);
    return plain.length > max ? plain.substring(0, max) + '...' : plain;
  }

  periodLabel(p: WorkPeriodConfig): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${months[p.month - 1]} ${p.year}`;
  }
}
