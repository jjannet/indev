import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-angular';
import { CustomerService, Customer, PaginatedResponse } from '../../../../services/customer.service';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerListComponent implements OnInit {
  readonly icons = { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight };

  data = signal<Customer[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  loading = signal(false);

  search = '';
  statusFilter = '';
  sortBy = 'id';
  sortDir = 'desc';

  constructor(
    private readonly customerService: CustomerService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.customerService
      .getAll({
        page: this.page().toString(),
        page_size: this.pageSize().toString(),
        search: this.search,
        status: this.statusFilter,
        sort_by: this.sortBy,
        sort_dir: this.sortDir,
      })
      .subscribe({
        next: (res: PaginatedResponse<Customer>) => {
          this.data.set(res.data || []);
          this.total.set(res.total);
          this.totalPages.set(res.total_pages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(): void {
    this.page.set(1);
    this.load();
  }

  onFilterStatus(): void {
    this.page.set(1);
    this.load();
  }

  sort(col: string): void {
    if (this.sortBy === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = col;
      this.sortDir = 'asc';
    }
    this.load();
  }

  goToPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  create(): void {
    this.router.navigate(['/dashboard/work/customers/new']);
  }

  edit(id: number): void {
    this.router.navigate(['/dashboard/work/customers', id]);
  }

  remove(item: Customer): void {
    if (!confirm(`Deactivate customer "${item.name}"?`)) return;
    this.customerService.delete(item.id).subscribe(() => this.load());
  }

  get pages(): number[] {
    const p: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) p.push(i);
    return p;
  }
}
