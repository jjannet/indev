import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Save, ArrowLeft, Lock, Plus, X } from 'lucide-angular';
import { WorkLogService } from '../../../../services/work-log.service';
import { ProjectService, Project } from '../../../../services/project.service';
import { CustomerService, Customer } from '../../../../services/customer.service';
import { JobCodeService, JobCode } from '../../../../services/job-code.service';
import { QuillEditorComponent } from 'ngx-quill';

@Component({
  selector: 'app-work-log-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, QuillEditorComponent],
  templateUrl: './work-log-form.html',
  styleUrl: './work-log-form.scss',
})
export class WorkLogFormComponent implements OnInit {
  readonly icons = { Save, ArrowLeft, Lock, Plus, X };

  @ViewChild('quillEditor') quillEditor: any;

  private static readonly QUICK_CHARS_KEY = 'worklog_quick_chars';
  private static readonly DEFAULT_CHARS = ['→', '★', '✓', '✗', '●', '▶', '—', '※', '⚠', '📌', '⬜', '🏃', '✅', '❌'];
  quickChars: string[] = this.loadQuickChars();
  newChar = '';
  showAddChar = false;

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ header: [1, 2, 3, false] }],
      [{ color: [] }, { background: [] }],
      ['code-block'],
      ['link'],
      ['clean'],
    ],
  };

  isEdit = signal(false);
  isCopy = signal(false);
  loading = signal(false);
  saving = signal(false);
  readOnly = signal(false);
  readOnlyReason = signal('');
  error = signal('');
  id = 0;

  projects = signal<Project[]>([]);
  customers = signal<Customer[]>([]);
  jobCodes = signal<JobCode[]>([]);
  customerLocked = signal(false);

  form = {
    date: this.todayStr(),
    start_time: this.nowTimeStr(),
    end_time: '',
    project_id: 0,
    customer_id: 0,
    job_code_id: 0,
    ref_id: '',
    description: '',
    status: 'new',
  };

  constructor(
    private readonly workLogService: WorkLogService,
    private readonly projectService: ProjectService,
    private readonly customerService: CustomerService,
    private readonly jobCodeService: JobCodeService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.projectService.getActive().subscribe((r) => {
      this.projects.set(r.data || []);
      this.initForm();
    });
    this.customerService.getActive().subscribe((r) => this.customers.set(r.data || []));
  }

  private initForm(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const copyFrom = this.route.snapshot.queryParamMap.get('copy_from');

    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.id = +idParam;
      this.loadData();
    } else if (copyFrom) {
      this.isCopy.set(true);
      this.loadCopySource(+copyFrom);
    } else {
      this.loadLastProject();
    }
  }

  private loadLastProject(): void {
    this.workLogService.getLastProject().subscribe({
      next: (res) => {
        if (res.data?.project_id) {
          this.form.project_id = res.data.project_id;
          this.onProjectChange();
        }
      },
    });
  }

  loadData(): void {
    this.loading.set(true);
    this.workLogService.getById(this.id).subscribe({
      next: (res) => {
        const d = res.data;
        this.form = {
          date: d.date ? d.date.substring(0, 10) : this.todayStr(),
          start_time: d.start_time,
          end_time: d.end_time,
          project_id: d.project_id,
          customer_id: d.customer_id || 0,
          job_code_id: d.job_code_id || 0,
          ref_id: d.ref_id || '',
          description: d.description,
          status: d.status,
        };
        if (d.project_id) {
          this.loadCustomersForProject(d.project_id);
        }
        if (d.customer_id && d.project_id) {
          this.loadJobCodesForSelection(d.customer_id, d.project_id);
        }
        if (d.job_code_id) {
          this.customerLocked.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load work log');
        this.loading.set(false);
      },
    });
  }

  private loadCopySource(sourceId: number): void {
    this.loading.set(true);
    this.workLogService.getById(sourceId).subscribe({
      next: (res) => {
        const d = res.data;
        this.form = {
          date: this.todayStr(),
          start_time: this.nowTimeStr(),
          end_time: '',
          project_id: d.project_id,
          customer_id: d.customer_id || 0,
          job_code_id: d.job_code_id || 0,
          ref_id: d.ref_id || '',
          description: d.description,
          status: 'new',
        };
        if (d.project_id) {
          this.loadCustomersForProject(d.project_id);
        }
        if (d.customer_id && d.project_id) {
          this.loadJobCodesForSelection(d.customer_id, d.project_id);
        }
        if (d.job_code_id) {
          this.customerLocked.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load source work log');
        this.loading.set(false);
      },
    });
  }

  onProjectChange(): void {
    this.form.customer_id = 0;
    this.form.job_code_id = 0;
    this.customers.set([]);
    this.jobCodes.set([]);
    this.customerLocked.set(false);
    if (this.form.project_id) {
      this.loadCustomersForProject(this.form.project_id);
    }
  }

  private loadCustomersForProject(projectId: number): void {
    this.projectService.getById(projectId).subscribe({
      next: (res) => {
        this.customers.set(res.data.customers || []);
      },
    });
  }

  onCustomerChange(): void {
    this.form.job_code_id = 0;
    this.jobCodes.set([]);
    if (this.form.customer_id && this.form.project_id) {
      this.loadJobCodesForSelection(this.form.customer_id, this.form.project_id);
    }
  }

  private loadJobCodesForSelection(customerId: number, projectId: number): void {
    this.jobCodeService.getAll({
      customer_id: customerId.toString(),
      project_id: projectId.toString(),
      status: 'active',
      page_size: '100',
    }).subscribe({
      next: (res) => this.jobCodes.set(res.data || []),
    });
  }

  onJobCodeChange(): void {
    if (this.form.job_code_id) {
      const jc = this.jobCodes().find((j) => j.id === this.form.job_code_id);
      if (jc) {
        this.form.customer_id = jc.customer_id;
        this.customerLocked.set(true);
      }
    } else {
      this.customerLocked.set(false);
    }
  }

  get computedDuration(): string {
    if (!this.form.start_time || !this.form.end_time) return '--:--';
    const sp = this.form.start_time.split(':');
    const ep = this.form.end_time.split(':');
    if (sp.length !== 2 || ep.length !== 2) return '--:--';
    const startMin = +sp[0] * 60 + +sp[1];
    const endMin = +ep[0] * 60 + +ep[1];
    if (endMin <= startMin) return 'Invalid';
    let diff = endMin - startMin;

    // Subtract lunch break overlap (12:00-13:00)
    const lunchStart = 720; // 12:00
    const lunchEnd = 780;   // 13:00
    const overlapStart = Math.max(startMin, lunchStart);
    const overlapEnd = Math.min(endMin, lunchEnd);
    if (overlapStart < overlapEnd) {
      diff -= (overlapEnd - overlapStart);
    }

    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  get isTimeValid(): boolean {
    if (!this.form.start_time || !this.form.end_time) return true;
    const sp = this.form.start_time.split(':');
    const ep = this.form.end_time.split(':');
    if (sp.length !== 2 || ep.length !== 2) return false;
    const startMin = +sp[0] * 60 + +sp[1];
    const endMin = +ep[0] * 60 + +ep[1];
    return endMin > startMin;
  }

  get hasRequiredSelection(): boolean {
    return this.form.customer_id > 0 || this.form.job_code_id > 0;
  }

  onSubmit(): void {
    this.error.set('');
    if (!this.isTimeValid) {
      this.error.set('End time must be after start time');
      return;
    }
    if (!this.hasRequiredSelection) {
      this.error.set('At least one of Customer or Job Code is required');
      return;
    }

    this.saving.set(true);
    const payload: Record<string, unknown> = {
      date: this.form.date,
      start_time: this.form.start_time,
      end_time: this.form.end_time,
      project_id: this.form.project_id,
      ref_id: this.form.ref_id,
      description: this.form.description,
      status: this.form.status,
    };
    if (this.form.customer_id > 0) payload['customer_id'] = this.form.customer_id;
    if (this.form.job_code_id > 0) payload['job_code_id'] = this.form.job_code_id;

    const obs = this.isEdit()
      ? this.workLogService.update(this.id, payload)
      : this.workLogService.create(payload);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/work/work-logs']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save work log');
      },
    });
  }

  insertChar(char: string): void {
    const editor = this.quillEditor?.quillEditor;
    if (editor) {
      const range = editor.getSelection(true);
      editor.insertText(range.index, char, 'user');
      editor.setSelection(range.index + char.length, 0, 'user');
    } else {
      this.form.description += char;
    }
  }

  addQuickChar(): void {
    const c = this.newChar.trim();
    if (c && !this.quickChars.includes(c)) {
      this.quickChars.push(c);
      this.saveQuickChars();
    }
    this.newChar = '';
    this.showAddChar = false;
  }

  removeQuickChar(index: number): void {
    this.quickChars.splice(index, 1);
    this.saveQuickChars();
  }

  private loadQuickChars(): string[] {
    try {
      const stored = localStorage.getItem(WorkLogFormComponent.QUICK_CHARS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const missing = WorkLogFormComponent.DEFAULT_CHARS.filter((c) => !parsed.includes(c));
          if (missing.length > 0) {
            const merged = [...parsed, ...missing];
            localStorage.setItem(WorkLogFormComponent.QUICK_CHARS_KEY, JSON.stringify(merged));
            return merged;
          }
          return parsed;
        }
      }
    } catch {}
    return [...WorkLogFormComponent.DEFAULT_CHARS];
  }

  private saveQuickChars(): void {
    localStorage.setItem(WorkLogFormComponent.QUICK_CHARS_KEY, JSON.stringify(this.quickChars));
  }

  goBack(): void {
    this.router.navigate(['/dashboard/work/work-logs']);
  }

  private todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private nowTimeStr(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
