import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Save, ArrowLeft } from 'lucide-angular';
import { JobCodeService } from '../../../../services/job-code.service';
import { CustomerService, Customer } from '../../../../services/customer.service';
import { ProjectService, Project } from '../../../../services/project.service';

@Component({
  selector: 'app-job-code-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './job-code-form.html',
  styleUrl: './job-code-form.scss',
})
export class JobCodeFormComponent implements OnInit {
  readonly icons = { Save, ArrowLeft };

  isEdit = signal(false);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  id = 0;
  customers = signal<Customer[]>([]);
  projects = signal<Project[]>([]);

  form = {
    code: '',
    name: '',
    type: 'billable',
    customer_id: 0,
    project_id: 0,
    status: 'active',
    description: '',
  };

  constructor(
    private readonly jobCodeService: JobCodeService,
    private readonly customerService: CustomerService,
    private readonly projectService: ProjectService,
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
    this.jobCodeService.getById(this.id).subscribe({
      next: (res) => {
        const d = res.data;
        this.form = {
          code: d.code,
          name: d.name,
          type: d.type,
          customer_id: d.customer_id,
          project_id: d.project_id,
          status: d.status,
          description: d.description || '',
        };
        if (d.customer_id) {
          this.projectService.getActive(d.customer_id).subscribe((r) => this.projects.set(r.data || []));
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load job code');
        this.loading.set(false);
      },
    });
  }

  onCustomerChange(): void {
    this.form.project_id = 0;
    this.projects.set([]);
    if (this.form.customer_id) {
      this.projectService.getActive(this.form.customer_id).subscribe((res) => this.projects.set(res.data || []));
    }
  }

  onSubmit(): void {
    this.error.set('');
    this.saving.set(true);

    const obs = this.isEdit()
      ? this.jobCodeService.update(this.id, this.form)
      : this.jobCodeService.create(this.form);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/work/job-codes']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save job code');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/work/job-codes']);
  }
}
