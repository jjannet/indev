import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { WorkLog } from './work-log.service';

export interface Timesheet {
  id: number;
  work_period_id: number;
  user_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkPeriod {
  id: number;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  is_default: boolean;
  status: string;
}

export interface DailySummaryEntry {
  date: string;
  duration: number;
  logs: WorkLog[];
}

export interface ProjectDurationEntry {
  project_id: number;
  project_name: string;
  duration: number;
}

export interface JobCodeDurationEntry {
  job_code_id: number | null;
  job_code_name: string;
  duration: number;
}

export interface TimesheetSummary {
  timesheet: Timesheet;
  work_period: WorkPeriod;
  total_duration: number;
  daily_summaries: DailySummaryEntry[];
  project_summary: ProjectDurationEntry[];
  job_code_summary: JobCodeDurationEntry[];
}

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private readonly url = `${environment.apiUrl}/timesheets`;

  constructor(private readonly http: HttpClient) {}

  getByPeriod(workPeriodId: number): Observable<{ data: TimesheetSummary }> {
    return this.http.get<{ data: TimesheetSummary }>(`${this.url}/${workPeriodId}`);
  }

  updateStatus(workPeriodId: number, status: string): Observable<{ data: Timesheet }> {
    return this.http.put<{ data: Timesheet }>(`${this.url}/${workPeriodId}/status`, { status });
  }
}
