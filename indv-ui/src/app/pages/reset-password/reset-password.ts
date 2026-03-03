import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Eye, EyeOff, KeyRound, Moon, Sun } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPasswordComponent {
  readonly icons = { Eye, EyeOff, KeyRound, Moon, Sun };

  newPassword = '';
  confirmNewPassword = '';
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    readonly themeService: ThemeService,
  ) {}

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    this.error.set('');
    this.success.set('');

    if (this.newPassword !== this.confirmNewPassword) {
      this.error.set('Password and confirm password do not match');
      return;
    }

    if (this.newPassword.length < 8) {
      this.error.set('Password must be at least 8 characters');
      return;
    }

    this.loading.set(true);

    this.authService
      .forceResetPassword({
        new_password: this.newPassword,
        confirm_new_password: this.confirmNewPassword,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set('เปลี่ยนรหัสผ่านสำเร็จ');
          setTimeout(() => this.router.navigate(['/dashboard']), 1500);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.error || 'Failed to reset password');
        },
      });
  }
}
