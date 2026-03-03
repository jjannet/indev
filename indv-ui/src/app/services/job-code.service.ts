import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Customer } from './customer.service';
import { Project } from './project.service';

export interface JobCode {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  description: string;
  customer_id: number;
  customer?: Customer;
  project_id: number;
  project?: Project;
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
export class JobCodeService {
  private readonly url = `${environment.apiUrl}/job-codes`;

  constructor(private readonly http: HttpClient) {}

  getAll(params: Record<string, string> = {}): Observable<PaginatedResponse<JobCode>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((k) => {
      if (params[k]) httpParams = httpParams.set(k, params[k]);
    });
    return this.http.get<PaginatedResponse<JobCode>>(this.url, { params: httpParams });
  }

  getById(id: number): Observable<{ data: JobCode }> {
    return this.http.get<{ data: JobCode }>(`${this.url}/${id}`);
  }

  create(data: Record<string, unknown>): Observable<{ data: JobCode }> {
    return this.http.post<{ data: JobCode }>(this.url, data);
  }

  update(id: number, data: Record<string, unknown>): Observable<{ data: JobCode }> {
    return this.http.put<{ data: JobCode }>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
