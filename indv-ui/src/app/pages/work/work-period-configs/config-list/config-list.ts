import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-angular';
import { WorkPeriodConfigService, WorkPeriodConfig, PaginatedResponse } from '../../../../services/work-period-config.service';

@Component({
  selector: 'app-config-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './config-list.html',
  styleUrl: './config-list.scss',
})
export class ConfigListComponent implements OnInit {
  readonly icons = { Plus, Pencil, Trash2, ChevronLeft, ChevronRight };
  readonly months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  data = signal<WorkPeriodConfig[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  loading = signal(false);

  statusFilter = '';
  yearFilter = '';
  sortBy = 'id';
  sortDir = 'desc';

  years: number[] = [];

  constructor(
    private readonly configService: WorkPeriodConfigService,
    private readonly router: Router,
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      this.years.push(y);
    }
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.configService
      .getAll({
        page: this.page().toString(),
        page_size: this.pageSize().toString(),
        status: this.statusFilter,
        year: this.yearFilter,
      })
      .subscribe({
        next: (res: PaginatedResponse<WorkPeriodConfig>) => {
          this.data.set(res.data || []);
          this.total.set(res.total);
          this.totalPages.set(res.total_pages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onFilter(): void { this.page.set(1); this.load(); }

  goToPage(p: number): void { this.page.set(p); this.load(); }
  create(): void { this.router.navigate(['/dashboard/work/work-period-configs/new']); }
  edit(id: number): void { this.router.navigate(['/dashboard/work/work-period-configs', id]); }

  remove(item: WorkPeriodConfig): void {
    if (!confirm(`Deactivate config for ${this.monthName(item.month)} ${item.year}?`)) return;
    this.configService.delete(item.id).subscribe(() => this.load());
  }

  monthName(m: number): string {
    return this.months[m - 1] || '';
  }

  formatDate(d: string): string {
    return d ? d.substring(0, 10) : '-';
  }

  get pages(): number[] {
    const p: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) p.push(i);
    return p;
  }
}
