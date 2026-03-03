import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Save, ArrowLeft } from 'lucide-angular';
import { CustomerService } from '../../../../services/customer.service';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss',
})
export class CustomerFormComponent implements OnInit {
  readonly icons = { Save, ArrowLeft };

  isEdit = signal(false);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  id = 0;

  form = {
    code: '',
    name: '',
    short_name: '',
    status: 'active',
    description: '',
  };

  constructor(
    private readonly customerService: CustomerService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.id = +idParam;
      this.loadData();
    }
  }

  loadData(): void {
    this.loading.set(true);
    this.customerService.getById(this.id).subscribe({
      next: (res) => {
        this.form = {
          code: res.data.code,
          name: res.data.name,
          short_name: res.data.short_name,
          status: res.data.status,
          description: res.data.description || '',
        };
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load customer');
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    this.error.set('');
    this.saving.set(true);

    const obs = this.isEdit()
      ? this.customerService.update(this.id, this.form)
      : this.customerService.create(this.form);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/work/customers']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save customer');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/work/customers']);
  }
}
