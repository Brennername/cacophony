import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Handles incoming redirect callback from OAuth2 authorization providers (Gitea and GitHub).
 */
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.css',
})
export class AuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  public readonly statusMessage = signal<string>('Exchanging authorization code...');
  public readonly errorMessage = signal<string | null>(null);

  public async ngOnInit(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const providerParam = params.get('provider');
    const error = params.get('error') || params.get('error_description');

    if (error) {
      this.errorMessage.set(`Authentication failed: ${error}`);
      return;
    }

    if (!code) {
      this.errorMessage.set('Missing authorization code from provider.');
      return;
    }

    // Determine provider: if state or param indicates github, use github; default to gitea
    const state = params.get('state') || '';
    const provider = providerParam || (state.startsWith('gh_') ? 'github' : 'gitea');

    this.statusMessage.set(`Verifying session with ${provider.toUpperCase()}...`);

    const result = await this.auth.exchangeOAuthCode(code, provider);
    if (result.success) {
      this.statusMessage.set('Authentication successful. Redirecting...');
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 350);
    } else {
      this.errorMessage.set(result.error || 'Failed to establish authenticated session.');
    }
  }

  public retryLogin(): void {
    this.router.navigate(['/dashboard']);
  }
}
