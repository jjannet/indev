import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Customer {
  id: number;
  code: string;
  name: string;
  short_name: string;
  status: string;
  description: string;
  user_id: number;
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
export class CustomerService {
  private readonly url = `${environment.apiUrl}/customers`;

  constructor(private readonly http: HttpClient) {}

  getAll(params: Record<string, string> = {}): Observable<PaginatedResponse<Customer>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((k) => {
      if (params[k]) httpParams = httpParams.set(k, params[k]);
    });
    return this.http.get<PaginatedResponse<Customer>>(this.url, { params: httpParams });
  }

  getActive(): Observable<{ data: Customer[] }> {
    return this.http.get<{ data: Customer[] }>(`${this.url}/active`);
  }

  getById(id: number): Observable<{ data: Customer }> {
    return this.http.get<{ data: Customer }>(`${this.url}/${id}`);
  }

  create(data: Partial<Customer>): Observable<{ data: Customer }> {
    return this.http.post<{ data: Customer }>(this.url, data);
  }

  update(id: number, data: Partial<Customer>): Observable<{ data: Customer }> {
    return this.http.put<{ data: Customer }>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
