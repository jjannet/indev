import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserItem {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_system_admin: boolean;
  force_reset_password: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedUsers {
  data: UserItem[];
  total: number;
  page: number;
  page_size: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/system-admin`;

  constructor(private readonly http: HttpClient) {}

  getAll(params: Record<string, string> = {}): Observable<PaginatedUsers> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) httpParams = httpParams.set(key, value);
    }
    return this.http.get<PaginatedUsers>(`${this.apiUrl}/users`, { params: httpParams });
  }

  getById(id: number): Observable<{ data: UserItem }> {
    return this.http.get<{ data: UserItem }>(`${this.apiUrl}/users/${id}`);
  }

  create(data: {
    full_name: string;
    email: string;
    password: string;
    is_system_admin: boolean;
  }): Observable<{ data: UserItem }> {
    return this.http.post<{ data: UserItem }>(`${this.apiUrl}/users`, data);
  }

  update(
    id: number,
    data: {
      full_name?: string;
      password?: string;
      is_system_admin?: boolean;
      status?: string;
    },
  ): Observable<{ data: UserItem }> {
    return this.http.put<{ data: UserItem }>(`${this.apiUrl}/users/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${id}`);
  }
}
