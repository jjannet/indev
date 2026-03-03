import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Save, ArrowLeft, Eye, EyeOff } from 'lucide-angular';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserFormComponent implements OnInit {
  readonly icons = { Save, ArrowLeft, Eye, EyeOff };

  isEdit = signal(false);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  showPassword = signal(false);
  id = 0;
  isSelf = false;

  form = {
    full_name: '',
    email: '',
    password: '',
    is_system_admin: false,
    status: 'active',
  };

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.id = +idParam;
      this.isSelf = this.authService.currentUser()?.id === this.id;
      this.loadData();
    }
  }

  loadData(): void {
    this.loading.set(true);
    this.userService.getById(this.id).subscribe({
      next: (res) => {
        const u = res.data;
        this.form = {
          full_name: u.full_name,
          email: u.email,
          password: '',
          is_system_admin: u.is_system_admin,
          status: u.status,
        };
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load user');
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    this.error.set('');
    this.saving.set(true);

    if (this.isEdit()) {
      const payload: Record<string, unknown> = {
        full_name: this.form.full_name,
        is_system_admin: this.form.is_system_admin,
        status: this.form.status,
      };
      if (this.form.password) {
        payload['password'] = this.form.password;
      }
      this.userService.update(this.id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/dashboard/system-admin/users']);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error || 'Failed to update user');
        },
      });
    } else {
      if (!this.form.password || this.form.password.length < 8) {
        this.saving.set(false);
        this.error.set('Password must be at least 8 characters');
        return;
      }
      this.userService
        .create({
          full_name: this.form.full_name,
          email: this.form.email,
          password: this.form.password,
          is_system_admin: this.form.is_system_admin,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/dashboard/system-admin/users']);
          },
          error: (err) => {
            this.saving.set(false);
            this.error.set(err.error?.error || 'Failed to create user');
          },
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/system-admin/users']);
  }
}
