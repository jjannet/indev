import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Customer } from './customer.service';
import { Project } from './project.service';
import { JobCode } from './job-code.service';

export interface WorkLog {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  project_id: number;
  project?: Project;
  customer_id?: number;
  customer?: Customer;
  job_code_id?: number;
  job_code?: JobCode;
  ref_id?: string;
  description: string;
  status: string;
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

export interface WorkLogSummary {
  total_duration: number;
  project_summaries: ProjectDurationEntry[];
}

export interface ProjectDurationEntry {
  project_id: number;
  project_name: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class WorkLogService {
  private readonly url = `${environment.apiUrl}/work-logs`;

  constructor(private readonly http: HttpClient) {}

  getAll(params: Record<string, string> = {}): Observable<PaginatedResponse<WorkLog>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((k) => {
      if (params[k]) httpParams = httpParams.set(k, params[k]);
    });
    return this.http.get<PaginatedResponse<WorkLog>>(this.url, { params: httpParams });
  }

  getSummary(workPeriodId: number): Observable<{ data: WorkLogSummary }> {
    return this.http.get<{ data: WorkLogSummary }>(`${this.url}/summary`, {
      params: { work_period_id: workPeriodId.toString() },
    });
  }

  getLastProject(): Observable<{ data: { project_id: number } | null }> {
    return this.http.get<{ data: { project_id: number } | null }>(`${this.url}/last-project`);
  }

  getById(id: number): Observable<{ data: WorkLog }> {
    return this.http.get<{ data: WorkLog }>(`${this.url}/${id}`);
  }

  create(data: Record<string, unknown>): Observable<{ data: WorkLog }> {
    return this.http.post<{ data: WorkLog }>(this.url, data);
  }

  update(id: number, data: Record<string, unknown>): Observable<{ data: WorkLog }> {
    return this.http.put<{ data: WorkLog }>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
