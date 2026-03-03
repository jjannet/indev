import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight,
  ShieldCheck, ShieldOff,
} from 'lucide-angular';
import { UserService, UserItem } from '../../../services/user.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserListComponent implements OnInit {
  readonly icons = { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, ShieldCheck, ShieldOff };

  users = signal<UserItem[]>([]);
  loading = signal(false);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  search = '';
  statusFilter = '';

  constructor(
    private readonly userService: UserService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService
      .getAll({
        page: this.page().toString(),
        page_size: this.pageSize.toString(),
        search: this.search,
        status: this.statusFilter,
        sort_by: 'created_at',
        sort_dir: 'desc',
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data || []);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(): void {
    this.page.set(1);
    this.loadUsers();
  }

  onStatusFilter(): void {
    this.page.set(1);
    this.loadUsers();
  }

  get totalPages(): number {
    return Math.ceil(this.total() / this.pageSize);
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages) {
      this.page.update((p) => p + 1);
      this.loadUsers();
    }
  }

  addUser(): void {
    this.router.navigate(['/dashboard/system-admin/users/new']);
  }

  editUser(id: number): void {
    this.router.navigate(['/dashboard/system-admin/users', id]);
  }

  deleteUser(user: UserItem): void {
    if (!confirm(`ต้องการปิดการใช้งาน "${user.full_name}" ใช่หรือไม่?`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => this.loadUsers(),
    });
  }
}
