import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Users, FolderOpen, Activity, TrendingUp } from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  readonly icons = { Users, FolderOpen, Activity, TrendingUp };

  readonly stats = [
    { label: 'Total Users', value: '12', icon: this.icons.Users, color: '#6366f1' },
    { label: 'Files Uploaded', value: '48', icon: this.icons.FolderOpen, color: '#10b981' },
    { label: 'Active Sessions', value: '3', icon: this.icons.Activity, color: '#f59e0b' },
    { label: 'Growth', value: '+24%', icon: this.icons.TrendingUp, color: '#ef4444' },
  ];
}
