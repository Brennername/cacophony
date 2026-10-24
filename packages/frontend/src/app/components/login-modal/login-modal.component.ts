import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, DynamicAuthConfig } from '../../services/auth.service';

/**
 * Authentication dialog allowing administrative sign-in via local .env credentials
 * or external OAuth providers (Gitea and GitHub).
 */
@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.css',
})
export class LoginModalComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  public readonly isOpen = signal(false);
  public readonly activeTab = signal<'credentials' | 'oauth'>('credentials');
  public readonly username = signal('NeXeN');
  public readonly password = signal('');
  public readonly isLoading = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly authConfig = signal<DynamicAuthConfig | null>(null);

  public async open(): Promise<void> {
    this.isOpen.set(true);
    this.errorMessage.set(null);
    this.password.set('');
    try {
      const config = await this.auth.loadAuthConfig();
      this.authConfig.set(config);
    } catch {
      // Ignore config fetch error
    }
  }

  public close(): void {
    this.isOpen.set(false);
    this.password.set('');
    this.errorMessage.set(null);
    this.isLoading.set(false);
  }

  public setTab(tab: 'credentials' | 'oauth'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  public async submitPasswordLogin(): Promise<void> {
    const user = this.username().trim();
    const pass = this.password();

    if (!user || !pass) {
      this.errorMessage.set('Username and password are required.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const result = await this.auth.loginWithPassword(user, pass);
    this.isLoading.set(false);

    if (result.success) {
      this.close();
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage.set(result.error || 'Invalid administrator credentials.');
    }
  }

  public loginWithGitea(): void {
    this.auth.loginWithGitea();
  }

  public loginWithGitHub(): void {
    this.auth.loginWithGitHub();
  }
}
