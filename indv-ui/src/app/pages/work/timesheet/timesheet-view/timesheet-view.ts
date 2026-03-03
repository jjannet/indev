import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule, Lock, Unlock, Clock, ChevronDown, ChevronRight,
} from 'lucide-angular';
import {
  TimesheetService, TimesheetSummary, DailySummaryEntry,
} from '../../../../services/timesheet.service';
import {
  WorkPeriodConfigService, WorkPeriodConfig,
} from '../../../../services/work-period-config.service';

@Component({
  selector: 'app-timesheet-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './timesheet-view.html',
  styleUrl: './timesheet-view.scss',
})
export class TimesheetViewComponent implements OnInit {
  readonly icons = { Lock, Unlock, Clock, ChevronDown, ChevronRight };

  workPeriods = signal<WorkPeriodConfig[]>([]);
  selectedPeriodId = 0;
  data = signal<TimesheetSummary | null>(null);
  loading = signal(false);
  toggling = signal(false);
  expandedDays = signal<Set<string>>(new Set());

  constructor(
    private readonly timesheetService: TimesheetService,
    private readonly wpService: WorkPeriodConfigService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
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
        this.load();
      }
    });
  }

  onPeriodChange(): void {
    this.expandedDays.set(new Set());
    this.load();
  }

  load(): void {
    if (!this.selectedPeriodId) return;
    this.loading.set(true);
    this.timesheetService.getByPeriod(this.selectedPeriodId).subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleStatus(): void {
    const d = this.data();
    if (!d) return;
    const newStatus = d.timesheet.status === 'done' ? 'in_progress' : 'done';
    const msg = newStatus === 'done'
      ? 'Close this timesheet? All work logs will become read-only.'
      : 'Re-open this timesheet? Work logs will be editable again.';
    if (!confirm(msg)) return;

    this.toggling.set(true);
    this.timesheetService.updateStatus(this.selectedPeriodId, newStatus).subscribe({
      next: () => {
        this.toggling.set(false);
        this.load();
      },
      error: () => this.toggling.set(false),
    });
  }

  toggleDay(dateStr: string): void {
    const set = new Set(this.expandedDays());
    if (set.has(dateStr)) {
      set.delete(dateStr);
    } else {
      set.add(dateStr);
    }
    this.expandedDays.set(set);
  }

  isDayExpanded(dateStr: string): boolean {
    return this.expandedDays().has(dateStr);
  }

  get isLocked(): boolean {
    return this.data()?.timesheet.status === 'done';
  }

  formatDuration(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  formatHours(mins: number): string {
    return (mins / 60).toFixed(1) + 'h';
  }

  periodLabel(p: WorkPeriodConfig): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${months[p.month - 1]} ${p.year}`;
  }

  dayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[d.getDay()]} ${dateStr}`;
  }

  editLog(id: number): void {
    this.router.navigate(['/dashboard/work/work-logs', id]);
  }
}
