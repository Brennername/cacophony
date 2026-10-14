import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService, AppTheme } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

interface NetworkProfileConfig {
  baseUrl: string;
  isLan: boolean;
  isLoopback: boolean;
  clientIp: string;
}

/**
 * System Settings route view:
 * Theme customization, Enterprise SSO identity status, network discovery, and hardware configuration.
 */
@Component({
  selector: 'app-settings-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-view.component.html',
  styleUrl: './settings-view.component.css',
})
export class SettingsViewComponent implements OnInit {
  public readonly themeService = inject(ThemeService);
  public readonly authService = inject(AuthService);

  public readonly networkInfo = signal<NetworkProfileConfig>({
    baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    isLan: false,
    isLoopback: true,
    clientIp: '127.0.0.1',
  });

  public async ngOnInit(): Promise<void> {
    try {
      const res = await fetch('/api/config/network');
      if (res.ok) {
        const data = await res.json() as NetworkProfileConfig;
        this.networkInfo.set(data);
      }
    } catch {
      // offline / mock fallback
    }
  }
}
