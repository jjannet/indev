import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Customer } from './customer.service';

export interface Project {
  id: number;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  description: string;
  user_id: number;
  customers: Customer[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly url = `${environment.apiUrl}/projects`;

  constructor(private readonly http: HttpClient) {}

  getAll(params: Record<string, string> = {}): Observable<PaginatedResponse<Project>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((k) => {
      if (params[k]) httpParams = httpParams.set(k, params[k]);
    });
    return this.http.get<PaginatedResponse<Project>>(this.url, { params: httpParams });
  }

  getActive(customerId?: number): Observable<{ data: Project[] }> {
    let httpParams = new HttpParams();
    if (customerId) httpParams = httpParams.set('customer_id', customerId.toString());
    return this.http.get<{ data: Project[] }>(`${this.url}/active`, { params: httpParams });
  }

  getById(id: number): Observable<{ data: Project }> {
    return this.http.get<{ data: Project }>(`${this.url}/${id}`);
  }

  create(data: Record<string, unknown>): Observable<{ data: Project }> {
    return this.http.post<{ data: Project }>(this.url, data);
  }

  update(id: number, data: Record<string, unknown>): Observable<{ data: Project }> {
    return this.http.put<{ data: Project }>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
