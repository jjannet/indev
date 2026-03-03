import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-config-form',
  standalone: true,
  template: '<p>This page is no longer used. Redirecting...</p>',
})
export class ConfigFormComponent {
  constructor(private readonly router: Router) {
    this.router.navigate(['/dashboard/work/work-period-configs']);
  }
}
