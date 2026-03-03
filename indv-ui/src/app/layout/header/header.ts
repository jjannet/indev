import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Moon, Sun, LogOut, User } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  readonly icons = { Moon, Sun, LogOut, User };

  constructor(
    readonly authService: AuthService,
    readonly themeService: ThemeService,
  ) {}

  logout(): void {
    this.authService.logout();
  }
}
