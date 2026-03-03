import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, Check, Pencil, Lock, X, Save } from 'lucide-angular';
import { WorkPeriodConfigService, WorkPeriodConfig } from '../../../../services/work-period-config.service';

@Component({
  selector: 'app-config-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './config-list.html',
  styleUrl: './config-list.scss',
})
export class ConfigListComponent implements OnInit {
  readonly icons = { ChevronLeft, ChevronRight, Check, Pencil, Lock, X, Save };
  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  data = signal<WorkPeriodConfig[]>([]);
  loading = signal(false);
  selectedYear = new Date().getFullYear();

  editingId: number | null = null;
  editStartDate = '';
  editEndDate = '';

  constructor(private readonly configService: WorkPeriodConfigService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.editingId = null;
    this.configService.getByYear(this.selectedYear).subscribe({
      next: (res) => {
        this.data.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  prevYear(): void {
    this.selectedYear--;
    this.load();
  }

  nextYear(): void {
    this.selectedYear++;
    this.load();
  }

  monthName(m: number): string {
    return this.monthNames[m - 1] || '';
  }

  formatDate(d: string): string {
    return d ? d.substring(0, 10) : '-';
  }

  startEdit(item: WorkPeriodConfig): void {
    this.editingId = item.id;
    this.editStartDate = this.formatDate(item.start_date);
    this.editEndDate = this.formatDate(item.end_date);
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(item: WorkPeriodConfig): void {
    this.configService.update(item.id, {
      start_date: this.editStartDate,
      end_date: this.editEndDate,
    }).subscribe({
      next: () => this.load(),
      error: (err) => alert(err.error?.error || 'Failed to update'),
    });
  }

  confirm(item: WorkPeriodConfig): void {
    this.configService.confirm(item.id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err.error?.error || 'Failed to confirm'),
    });
  }
}
