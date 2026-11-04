import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VaultViewComponent } from './vault-view.component';
import { VaultService } from '../../../services/vault.service';

describe('VaultViewComponent (T-S10.2)', () => {
  let vaultService: VaultService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VaultViewComponent],
      providers: [provideRouter([]), VaultService],
    });
    vaultService = TestBed.inject(VaultService);
  });

  it('should render VaultViewComponent with title and supported providers', () => {
    const fixture = TestBed.createComponent(VaultViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.supportedProviders.length).toBeGreaterThanOrEqual(6);
    expect(comp.formProvider()).toBe('anthropic');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.header-main h1')?.textContent).toContain('Frontier API Key Vault');
    expect(compiled.querySelector('#vault-key-form')).toBeTruthy();
  });

  it('should select provider for editing and populate formProvider signal', () => {
    const fixture = TestBed.createComponent(VaultViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectProviderForEdit('deepseek');
    expect(comp.formProvider()).toBe('deepseek');
  });

  it('should prevent submission when raw API key is empty', async () => {
    const fixture = TestBed.createComponent(VaultViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.rawKeyInput.set('   ');
    await comp.submitKey();

    expect(comp.feedbackError()).toContain('valid API key');
  });
});
