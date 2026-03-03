import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideAngularModule, ArrowLeft, ClipboardCopy, Check,
} from 'lucide-angular';
import {
  TimesheetService, TimesheetSummary,
} from '../../../../services/timesheet.service';
import { WorkLog } from '../../../../services/work-log.service';

interface JobCodeCol {
  id: number;
  code: string;
  name: string;
  label: string;
}

interface PivotRow {
  date: string;
  projectName: string;
  description: string;
  refId: string;
  jobCodeDurations: Map<number, number>;
  dayTotal: number;
  isSubtotal: boolean;
}

@Component({
  selector: 'app-timesheet-report',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './timesheet-report.html',
  styleUrl: './timesheet-report.scss',
})
export class TimesheetReportComponent implements OnInit {
  readonly icons = { ArrowLeft, ClipboardCopy, Check };

  loading = signal(false);
  data = signal<TimesheetSummary | null>(null);
  copied = signal(false);

  jobCodeCols: JobCodeCol[] = [];
  pivotRows: PivotRow[] = [];
  grandTotals: Map<number, number> = new Map();
  grandTotal = 0;

  private periodId = 0;

  constructor(
    private readonly timesheetService: TimesheetService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.periodId = +(this.route.snapshot.queryParamMap.get('period_id') || '0');
    if (this.periodId) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.timesheetService.getByPeriod(this.periodId).subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.buildPivot(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildPivot(summary: TimesheetSummary): void {
    const jcMap = new Map<number, JobCodeCol>();
    const allLogs: WorkLog[] = [];

    for (const day of summary.daily_summaries) {
      for (const log of day.logs) {
        allLogs.push(log);
        if (log.job_code_id && log.job_code) {
          if (!jcMap.has(log.job_code_id)) {
            jcMap.set(log.job_code_id, {
              id: log.job_code_id,
              code: log.job_code.code,
              name: log.job_code.name,
              label: `${log.job_code.code} : ${log.job_code.name}`,
            });
          }
        }
      }
    }

    this.jobCodeCols = Array.from(jcMap.values()).sort((a, b) => a.code.localeCompare(b.code));

    this.pivotRows = [];
    this.grandTotals = new Map();
    this.grandTotal = 0;

    for (const col of this.jobCodeCols) {
      this.grandTotals.set(col.id, 0);
    }

    const dateGroups = new Map<string, WorkLog[]>();
    for (const log of allLogs) {
      const dateStr = log.date.substring(0, 10);
      if (!dateGroups.has(dateStr)) {
        dateGroups.set(dateStr, []);
      }
      dateGroups.get(dateStr)!.push(log);
    }

    const sortedDates = Array.from(dateGroups.keys()).sort();

    for (const dateStr of sortedDates) {
      const logs = dateGroups.get(dateStr)!;
      logs.sort((a, b) => a.start_time.localeCompare(b.start_time));

      const daySubtotals = new Map<number, number>();
      for (const col of this.jobCodeCols) {
        daySubtotals.set(col.id, 0);
      }
      let dayTotal = 0;

      for (const log of logs) {
        const jcDurations = new Map<number, number>();
        if (log.job_code_id && log.duration) {
          jcDurations.set(log.job_code_id, log.duration);
          daySubtotals.set(log.job_code_id, (daySubtotals.get(log.job_code_id) || 0) + log.duration);
          this.grandTotals.set(log.job_code_id, (this.grandTotals.get(log.job_code_id) || 0) + log.duration);
        }
        dayTotal += log.duration;

        this.pivotRows.push({
          date: dateStr,
          projectName: log.project?.name || '-',
          description: this.stripHtml(log.description),
          refId: log.ref_id || '',
          jobCodeDurations: jcDurations,
          dayTotal: 0,
          isSubtotal: false,
        });
      }

      this.pivotRows.push({
        date: '',
        projectName: '',
        description: `รวม ${this.formatDateShort(dateStr)}`,
        refId: '',
        jobCodeDurations: daySubtotals,
        dayTotal,
        isSubtotal: true,
      });

      this.grandTotal += dayTotal;
    }
  }

  getJcDuration(row: PivotRow, jcId: number): string {
    const d = row.jobCodeDurations.get(jcId) || 0;
    return d ? this.formatDuration(d) : '';
  }

  formatDuration(mins: number): string {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private formatDurationThai(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} ชั่วโมง ${m} นาที`;
    if (h > 0) return `${h} ชั่วโมง`;
    return `${m} นาที`;
  }

  private formatDateShort(dateStr: string): string {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}`;
  }

  formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
  }

  private stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  getGrandTotal(jcId: number): string {
    return this.formatDuration(this.grandTotals.get(jcId) || 0);
  }

  copyToClipboard(): void {
    const summary = this.data();
    if (!summary) return;

    const lines: string[] = [];
    const dateGroups = new Map<string, WorkLog[]>();

    for (const day of summary.daily_summaries) {
      for (const log of day.logs) {
        const dateStr = log.date.substring(0, 10);
        if (!dateGroups.has(dateStr)) {
          dateGroups.set(dateStr, []);
        }
        dateGroups.get(dateStr)!.push(log);
      }
    }

    const sortedDates = Array.from(dateGroups.keys()).sort();

    for (const dateStr of sortedDates) {
      const logs = dateGroups.get(dateStr)!;
      logs.sort((a, b) => a.start_time.localeCompare(b.start_time));

      if (lines.length > 0) lines.push('');
      lines.push(dateStr);

      logs.forEach((log, idx) => {
        const desc = this.stripHtml(log.description);
        const dur = this.formatDurationThai(log.duration);
        const jcLabel = log.job_code ? `${log.job_code.code} : ${log.job_code.name}` : '-';
        let line = `${idx + 1}. ${desc} ใช้เวลา ${dur} - job code ${jcLabel}`;
        if (log.ref_id) {
          line += ` - ref id - ${log.ref_id}`;
        }
        lines.push(line);
      });
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/work/timesheet']);
  }
}
