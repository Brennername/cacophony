import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService, AppTheme } from '../../../services/theme.service';
import { AuthService } from '../../../services/auth.service';
import { setFrontendHostDomain } from '../../../utils/url-normalizer';

export interface NetworkProfileConfig {
  baseUrl: string;
  isLan: boolean;
  isLoopback: boolean;
  clientIp: string;
  primaryHostDomain?: string;
  allowLocalNetwork?: boolean;
  customHostSpecified?: boolean;
  customHostDomain?: string;
  giteaPublicBase?: string;
}

/**
 * System Settings route view:
 * Theme customization, Enterprise SSO identity status, multi-device LAN ingress,
 * and hardware configuration.
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
    primaryHostDomain: 'localhost',
    allowLocalNetwork: true,
    customHostSpecified: false,
    customHostDomain: 'localhost',
    giteaPublicBase: 'http://localhost:19634',
  });

  public readonly allowLocalNetwork = signal(true);
  public readonly customHostSpecified = signal(false);
  public readonly customHostDomain = signal('localhost');
  public readonly isSaving = signal(false);
  public readonly saveSuccessMessage = signal<string | null>(null);

  public async ngOnInit(): Promise<void> {
    await this.fetchNetworkConfig();
  }

  public async fetchNetworkConfig(): Promise<void> {
    try {
      const res = await fetch('/api/config/network');
      if (res.ok) {
        const data = (await res.json()) as NetworkProfileConfig;
        this.networkInfo.set(data);
        if (typeof data.allowLocalNetwork === 'boolean') {
          this.allowLocalNetwork.set(data.allowLocalNetwork);
        }
        if (typeof data.customHostSpecified === 'boolean') {
          this.customHostSpecified.set(data.customHostSpecified);
        }
        if (typeof data.customHostDomain === 'string' && data.customHostDomain.trim()) {
          this.customHostDomain.set(data.customHostDomain);
        }
        if (data.primaryHostDomain) {
          setFrontendHostDomain(data.primaryHostDomain);
        }
      }
    } catch {
      // offline / mock fallback
    }
  }

  public toggleAllowLocalNetwork(): void {
    const nextVal = !this.allowLocalNetwork();
    this.allowLocalNetwork.set(nextVal);
  }

  public toggleCustomHostSpecified(): void {
    const nextVal = !this.customHostSpecified();
    this.customHostSpecified.set(nextVal);
    if (nextVal && (!this.customHostDomain() || !this.customHostDomain().trim())) {
      this.customHostDomain.set('localhost');
    }
  }

  public onCustomHostDomainChange(val: string): void {
    this.customHostDomain.set(val);
  }

  public async saveNetworkSettings(): Promise<void> {
    this.isSaving.set(true);
    this.saveSuccessMessage.set(null);
    try {
      const payload = {
        allowLocalNetwork: this.allowLocalNetwork(),
        customHostSpecified: this.customHostSpecified(),
        customHostDomain: this.customHostDomain().trim() || 'localhost',
      };
      const res = await fetch('/api/config/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = (await res.json()) as {
          primaryHostDomain?: string;
          normalizedTaskCount?: number;
        };
        if (result.primaryHostDomain) {
          setFrontendHostDomain(result.primaryHostDomain);
        }
        this.saveSuccessMessage.set('Network settings updated and links unified successfully.');
        await this.fetchNetworkConfig();
        setTimeout(() => {
          this.saveSuccessMessage.set(null);
        }, 4000);
      }
    } catch {
      // ignore
    } finally {
      this.isSaving.set(false);
    }
  }
}
