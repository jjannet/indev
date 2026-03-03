import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  LucideAngularModule, Plus, Pencil, Clock, FileSpreadsheet, List, Lock,
} from 'lucide-angular';
import { WorkLogService, WorkLog } from '../../services/work-log.service';
import { TimesheetService } from '../../services/timesheet.service';
import { WorkPeriodConfigService } from '../../services/work-period-config.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  readonly icons = { Plus, Pencil, Clock, FileSpreadsheet, List, Lock };

  todayLogs = signal<WorkLog[]>([]);
  todayTotal = signal(0);
  todayCount = signal(0);
  loading = signal(false);
  timesheetLocked = signal(false);
  readonly maxDisplay = 5;

  constructor(
    private readonly workLogService: WorkLogService,
    private readonly timesheetService: TimesheetService,
    private readonly wpService: WorkPeriodConfigService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadTodayLogs();
    this.loadTimesheetStatus();
  }

  private loadTodayLogs(): void {
    this.loading.set(true);
    this.workLogService.getAll({
      date: this.todayStr(),
      page: '1',
      page_size: '100',
    }).subscribe({
      next: (res) => {
        const logs = res.data || [];
        this.todayCount.set(logs.length);
        this.todayTotal.set(logs.reduce((sum, l) => sum + l.duration, 0));
        this.todayLogs.set(logs.slice(0, this.maxDisplay));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadTimesheetStatus(): void {
    this.wpService.getAll({ page_size: '100', status: 'active' }).subscribe((r) => {
      const now = new Date();
      const current = (r.data || []).find(
        (p) => p.year === now.getFullYear() && p.month === now.getMonth() + 1,
      );
      if (current) {
        this.timesheetService.getByPeriod(current.id).subscribe({
          next: (res) => this.timesheetLocked.set(res.data.timesheet.status === 'done'),
          error: () => this.timesheetLocked.set(false),
        });
      }
    });
  }

  get todayDateStr(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  get extraCount(): number {
    return Math.max(0, this.todayCount() - this.maxDisplay);
  }

  formatDuration(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  addWorkLog(): void {
    this.router.navigate(['/dashboard/work/work-logs/new']);
  }

  editWorkLog(id: number): void {
    this.router.navigate(['/dashboard/work/work-logs', id]);
  }

  goToWorkLogs(): void {
    this.router.navigate(['/dashboard/work/work-logs']);
  }

  goToTimesheet(): void {
    this.router.navigate(['/dashboard/work/timesheet']);
  }

  private todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
