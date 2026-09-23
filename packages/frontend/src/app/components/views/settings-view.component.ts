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
  template: `
    <div class="view-container">
      <div class="view-header">
        <h1>System & Environment Settings</h1>
        <p class="subtitle">Theme personalization, Enterprise SSO authentication, and network ingress profiles</p>
      </div>

      <div class="settings-grid">
        <!-- Theme Selection Card -->
        <div class="cacophony-card">
          <h2>Visual Appearance & Theme</h2>
          <p class="card-desc">Select high-contrast accessibility or modern dark/light color palettes</p>

          <div class="theme-options">
            <button
              class="theme-btn"
              [class.active]="themeService.currentTheme() === 'dark'"
              (click)="themeService.setTheme('dark')"
            >
              <span class="preview dark-box"></span>
              <span class="name">Dark (Obsidian)</span>
            </button>

            <button
              class="theme-btn"
              [class.active]="themeService.currentTheme() === 'light'"
              (click)="themeService.setTheme('light')"
            >
              <span class="preview light-box"></span>
              <span class="name">Light (Clean)</span>
            </button>

            <button
              class="theme-btn"
              [class.active]="themeService.currentTheme() === 'high-contrast'"
              (click)="themeService.setTheme('high-contrast')"
            >
              <span class="preview contrast-box"></span>
              <span class="name">High Contrast (AAA)</span>
            </button>
          </div>
        </div>

        <!-- Enterprise SSO Identity Card -->
        <div class="cacophony-card">
          <h2>Enterprise Identity & SSO</h2>
          <p class="card-desc">Current authentication status and upstream identity provider</p>

          <div class="auth-status-box">
            <div class="status-row">
              <span class="status-label">Active Provider:</span>
              <span class="status-val highlight">{{ authService.activeProvider() | uppercase }}</span>
            </div>

            <div class="status-row">
              <span class="status-label">Authentication State:</span>
              <span
                class="badge"
                [class.authenticated]="authService.session().isAuthenticated"
              >
                {{ authService.session().isAuthenticated ? 'Authenticated' : 'Anonymous / Guest' }}
              </span>
            </div>

            @if (authService.session().isAuthenticated) {
              <div class="status-row">
                <span class="status-label">Username:</span>
                <span class="status-val font-mono">{{ authService.session().username }}</span>
              </div>
              <div class="status-row">
                <span class="status-label">Roles:</span>
                <span class="status-val">{{ authService.session().roles?.join(', ') || 'USER' }}</span>
              </div>
            }

            <div class="auth-actions">
              @if (authService.session().isAuthenticated) {
                <button class="btn btn-outline" (click)="authService.logout()">Sign Out</button>
              } @else {
                <button class="btn btn-primary" (click)="authService.login()">
                  Sign In with {{ authService.activeProvider() | uppercase }}
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Dynamic Network Profile Card -->
        <div class="cacophony-card full-width">
          <h2>Network & Multi-Device Ingress</h2>
          <p class="card-desc">Dynamic ingress host resolution and client network profile</p>

          <div class="network-details">
            <div class="network-row">
              <span class="label">Client Base Origin:</span>
              <span class="val font-mono">{{ networkInfo().baseUrl }}</span>
            </div>
            <div class="network-row">
              <span class="label">Access Topology:</span>
              <span class="badge" [class.lan]="networkInfo().isLan">
                {{ networkInfo().isLoopback ? 'Local Loopback' : (networkInfo().isLan ? 'Wi-Fi LAN / Subnet' : 'Remote Proxy') }}
              </span>
            </div>
            <div class="network-row">
              <span class="label">Detected Client IP:</span>
              <span class="val font-mono">{{ networkInfo().clientIp }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .view-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .view-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    @media (min-width: 1024px) {
      .settings-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .full-width {
        grid-column: span 2;
      }
    }

    .card-desc {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
      margin-bottom: 1.25rem;
    }

    .theme-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .theme-btn {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      cursor: pointer;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      transition: all 0.2s ease;
      min-height: 48px;
    }

    .theme-btn:hover {
      border-color: var(--border-strong);
    }

    .theme-btn.active {
      border-color: var(--color-brand);
      box-shadow: 0 0 10px var(--color-brand-glow);
    }

    .preview {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .dark-box { background: #0a0d14; }
    .light-box { background: #f8fafc; }
    .contrast-box { background: #ffff00; }

    .auth-status-box {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .status-row, .network-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.875rem;
    }

    .status-label, .label {
      color: var(--text-secondary);
    }

    .status-val, .val {
      font-weight: 500;
      color: var(--text-primary);
    }

    .highlight {
      color: var(--color-brand);
      font-weight: 700;
    }

    .badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-full);
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .badge.authenticated, .badge.lan {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .auth-actions {
      margin-top: 1rem;
    }

    .network-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `],
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
