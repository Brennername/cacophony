import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Handles incoming redirect callback from Gitea OAuth2 authorization.
 */
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cacophony-card auth-card">
      <h2>Verifying Gitea SSO Session...</h2>
      <p class="subtext">Exchanging authorization code for secure session JWT.</p>
    </div>
  `,
  styles: [`
    .auth-card {
      max-width: 450px;
      margin: 4rem auto;
      text-align: center;
      padding: 2.5rem;
    }
    .subtext {
      margin-top: 0.5rem;
      color: var(--text-secondary);
    }
  `],
})
export class AuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      // Simulate successful code token resolution
      this.auth.handleCallbackToken('mock-jwt-token', 'alice_developer', 'alice@example.com');
    }
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 400);
  }
}
