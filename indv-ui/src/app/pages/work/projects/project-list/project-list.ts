import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-angular';
import { ProjectService, Project, PaginatedResponse } from '../../../../services/project.service';
import { CustomerService, Customer } from '../../../../services/customer.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
})
export class ProjectListComponent implements OnInit {
  readonly icons = { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight };

  data = signal<Project[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  loading = signal(false);
  customers = signal<Customer[]>([]);

  search = '';
  statusFilter = '';
  customerFilter = '';
  sortBy = 'id';
  sortDir = 'desc';

  constructor(
    private readonly projectService: ProjectService,
    private readonly customerService: CustomerService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
    this.load();
  }

  loadCustomers(): void {
    this.customerService.getActive().subscribe((res) => this.customers.set(res.data || []));
  }

  load(): void {
    this.loading.set(true);
    this.projectService
      .getAll({
        page: this.page().toString(),
        page_size: this.pageSize().toString(),
        search: this.search,
        status: this.statusFilter,
        customer_id: this.customerFilter,
        sort_by: this.sortBy,
        sort_dir: this.sortDir,
      })
      .subscribe({
        next: (res: PaginatedResponse<Project>) => {
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
  create(): void { this.router.navigate(['/dashboard/work/projects/new']); }
  edit(id: number): void { this.router.navigate(['/dashboard/work/projects', id]); }

  remove(item: Project): void {
    if (!confirm(`Deactivate project "${item.name}"?`)) return;
    this.projectService.delete(item.id).subscribe(() => this.load());
  }

  get pages(): number[] {
    const p: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) p.push(i);
    return p;
  }

  customerNames(item: Project): string {
    return item.customers?.map((c) => c.short_name || c.name).join(', ') || '-';
  }
}
