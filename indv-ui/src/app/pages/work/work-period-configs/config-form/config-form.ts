import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Save, ArrowLeft } from 'lucide-angular';
import { WorkPeriodConfigService } from '../../../../services/work-period-config.service';

@Component({
  selector: 'app-config-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './config-form.html',
  styleUrl: './config-form.scss',
})
export class ConfigFormComponent implements OnInit {
  readonly icons = { Save, ArrowLeft };
  readonly months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  isEdit = signal(false);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  id = 0;

  years: number[] = [];

  form = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    start_date: '',
    end_date: '',
    is_default: false,
    status: 'active',
    description: '',
  };

  constructor(
    private readonly configService: WorkPeriodConfigService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      this.years.push(y);
    }
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.id = +idParam;
      this.loadData();
    } else {
      this.setDefaultDates();
    }
  }

  loadData(): void {
    this.loading.set(true);
    this.configService.getById(this.id).subscribe({
      next: (res) => {
        const d = res.data;
        this.form = {
          year: d.year,
          month: d.month,
          start_date: d.start_date ? d.start_date.substring(0, 10) : '',
          end_date: d.end_date ? d.end_date.substring(0, 10) : '',
          is_default: d.is_default,
          status: d.status,
          description: d.description || '',
        };
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load config');
        this.loading.set(false);
      },
    });
  }

  setDefaultDates(): void {
    const start = new Date(this.form.year, this.form.month - 1, 1);
    const end = new Date(this.form.year, this.form.month, 0);
    this.form.start_date = this.toDateStr(start);
    this.form.end_date = this.toDateStr(end);
  }

  onYearMonthChange(): void {
    if (!this.isEdit()) {
      this.setDefaultDates();
    }
  }

  onSubmit(): void {
    this.error.set('');
    this.saving.set(true);

    const obs = this.isEdit()
      ? this.configService.update(this.id, this.form)
      : this.configService.create(this.form);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/work/work-period-configs']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save config');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/work/work-period-configs']);
  }

  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
