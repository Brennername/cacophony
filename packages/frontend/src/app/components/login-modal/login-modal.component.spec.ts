import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginModalComponent } from './login-modal.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('LoginModalComponent', () => {
  let component: LoginModalComponent;
  let fixture: ComponentFixture<LoginModalComponent>;
  let mockAuthService: {
    loadAuthConfig: ReturnType<typeof vi.fn>;
    loginWithPassword: ReturnType<typeof vi.fn>;
    loginWithGitea: ReturnType<typeof vi.fn>;
    loginWithGitHub: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAuthService = {
      loadAuthConfig: vi.fn().mockResolvedValue({
        activeProvider: 'gitea',
        giteaPublicUrl: 'http://localhost:19634',
        clientId: 'test-client',
        redirectUri: 'http://localhost:24072/auth/callback',
      }),
      loginWithPassword: vi.fn().mockResolvedValue({ success: true }),
      loginWithGitea: vi.fn(),
      loginWithGitHub: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [LoginModalComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login modal component', () => {
    expect(component).toBeTruthy();
    expect(component.isOpen()).toBe(false);
  });

  it('should open and load dynamic auth configuration', async () => {
    await component.open();
    expect(component.isOpen()).toBe(true);
    expect(mockAuthService.loadAuthConfig).toHaveBeenCalled();
  });

  it('should close and reset modal state', () => {
    component.open();
    component.close();
    expect(component.isOpen()).toBe(false);
    expect(component.password()).toBe('');
  });

  it('should reject submission when password is empty', async () => {
    component.open();
    component.password.set('');
    await component.submitPasswordLogin();
    expect(component.errorMessage()).toBe('Username and password are required.');
    expect(mockAuthService.loginWithPassword).not.toHaveBeenCalled();
  });

  it('should authenticate successfully with valid credentials and navigate to dashboard', async () => {
    component.open();
    component.username.set('NeXeN');
    component.password.set('valid-password');

    await component.submitPasswordLogin();

    expect(mockAuthService.loginWithPassword).toHaveBeenCalledWith('NeXeN', 'valid-password');
    expect(component.isOpen()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should display error message on authentication failure', async () => {
    mockAuthService.loginWithPassword.mockResolvedValueOnce({
      success: false,
      error: 'Invalid administrator credentials.',
    });

    component.open();
    component.username.set('NeXeN');
    component.password.set('wrong-password');

    await component.submitPasswordLogin();

    expect(component.errorMessage()).toBe('Invalid administrator credentials.');
    expect(component.isOpen()).toBe(true);
  });

  it('should trigger Gitea login', () => {
    component.loginWithGitea();
    expect(mockAuthService.loginWithGitea).toHaveBeenCalled();
  });

  it('should trigger GitHub login', () => {
    component.loginWithGitHub();
    expect(mockAuthService.loginWithGitHub).toHaveBeenCalled();
  });
});
