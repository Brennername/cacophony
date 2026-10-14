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
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.css',
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
