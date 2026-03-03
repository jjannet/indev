import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WorkPeriodConfig {
  id: number;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  is_default: boolean;
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
export class WorkPeriodConfigService {
  private readonly url = `${environment.apiUrl}/work-period-configs`;

  constructor(private readonly http: HttpClient) {}

  getAll(params: Record<string, string> = {}): Observable<PaginatedResponse<WorkPeriodConfig>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((k) => {
      if (params[k]) httpParams = httpParams.set(k, params[k]);
    });
    return this.http.get<PaginatedResponse<WorkPeriodConfig>>(this.url, { params: httpParams });
  }

  getById(id: number): Observable<{ data: WorkPeriodConfig }> {
    return this.http.get<{ data: WorkPeriodConfig }>(`${this.url}/${id}`);
  }

  getDefault(year?: number, month?: number): Observable<{ data: WorkPeriodConfig }> {
    let httpParams = new HttpParams();
    if (year) httpParams = httpParams.set('year', year.toString());
    if (month) httpParams = httpParams.set('month', month.toString());
    return this.http.get<{ data: WorkPeriodConfig }>(`${this.url}/default`, { params: httpParams });
  }

  create(data: Record<string, unknown>): Observable<{ data: WorkPeriodConfig }> {
    return this.http.post<{ data: WorkPeriodConfig }>(this.url, data);
  }

  update(id: number, data: Record<string, unknown>): Observable<{ data: WorkPeriodConfig }> {
    return this.http.put<{ data: WorkPeriodConfig }>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
