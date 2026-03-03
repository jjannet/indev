import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Eye, EyeOff, UserPlus, Moon, Sun } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  readonly icons = { Eye, EyeOff, UserPlus, Moon, Sun };

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  error = signal('');

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

    if (this.password !== this.confirmPassword) {
      this.error.set('Password and confirm password do not match');
      return;
    }

    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters');
      return;
    }

    this.loading.set(true);

    this.authService
      .register({
        full_name: this.fullName,
        email: this.email,
        password: this.password,
        confirm_password: this.confirmPassword,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.error || 'Registration failed. Please try again.');
        },
      });
  }
}
