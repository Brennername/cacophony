import { describe, it, expect } from 'vitest';
import { routes } from './app.routes';

describe('AppRoutes', () => {
  it('should define all modular client routes with correct fallbacks', () => {
    expect(routes.length).toBeGreaterThanOrEqual(10);

    const paths = routes.map((r) => r.path);
    expect(paths).toContain('');
    expect(paths).toContain('dashboard');
    expect(paths).toContain('tasks/:id');
    expect(paths).toContain('queue');
    expect(paths).toContain('history');
    expect(paths).toContain('models');
    expect(paths).toContain('repomap');
    expect(paths).toContain('processes');
    expect(paths).toContain('fleet');
    expect(paths).toContain('settings');
    expect(paths).toContain('auth/callback');
    expect(paths).toContain('**');
  });

  it('should redirect root and unknown paths to dashboard', () => {
    const rootRoute = routes.find((r) => r.path === '');
    expect(rootRoute?.redirectTo).toBe('dashboard');
    expect(rootRoute?.pathMatch).toBe('full');

    const wildcardRoute = routes.find((r) => r.path === '**');
    expect(wildcardRoute?.redirectTo).toBe('dashboard');
  });
});
