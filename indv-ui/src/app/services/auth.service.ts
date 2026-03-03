import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_system_admin: boolean;
  force_reset_password: boolean;
  status: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  readonly currentUser = signal<User | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.loadUser();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
      }),
    );
  }

  register(data: RegisterRequest): Observable<{ data: User }> {
    return this.http.post<{ data: User }>(`${this.apiUrl}/auth/register`, data);
  }

  forceResetPassword(data: { new_password: string; confirm_new_password: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/auth/reset-password`, data).pipe(
      tap(() => {
        const user = this.currentUser();
        if (user) {
          const updated = { ...user, force_reset_password: false };
          localStorage.setItem('user', JSON.stringify(updated));
          this.currentUser.set(updated);
        }
      }),
    );
  }

  changePassword(data: {
    current_password: string;
    new_password: string;
    confirm_new_password: string;
  }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/auth/change-password`, data);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isSystemAdmin(): boolean {
    return this.currentUser()?.is_system_admin ?? false;
  }

  isForceReset(): boolean {
    return this.currentUser()?.force_reset_password ?? false;
  }

  private loadUser(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser.set(JSON.parse(userData));
    }
  }
}
