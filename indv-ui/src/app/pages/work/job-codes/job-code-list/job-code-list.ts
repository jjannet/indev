import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-angular';
import { JobCodeService, JobCode, PaginatedResponse } from '../../../../services/job-code.service';
import { CustomerService, Customer } from '../../../../services/customer.service';
import { ProjectService, Project } from '../../../../services/project.service';

@Component({
  selector: 'app-job-code-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './job-code-list.html',
  styleUrl: './job-code-list.scss',
})
export class JobCodeListComponent implements OnInit {
  readonly icons = { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight };

  data = signal<JobCode[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  loading = signal(false);
  customers = signal<Customer[]>([]);
  projects = signal<Project[]>([]);

  search = '';
  statusFilter = '';
  customerFilter = '';
  projectFilter = '';
  sortBy = 'id';
  sortDir = 'desc';

  constructor(
    private readonly jobCodeService: JobCodeService,
    private readonly customerService: CustomerService,
    private readonly projectService: ProjectService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.customerService.getActive().subscribe((res) => this.customers.set(res.data || []));
    this.load();
  }

  onCustomerFilterChange(): void {
    this.projectFilter = '';
    if (this.customerFilter) {
      this.projectService.getActive(+this.customerFilter).subscribe((res) => this.projects.set(res.data || []));
    } else {
      this.projects.set([]);
    }
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.jobCodeService
      .getAll({
        page: this.page().toString(),
        page_size: this.pageSize().toString(),
        search: this.search,
        status: this.statusFilter,
        customer_id: this.customerFilter,
        project_id: this.projectFilter,
        sort_by: this.sortBy,
        sort_dir: this.sortDir,
      })
      .subscribe({
        next: (res: PaginatedResponse<JobCode>) => {
          this.data.set(res.data || []);
          this.total.set(res.total);
          this.totalPages.set(res.total_pages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(): void { this.page.set(1); this.load(); }
  onFilter(): void { this.page.set(1); this.load(); }

  sort(col: string): void {
    if (this.sortBy === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = col;
      this.sortDir = 'asc';
    }
    this.load();
  }

  goToPage(p: number): void { this.page.set(p); this.load(); }
  create(): void { this.router.navigate(['/dashboard/work/job-codes/new']); }
  edit(id: number): void { this.router.navigate(['/dashboard/work/job-codes', id]); }

  remove(item: JobCode): void {
    if (!confirm(`Deactivate job code "${item.name}"?`)) return;
    this.jobCodeService.delete(item.id).subscribe(() => this.load());
  }

  get pages(): number[] {
    const p: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) p.push(i);
    return p;
  }
}
