import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Eye, EyeOff, KeyRound } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePasswordComponent {
  readonly icons = { Eye, EyeOff, KeyRound };

  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(private readonly authService: AuthService) {}

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
      .changePassword({
        current_password: this.currentPassword,
        new_password: this.newPassword,
        confirm_new_password: this.confirmNewPassword,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set('เปลี่ยนรหัสผ่านสำเร็จ');
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmNewPassword = '';
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.error || 'Failed to change password');
        },
      });
  }
}
