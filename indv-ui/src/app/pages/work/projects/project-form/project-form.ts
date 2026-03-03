import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Save, ArrowLeft } from 'lucide-angular';
import { ProjectService } from '../../../../services/project.service';
import { CustomerService, Customer } from '../../../../services/customer.service';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
})
export class ProjectFormComponent implements OnInit {
  readonly icons = { Save, ArrowLeft };

  isEdit = signal(false);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  id = 0;
  customers = signal<Customer[]>([]);

  form = {
    code: '',
    name: '',
    start_date: '',
    end_date: '',
    status: 'active',
    description: '',
    customer_ids: [] as number[],
  };

  constructor(
    private readonly projectService: ProjectService,
    private readonly customerService: CustomerService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.customerService.getActive().subscribe((res) => this.customers.set(res.data || []));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.id = +idParam;
      this.loadData();
    }
  }

  loadData(): void {
    this.loading.set(true);
    this.projectService.getById(this.id).subscribe({
      next: (res) => {
        const d = res.data;
        this.form = {
          code: d.code,
          name: d.name,
          start_date: d.start_date ? d.start_date.substring(0, 10) : '',
          end_date: d.end_date ? d.end_date.substring(0, 10) : '',
          status: d.status,
          description: d.description || '',
          customer_ids: d.customers?.map((c) => c.id) || [],
        };
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load project');
        this.loading.set(false);
      },
    });
  }

  toggleCustomer(id: number): void {
    const idx = this.form.customer_ids.indexOf(id);
    if (idx >= 0) {
      this.form.customer_ids.splice(idx, 1);
    } else {
      this.form.customer_ids.push(id);
    }
  }

  isCustomerSelected(id: number): boolean {
    return this.form.customer_ids.includes(id);
  }

  onSubmit(): void {
    this.error.set('');
    this.saving.set(true);

    const obs = this.isEdit()
      ? this.projectService.update(this.id, this.form)
      : this.projectService.create(this.form);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/work/projects']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save project');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/work/projects']);
  }
}
